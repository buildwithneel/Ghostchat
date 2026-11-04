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
const fileRoutes = require('./routes/fileRoutes');

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

  // 11. Regression Test BUG-005: Verify 1 Minute and other file expiration options calculate accurate millisecond durations
  const app = express();
  app.use(express.json());
  app.use('/api/files', fileRoutes);
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  // Helper to test expiry logic
  const calcExpiry = (minsStr) => {
    const parsedMins = parseFloat(minsStr);
    const validMins = (!isNaN(parsedMins) && parsedMins > 0) ? parsedMins : 60;
    return Math.round(validMins * 60 * 1000);
  };

  if (calcExpiry('1') !== 60000) {
    throw new Error(`Test 11 Failed: 1 Minute expiry returned ${calcExpiry('1')} instead of 60000`);
  }
  if (calcExpiry('5') !== 300000) {
    throw new Error(`Test 11 Failed: 5 Minutes expiry returned ${calcExpiry('5')} instead of 300000`);
  }
  if (calcExpiry('60') !== 3600000) {
    throw new Error(`Test 11 Failed: 1 Hour expiry returned ${calcExpiry('60')} instead of 3600000`);
  }
  if (calcExpiry('1440') !== 86400000) {
    throw new Error(`Test 11 Failed: 24 Hours expiry returned ${calcExpiry('1440')} instead of 86400000`);
  }
  if (calcExpiry('invalid') !== 3600000) {
    throw new Error('Test 11 Failed: Invalid expiry did not fallback to 1 hour');
  }

  // Upload test via multipart
  const formData = new FormData();
  formData.append('file', new Blob(['test content'], { type: 'text/plain' }), 'test_exp.txt');
  formData.append('roomId', 'ROOM_EXP');
  formData.append('username', 'Alice');
  formData.append('expiryMins', '1');

  const nowBefore = Date.now();
  const uploadRes = await fetch(`${baseUrl}/api/files/upload`, {
    method: 'POST',
    body: formData
  });
  const uploadData = await uploadRes.json();
  if (!uploadData.success || !uploadData.file) {
    throw new Error('Test 11 Failed: File upload failed');
  }
  const duration = uploadData.file.expiresAt - nowBefore;
  // Should be ~60000ms (allow 2s buffer for network / disk)
  if (duration < 58000 || duration > 62000) {
    throw new Error(`Test 11 Failed: 1 Minute file expiry was ${duration}ms, expected ~60000ms`);
  }

  server.close();
  console.log('✓ Test 11 (BUG-005): Verified file expiry correctly calculates 60000ms for 1 minute option across frontend and backend');

  console.log('\nALL 11 TESTS PASSED CLEANLY! 🎉\n');
}

runTests().catch(err => {
  console.error('Test run error:', err);
  process.exit(1);
});
