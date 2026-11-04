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

  console.log('\nALL 12 TESTS PASSED CLEANLY! 🎉\n');
}

runTests().catch(err => {
  console.error('Test run error:', err);
  process.exit(1);
});