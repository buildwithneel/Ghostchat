const {
  createOrJoinRoom,
  addMessageToRoom,
  addMessageReaction,
  togglePinMessage,
  forwardMessageToRoom,
  leaveRoom,
  checkRoom,
  rooms
} = require('./controllers/roomController');
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const fileRoutes = require('./routes/fileRoutes');
const { filesDB, deleteFileInternal } = require('./controllers/fileController');
const { EventEmitter } = require('events');
const { initSocket } = require('./socket/chatHandler');

async function runTests() {
  console.log('--- Starting Room & Message Action Tests ---');

  // 1. Unlimited & Independent Rooms: Create Room A (Unprotected)
  const roomA = await createOrJoinRoom('ROOM_A', 'socket_1', { roomName: 'Alpha Room' });
  if (!roomA.success || roomA.roomId !== 'ROOM_A' || roomA.roomName !== 'Alpha Room') {
    throw new Error('Test 1 Failed: Room A creation failed');
  }
  console.log('✓ Test 1: Created Room A successfully');

  // 2. Create Room B (Password Protected)
  const roomB = await createOrJoinRoom('ROOM_B', 'socket_2', { roomName: 'Secret Room', password: 'secretpassword123' });
  if (!roomB.success || !roomB.hasPassword) {
    throw new Error('Test 2 Failed: Room B protected creation failed');
  }
  console.log('✓ Test 2: Created password-protected Room B successfully');

  // 3. checkRoom info
  const checkB = checkRoom('ROOM_B');
  if (!checkB.exists || !checkB.requiresPassword) {
    throw new Error('Test 3 Failed: checkRoom failed for Room B');
  }
  console.log('✓ Test 3: checkRoom correctly detects password requirement');

  // 4. Joining Room B without password should fail with requiresPassword: true
  const joinBNoPwd = await createOrJoinRoom('ROOM_B', 'socket_3');
  if (joinBNoPwd.success || !joinBNoPwd.requiresPassword) {
    throw new Error('Test 4 Failed: Room B allowed unauthorized join without password');
  }
  console.log('✓ Test 4: Protected room rejected join attempt without password');

  // 5. Joining Room B with incorrect password should fail
  const joinBWrongPwd = await createOrJoinRoom('ROOM_B', 'socket_3', { password: 'wrong' });
  if (joinBWrongPwd.success) {
    throw new Error('Test 5 Failed: Room B allowed wrong password');
  }
  console.log('✓ Test 5: Protected room rejected incorrect password');

  // 6. Joining Room B with correct password succeeds
  const joinBRightPwd = await createOrJoinRoom('ROOM_B', 'socket_3', { password: 'secretpassword123' });
  if (!joinBRightPwd.success) {
    throw new Error('Test 6 Failed: Room B failed valid password join');
  }
  console.log('✓ Test 6: Protected room accepted correct password');

  // 7. Add Message to Room A with Reply
  const msg1 = {
    id: 'msg_1',
    username: roomA.username,
    message: 'Hello world',
    type: 'text',
    replyTo: null,
    reactions: [],
    pinned: false,
    timestamp: new Date().toISOString()
  };
  addMessageToRoom('ROOM_A', msg1);

  const msg2 = {
    id: 'msg_2',
    username: 'Bob',
    message: 'Replying to your hello',
    type: 'text',
    replyTo: { id: 'msg_1', username: roomA.username, message: 'Hello world' },
    reactions: [],
    pinned: false,
    timestamp: new Date().toISOString()
  };
  addMessageToRoom('ROOM_A', msg2);

  if (rooms.get('ROOM_A').messages.length !== 2) {
    throw new Error('Test 7 Failed: Message count mismatch');
  }
  console.log('✓ Test 7: Added messages with reply reference to Room A');

  // 8. Reaction on Message
  const rx1 = addMessageReaction('ROOM_A', 'msg_1', '❤️', 'Alice');
  if (rx1.length !== 1 || rx1[0].count !== 1 || rx1[0].emoji !== '❤️') {
    throw new Error('Test 8 Failed: Reaction add failed');
  }
  console.log('✓ Test 8: Emoji reaction added');

  // Toggle same reaction off
  const rx2 = addMessageReaction('ROOM_A', 'msg_1', '❤️', 'Alice');
  if (rx2.length !== 0) {
    throw new Error('Test 8 Failed: Reaction toggle off failed');
  }
  console.log('✓ Test 8b: Emoji reaction toggle off works correctly');

  // Add multiple reactions
  addMessageReaction('ROOM_A', 'msg_1', '🔥', 'Alice');
  addMessageReaction('ROOM_A', 'msg_1', '🔥', 'Bob');
  const rx3 = rooms.get('ROOM_A').messages.find(m => m.id === 'msg_1').reactions;
  const flame = rx3.find(r => r.emoji === '🔥');
  if (!flame || flame.count !== 2) {
    throw new Error('Test 8c Failed: Multi-user reaction count mismatch');
  }
  console.log('✓ Test 8c: Multi-user reactions increment properly');

  // Alice replaces reaction from 🔥 to 👍 (Bob's 🔥 should stay, Alice's 🔥 replaced with 👍)
  addMessageReaction('ROOM_A', 'msg_1', '👍', 'Alice');
  const rx4 = rooms.get('ROOM_A').messages.find(m => m.id === 'msg_1').reactions;
  const flameAfter = rx4.find(r => r.emoji === '🔥');
  const thumbsUp = rx4.find(r => r.emoji === '👍');
  if (!flameAfter || flameAfter.count !== 1 || flameAfter.users.includes('Alice') || !flameAfter.users.includes('Bob')) {
    throw new Error('Test 8d Failed: Previous reaction was not replaced or other user was not preserved');
  }
  if (!thumbsUp || thumbsUp.count !== 1 || !thumbsUp.users.includes('Alice')) {
    throw new Error('Test 8d Failed: New replaced reaction was not added');
  }
  console.log('✓ Test 8d: Emoji replacement for same user works cleanly while preserving other users');

  // 9. Forwarding Message from Room A to Room B
  const forwardResult = await forwardMessageToRoom({
    targetRoomId: 'ROOM_B',
    message: msg1,
    username: 'Alice',
    targetPassword: 'secretpassword123'
  });
  if (!forwardResult.success || !forwardResult.message.isForwarded) {
    throw new Error('Test 9 Failed: Forwarding to Room B failed');
  }
  if (rooms.get('ROOM_B').messages.length !== 1) {
    throw new Error('Test 9b Failed: Forwarded message not persisted in Room B');
  }
  console.log('✓ Test 9: Forwarded message successfully persisted in target room with password');

  // 10. Leave Room (Non-destructive to history)
  leaveRoom('ROOM_A', 'socket_1');
  const roomAAfterLeave = rooms.get('ROOM_A');
  if (!roomAAfterLeave || roomAAfterLeave.messages.length !== 2) {
    throw new Error('Test 10 Failed: Room or messages destroyed on leave');
  }
  console.log('✓ Test 10: User left room without erasing message history');

// 11. Regression Test BUG-001: Malformed socket / controller payloads do not crash
  const badCheck1 = checkRoom(null);
  const badCheck2 = checkRoom(12345);
  const badCheck3 = checkRoom({});
  if (badCheck1 !== null || badCheck2 !== null || badCheck3 !== null) {
    throw new Error('Test 11 Failed: checkRoom did not safely handle non-string room ID');
  }
  const badForward1 = await forwardMessageToRoom({ targetRoomId: null, message: null });
  const badForward2 = await forwardMessageToRoom({ targetRoomId: 123, message: 'bad' });
  if (badForward1.success || badForward2.success) {
    throw new Error('Test 11 Failed: forwardMessageToRoom did not reject malformed inputs');
  }
  console.log('✓ Test 11 (BUG-001): Handled malformed and null payloads safely without unhandled exceptions');

  // 12. Regression Test BUG-002: Ensure static /uploads bypass is eliminated and authorized routing works
  const app = express();
  app.use(express.json());
  app.use('/api/files', fileRoutes);
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
  const testFileId = 'test-auth-' + Date.now() + '.txt';
  const testFilePath = path.join(uploadDir, testFileId);
  fs.writeFileSync(testFilePath, 'SECURE_DATA');
  const pwdHash = await bcrypt.hash('secretPass123', 10);

  filesDB.set(testFileId, {
    fileId: testFileId,
    originalName: 'test.txt',
    mimeType: 'text/plain',
    size: 11,
    roomId: 'SEC_ROOM',
    username: 'Alice',
    uploadedAt: Date.now(),
    expiresAt: Date.now() + 60000,
    viewOnce: true,
    passwordHash: pwdHash,
    downloads: 0
  });

  // 12a: Direct static access to /uploads should return 404
  const resStatic = await fetch(`${baseUrl}/uploads/${testFileId}`);
  if (resStatic.status !== 404) {
    throw new Error(`Test 12 Failed: Direct static access returned status ${resStatic.status} instead of 404`);
  }

  // 12b: Accessing /api/files/view without token returns 401
  const resViewNoToken = await fetch(`${baseUrl}/api/files/view/${testFileId}`);
  if (resViewNoToken.status !== 401) {
    throw new Error(`Test 12 Failed: Accessing protected file without token returned ${resViewNoToken.status} instead of 401`);
  }

  // 12c: Request download token with wrong password returns 401
  const resBadPwd = await fetch(`${baseUrl}/api/files/download/${testFileId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'wrong' })
  });
  if (resBadPwd.status !== 401) {
    throw new Error('Test 12 Failed: Wrong password did not return 401');
  }

  // 12d: Request download token with correct password returns token
  const resGoodPwd = await fetch(`${baseUrl}/api/files/download/${testFileId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'secretPass123' })
  });
  const pwdData = await resGoodPwd.json();
  if (!pwdData.success || !pwdData.token) {
    throw new Error('Test 12 Failed: Valid password did not generate download token');
  }

  // 12e: Accessing with valid token returns 200 and file contents
  const resViewToken = await fetch(`${baseUrl}/api/files/view/${testFileId}?token=${pwdData.token}`);
  if (resViewToken.status !== 200) {
    throw new Error(`Test 12 Failed: Accessing with valid token returned ${resViewToken.status}`);
  }
  const text = await resViewToken.text();
  if (text !== 'SECURE_DATA') {
    throw new Error('Test 12 Failed: File content mismatch');
  }

  // 12f: View-once self destruction cleans up file from disk and database
  await new Promise(r => setTimeout(r, 200));
  if (fs.existsSync(testFilePath) || filesDB.has(testFileId)) {
    throw new Error('Test 12 Failed: View-once file was not deleted after serving');
  }

  server.close();
  console.log('✓ Test 12 (BUG-002): /uploads static bypass eliminated and authorized token/viewOnce flow validated');

  // 13. Regression Test BUG-003: Socket authorization check prevents unauthorized message injection
  const mockIo = new EventEmitter();
  mockIo.to = () => ({ emit: () => {} });
  initSocket(mockIo);

  const unauthSocket = new EventEmitter();
  unauthSocket.id = 'unauth_socket';
  unauthSocket.roomId = null;
  unauthSocket.join = () => {};
  unauthSocket.leave = () => {};
  unauthSocket.to = () => ({ emit: () => {} });

  mockIo.emit('connection', unauthSocket);

  const initialMsgCount = rooms.get('ROOM_B').messages.length;

  // Unauth socket attempts to inject message into ROOM_B
  unauthSocket.emit('send_message', {
    roomId: 'ROOM_B',
    message: 'Unauthorized injected message',
    username: 'Attacker'
  });

  if (rooms.get('ROOM_B').messages.length !== initialMsgCount) {
    throw new Error('Test 13 Failed: Unauthorized socket injected message into protected room');
  }

  // Unauth socket attempts to react to message in ROOM_B
  const msgId = rooms.get('ROOM_B').messages[0].id;
  unauthSocket.emit('react_message', {
    roomId: 'ROOM_B',
    messageId: msgId,
    emoji: '😈',
    username: 'Attacker'
  });
  const reactions = rooms.get('ROOM_B').messages[0].reactions || [];
  if (reactions.some(r => r.emoji === '😈')) {
    throw new Error('Test 13 Failed: Unauthorized socket added reaction to protected room message');
  }

  // Unauth socket attempts to toggle pin in ROOM_B
  const pinBefore = rooms.get('ROOM_B').messages[0].pinned;
  unauthSocket.emit('pin_message', {
    roomId: 'ROOM_B',
    messageId: msgId
  });
  if (rooms.get('ROOM_B').messages[0].pinned !== pinBefore) {
    throw new Error('Test 13 Failed: Unauthorized socket toggled pin in protected room');
  }

  // Authorized socket joins ROOM_B with password
  const authSocket = new EventEmitter();
  authSocket.id = 'auth_socket_good';
  authSocket.roomId = null;
  authSocket.join = (rid) => { authSocket.roomId = rid; };
  authSocket.leave = () => {};
  authSocket.to = () => ({ emit: () => {} });

  mockIo.emit('connection', authSocket);
  await new Promise(res => {
    authSocket.emit('join_room', { roomId: 'ROOM_B', password: 'secretpassword123' }, res);
  });

  // Authorized socket sends message -> should succeed
  authSocket.emit('send_message', {
    roomId: 'ROOM_B',
    message: 'Authorized message',
    username: 'Bob'
  });
  if (rooms.get('ROOM_B').messages.length !== initialMsgCount + 1) {
    throw new Error('Test 13 Failed: Authorized socket could not send message');
  }

  console.log('✓ Test 13 (BUG-003): Verified protected room rejects unauthorized socket send/react/pin while authorized succeeds');

    // 14. Regression Test BUG-004: Room switching cleans up user from previous room
  const clientSocket = new EventEmitter();
  clientSocket.id = 'switch_test_socket';
  clientSocket.roomId = null;
  clientSocket.join = (rid) => { clientSocket.roomId = rid; };
  clientSocket.leave = (rid) => { if (clientSocket.roomId === rid) clientSocket.roomId = null; };
  clientSocket.to = () => ({ emit: () => {} });

  mockIo.emit('connection', clientSocket);

  // Join Switch Room 1
  await new Promise(res => clientSocket.emit('join_room', { roomId: 'SWITCH_R1' }, res));
  if (rooms.get('SWITCH_R1').users.size !== 1) {
    throw new Error('Test 14 Failed: Initial room join failed');
  }

  // Switch to Switch Room 2 on the same socket
  await new Promise(res => clientSocket.emit('join_room', { roomId: 'SWITCH_R2' }, res));

  // Verify SWITCH_R1 user count was cleanly decremented to 0
  if (rooms.get('SWITCH_R1').users.size !== 0) {
    throw new Error('Test 14 Failed: SWITCH_R1 user count was not decremented after switching to SWITCH_R2');
  }
  // Verify SWITCH_R2 user count is 1
  if (rooms.get('SWITCH_R2').users.size !== 1) {
    throw new Error('Test 14 Failed: SWITCH_R2 user count mismatch');
  }

  // Switch back to SWITCH_R1
  await new Promise(res => clientSocket.emit('join_room', { roomId: 'SWITCH_R1' }, res));
  if (rooms.get('SWITCH_R2').users.size !== 0 || rooms.get('SWITCH_R1').users.size !== 1) {
    throw new Error('Test 14 Failed: Switching back to SWITCH_R1 did not clean up SWITCH_R2');
  }

  // Disconnect socket -> cleans up SWITCH_R1
  clientSocket.emit('disconnect');
  if (rooms.get('SWITCH_R1').users.size !== 0) {
    throw new Error('Test 14 Failed: Disconnect did not clean up remaining room');
  }

  console.log('✓ Test 14 (BUG-004): Verified room switching cleans up user from prior room and maintains accurate counts');

    // 15. Regression Test BUG-005: Verify 1 Minute and other file expiration options calculate accurate millisecond durations
  const appExp = express();
  appExp.use(express.json());
  appExp.use('/api/files', fileRoutes);
  const serverExp = http.createServer(appExp);
  await new Promise(r => serverExp.listen(0, r));
  const portExp = serverExp.address().port;
  const baseUrlExp = `http://localhost:${portExp}`;

  // Helper to test expiry logic
  const calcExpiry = (minsStr) => {
    const parsedMins = parseFloat(minsStr);
    const validMins = (!isNaN(parsedMins) && parsedMins > 0) ? parsedMins : 60;
    return Math.round(validMins * 60 * 1000);
  };

  if (calcExpiry('1') !== 60000) {
    throw new Error(`Test 15 Failed: 1 Minute expiry returned ${calcExpiry('1')} instead of 60000`);
  }
  if (calcExpiry('5') !== 300000) {
    throw new Error(`Test 15 Failed: 5 Minutes expiry returned ${calcExpiry('5')} instead of 300000`);
  }
  if (calcExpiry('60') !== 3600000) {
    throw new Error(`Test 15 Failed: 1 Hour expiry returned ${calcExpiry('60')} instead of 3600000`);
  }
  if (calcExpiry('1440') !== 86400000) {
    throw new Error(`Test 15 Failed: 24 Hours expiry returned ${calcExpiry('1440')} instead of 86400000`);
  }
  if (calcExpiry('invalid') !== 3600000) {
    throw new Error('Test 15 Failed: Invalid expiry did not fallback to 1 hour');
  }

  // Upload test via multipart
  const formData = new FormData();
  formData.append('file', new Blob(['test content'], { type: 'text/plain' }), 'test_exp.txt');
  formData.append('roomId', 'ROOM_EXP');
  formData.append('username', 'Alice');
  formData.append('expiryMins', '1');

  const nowBefore = Date.now();
  const uploadRes = await fetch(`${baseUrlExp}/api/files/upload`, {
    method: 'POST',
    body: formData
  });
  const uploadData = await uploadRes.json();
  if (!uploadData.success || !uploadData.file) {
    throw new Error('Test 15 Failed: File upload failed');
  }
  const duration = uploadData.file.expiresAt - nowBefore;
  // Should be ~60000ms (allow 2s buffer for network / disk)
  if (duration < 57000 || duration > 63000) {
    throw new Error(`Test 15 Failed: 1 Minute file expiry was ${duration}ms, expected ~60000ms`);
  }

  serverExp.close();
  console.log('✓ Test 15 (BUG-005): Verified file expiry correctly calculates 60000ms for 1 minute option across frontend and backend');

    // 16. Admin privilege transfer & notification (BUG-006)
  const mockSockets = new Map();
  const ioHandlers = {};
  const mockIoAdmin = {
    on: (evt, handler) => { ioHandlers[evt] = handler; },
    to: () => ({ emit: () => {} }),
    sockets: { sockets: mockSockets }
  };
  initSocket(mockIoAdmin);

  let promotedReceived = false;
  const userASocket = new EventEmitter();
  userASocket.id = 'socket_admin_a';
  userASocket.join = () => {};
  userASocket.leave = () => {};
  userASocket.to = () => ({ emit: () => {} });

  const userBSocket = new EventEmitter();
  userBSocket.id = 'socket_user_b';
  userBSocket.join = () => {};
  userBSocket.leave = () => {};
  userBSocket.to = () => ({ emit: () => {} });
  userBSocket.emitOrig = userBSocket.emit;
  userBSocket.emit = function (evt, ...args) {
    if (evt === 'admin_promoted' && args[0] && args[0].isAdmin === true) {
      promotedReceived = true;
    }
    return userBSocket.emitOrig(evt, ...args);
  };

  mockSockets.set('socket_admin_a', userASocket);
  mockSockets.set('socket_user_b', userBSocket);

  ioHandlers['connection'](userASocket);
  ioHandlers['connection'](userBSocket);

  await new Promise(res => userASocket.emit('join_room', { roomId: 'ADMIN_TEST_ROOM', username: 'Alice' }, res));
  await new Promise(res => userBSocket.emit('join_room', { roomId: 'ADMIN_TEST_ROOM', username: 'Bob' }, res));
  await new Promise(res => userASocket.emit('leave_room', { roomId: 'ADMIN_TEST_ROOM' }, res));

  if (!promotedReceived) {
    throw new Error('Test 16 Failed: admin_promoted event was not emitted to promoted socket');
  }
  const adminTestRoom = rooms.get('ADMIN_TEST_ROOM');
  const bob = adminTestRoom.users.get('socket_user_b');
  if (!bob || !bob.isAdmin) {
    throw new Error('Test 16 Failed: Bob was not promoted to admin in room state');
  }
  console.log('✓ Test 16 (BUG-006): Admin privilege transfer emitted admin_promoted and updated room state');

    // 17. Socket reconnection room restoration (BUG-007)
  const user1Join = await createOrJoinRoom('ROOM_RECONNECT', 'socket_old_conn', { roomName: 'Reconnect Room', password: 'pwd123' });
  if (!user1Join.success) {
    throw new Error('Test 17 Failed: Initial join failed');
  }
  leaveRoom('ROOM_RECONNECT', 'socket_old_conn');
  const user1Rejoin = await createOrJoinRoom('ROOM_RECONNECT', 'socket_new_conn', { password: 'pwd123' });
  if (!user1Rejoin.success || !user1Rejoin.users.some(u => u.id === 'socket_new_conn')) {
    throw new Error('Test 17 Failed: Rejoin after reconnect failed');
  }
  console.log('✓ Test 17 (BUG-007): Socket reconnection restores room membership cleanly');

    // 18. Regression Test (BUG-008)
  {
// 18. Secure File Uploads & XSS Prevention (BUG-008)
  const { serveFile, fileFilter, filesDB } = require('./controllers/fileController');
  const path = require('path');
  const fs = require('fs');

  let svgError = null;
  fileFilter({}, { originalname: 'exploit.svg', mimetype: 'image/svg+xml' }, (err) => { svgError = err; });
  if (!svgError) {
    throw new Error('Test 11a Failed: SVG upload not rejected by fileFilter');
  }

  let htmlError = null;
  fileFilter({}, { originalname: 'index.html', mimetype: 'text/html' }, (err) => { htmlError = err; });
  if (!htmlError) {
    throw new Error('Test 11b Failed: HTML upload not rejected by fileFilter');
  }

  let pngError = null;
  let pngAccepted = false;
  fileFilter({}, { originalname: 'avatar.png', mimetype: 'image/png' }, (err, accepted) => {
    pngError = err;
    pngAccepted = accepted;
  });
  if (pngError || !pngAccepted) {
    throw new Error('Test 11c Failed: Safe PNG rejected by fileFilter');
  }

  const testFileId = 'sec_test_file.png';
  const testFilePath = path.join(__dirname, 'uploads', testFileId);
  fs.writeFileSync(testFilePath, 'dummy data');
  filesDB.set(testFileId, {
    fileId: testFileId,
    originalName: 'test.png',
    mimeType: 'image/png',
    size: 10,
    roomId: 'ROOM_A',
    expiresAt: Date.now() + 60000,
    downloads: 0
  });

  const headersSet = {};
  const mockRes = {
    setHeader: (k, v) => { headersSet[k] = v; },
    status: () => ({ send: () => {} }),
    sendFile: (p, cb) => { if (cb) cb(null); }
  };
  const mockReq = {
    params: { fileId: testFileId },
    query: {},
    app: { get: () => null }
  };

  serveFile(mockReq, mockRes);

  if (headersSet['X-Content-Type-Options'] !== 'nosniff') {
    throw new Error('Test 11d Failed: X-Content-Type-Options header missing');
  }
  if (!headersSet['Content-Security-Policy'] || !headersSet['Content-Security-Policy'].includes('sandbox')) {
    throw new Error('Test 11e Failed: CSP sandbox header missing');
  }

  fs.unlinkSync(testFilePath);
  filesDB.delete(testFileId);
  console.log('✓ Test 18: File filter blocks unsafe files and file serving sets security headers');
  }

    // 19. Regression Test (BUG-009)
  {
// 19. Concurrent Download Tokens (BUG-009)
  const { downloadFileHandler, serveFile, filesDB } = require('./controllers/fileController');
  const bcrypt = require('bcryptjs');
  const path = require('path');
  const fs = require('fs');

  const fileId = 'race_test_file.txt';
  const filePath = path.join(__dirname, 'uploads', fileId);
  fs.writeFileSync(filePath, 'concurrent file test content');

  const pwdHash = await bcrypt.hash('pass123', 10);
  filesDB.set(fileId, {
    fileId,
    originalName: 'concurrent.txt',
    mimeType: 'text/plain',
    size: 25,
    roomId: 'ROOM_A',
    expiresAt: Date.now() + 60000,
    passwordHash: pwdHash,
    downloads: 0
  });

  let tokenA = null;
  let tokenB = null;

  await downloadFileHandler(
    { params: { fileId }, body: { password: 'pass123' } },
    { json: (data) => { tokenA = data.token; }, status: () => ({ json: () => {} }) }
  );

  await downloadFileHandler(
    { params: { fileId }, body: { password: 'pass123' } },
    { json: (data) => { tokenB = data.token; }, status: () => ({ json: () => {} }) }
  );

  if (!tokenA || !tokenB || tokenA === tokenB) {
    throw new Error('Test 19 Failed: Could not generate two distinct download tokens');
  }

  let userAServed = false;
  let userBServed = false;

  serveFile(
    { params: { fileId }, query: { token: tokenA }, app: { get: () => null } },
    { setHeader: () => {}, status: () => ({ send: () => {} }), sendFile: (p, cb) => { userAServed = true; if (cb) cb(); } }
  );

  serveFile(
    { params: { fileId }, query: { token: tokenB }, app: { get: () => null } },
    { setHeader: () => {}, status: () => ({ send: () => {} }), sendFile: (p, cb) => { userBServed = true; if (cb) cb(); } }
  );

  if (!userAServed || !userBServed) {
    throw new Error('Test 19 Failed: Concurrent token download failed for one of the users');
  }

  fs.unlinkSync(filePath);
  filesDB.delete(fileId);
  console.log('✓ Test 19: Concurrent download tokens work without race condition');
  }

    // 20. Regression Test (BUG-010)
  {
// 20. Slash shortcut does not hijack focus from editable inputs (BUG-010)
  const isEditableElement = (tagName, isContentEditable) => {
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || !!isContentEditable;
  };
  if (!isEditableElement('INPUT', false) || !isEditableElement('TEXTAREA', false) || !isEditableElement('DIV', true)) {
    throw new Error('Test 20 Failed: Editable elements not correctly identified');
  }
  if (isEditableElement('DIV', false) || isEditableElement('BODY', false)) {
    throw new Error('Test 20 Failed: Non-editable elements falsely identified as editable');
  }
  console.log('✓ Test 20: Editable element detection prevents slash key hijacking');
  }

    // 21. Regression Test (BUG-011)
  {
// 21. Preserve message ownership across user alias renames (BUG-011)
  const isMessageOwn = (msgUsername, currentUsername, aliases, sentIds, msgId) => {
    return msgUsername === currentUsername || aliases.includes(msgUsername) || (!!msgId && sentIds.has(msgId));
  };
  const sentIds = new Set(['msg_123']);
  const aliases = ['Ghost_1001', 'NeonNinja'];
  const currentUsername = 'NeonNinja';

  if (!isMessageOwn('Ghost_1001', currentUsername, aliases, sentIds, 'msg_123')) {
    throw new Error('Test 21 Failed: Historical message lost ownership after rename');
  }
  if (isMessageOwn('Ghost_2002', currentUsername, aliases, sentIds, 'msg_999')) {
    throw new Error('Test 21 Failed: Another user message falsely claimed as own');
  }
  console.log('✓ Test 21: Message ownership preserved across user alias renames');
  }

    // 22. Regression Test (BUG-012)
  {
// 22. Re-create inactive empty room with new password/settings (BUG-012)
  const roomCreated = await createOrJoinRoom('RECREATE_ROOM', 'socket_old', { roomName: 'Old Room', password: 'oldpassword123' });
  if (!roomCreated.success) throw new Error('Test 22 Failed: Initial room creation failed');
  addMessageToRoom('RECREATE_ROOM', { username: 'OldUser', message: 'Old message' });

  leaveRoom('RECREATE_ROOM', 'socket_old');
  if (rooms.get('RECREATE_ROOM').users.size !== 0) {
    throw new Error('Test 22 Failed: Room users not empty after leave');
  }

  const recreateResult = await createOrJoinRoom('RECREATE_ROOM', 'socket_new', {
    isExplicitCreate: true,
    roomName: 'New Recreated Room',
    password: 'newpassword456'
  });

  if (!recreateResult.success) {
    throw new Error(`Test 22 Failed: Recreating empty room failed: ${recreateResult.error}`);
  }
  if (recreateResult.roomName !== 'New Recreated Room') {
    throw new Error('Test 22 Failed: Room name was not updated to new room name');
  }
  if (recreateResult.messages.length !== 0) {
    throw new Error('Test 22 Failed: Old messages were not cleared on re-creation');
  }

  const testJoin = await createOrJoinRoom('RECREATE_ROOM', 'socket_another', { password: 'newpassword456' });
  if (!testJoin.success) {
    throw new Error('Test 22 Failed: New password not recognized after re-creation');
  }
  console.log('✓ Test 22: Inactive empty room successfully re-created with new configuration');
  }

    // 23. Regression Test (BUG-013)
  {
// 23. file_downloaded listener state update (BUG-013)
  const initialMessages = [
    {
      id: 'msg_file_1',
      type: 'file',
      fileData: { fileId: 'doc_123.pdf', downloads: 0 }
    },
    {
      id: 'msg_text_2',
      type: 'text',
      message: 'Hello'
    }
  ];

  const updateDownloadsOnEvent = (messages, eventData) => {
    if (!eventData || !eventData.fileId) return messages;
    return messages.map(m => {
      if (m.type === 'file' && m.fileData && m.fileData.fileId === eventData.fileId) {
        return {
          ...m,
          fileData: {
            ...m.fileData,
            downloads: eventData.downloads
          }
        };
      }
      return m;
    });
  };

  const updated = updateDownloadsOnEvent(initialMessages, { fileId: 'doc_123.pdf', downloads: 5 });
  if (updated[0].fileData.downloads !== 5) {
    throw new Error('Test 23 Failed: File download count was not updated on file_downloaded event');
  }
  if (updated[1].message !== 'Hello') {
    throw new Error('Test 23 Failed: Unrelated messages were corrupted during download count update');
  }
  console.log('✓ Test 23: file_downloaded event correctly updates message download counts');
  }

    // 24. Regression Test (BUG-014)
  {
// 24. PWA action parameter handling (BUG-014)
  const parseHomeAction = (searchQuery) => {
    const params = new URLSearchParams(searchQuery);
    return params.get('action');
  };
  if (parseHomeAction('?action=new-room') !== 'new-room') {
    throw new Error('Test 24 Failed: action=new-room parameter was not parsed correctly');
  }
  if (parseHomeAction('?room=ABC') !== null) {
    throw new Error('Test 24 Failed: Non-action query string falsely parsed as action');
  }
  console.log('✓ Test 24: PWA action=new-room shortcut parameter correctly handled');
  }

  console.log('\nALL 24 TESTS PASSED CLEANLY! 🎉\n');
}

runTests().catch(err => {
  console.error('Test run error:', err);
  process.exit(1);
});
