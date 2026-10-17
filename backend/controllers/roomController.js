const bcrypt = require('bcryptjs');
const { generateRoomId, generateUsername } = require('../utils/helpers');

// Map<roomId, RoomObject>
// RoomObject: {
//   roomId: string,
//   roomName: string,
//   passwordHash: string | null,
//   users: Map<socketId, { username: string, isAdmin: boolean, joinedAt: number }>,
//   messages: Array<MessageObject>,
//   createdAt: number,
//   lastActive: number
// }
const rooms = new Map();
const MAX_MESSAGES_PER_ROOM = 500;

/**
 * Check room details without joining
 */
const checkRoom = (roomId) => {
  if (!roomId) return null;
  const normalizedId = roomId.trim().toUpperCase();
  const room = rooms.get(normalizedId);
  if (!room) return { exists: false };
  return {
    exists: true,
    roomId: room.roomId,
    roomName: room.roomName,
    requiresPassword: !!room.passwordHash,
    usersCount: room.users.size
  };
};

/**
 * Create a new room or join an existing one
 */
const createOrJoinRoom = async (roomId, socketId, options = {}) => {
  const { password, roomName, isExplicitCreate } = options;
  let isNewRoom = false;

  let targetId = roomId ? roomId.trim().toUpperCase() : '';
  if (!targetId || targetId === 'NEW') {
    targetId = generateRoomId();
  }

  // If room exists and user is explicitly trying to create a room with the same ID
  if (isExplicitCreate && rooms.has(targetId)) {
    // If it's already an active room with other users, return error
    const existing = rooms.get(targetId);
    if (existing.users.size > 0) {
      return {
        success: false,
        error: `Room code "${targetId}" is already active. Please choose another or join it.`,
        codeExists: true
      };
    }
  }

  if (!rooms.has(targetId)) {
    isNewRoom = true;
    let passwordHash = null;
    if (password && password.trim() !== '') {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    rooms.set(targetId, {
      roomId: targetId,
      roomName: roomName?.trim() || `Room ${targetId}`,
      passwordHash,
      users: new Map(),
      messages: [],
      createdAt: Date.now(),
      lastActive: Date.now()
    });
  }

  const room = rooms.get(targetId);

  // If user already exists in this room with this socket ID, return their existing data
  if (room.users.has(socketId)) {
    const existingUser = room.users.get(socketId);
    return {
      success: true,
      roomId: room.roomId,
      roomName: room.roomName,
      username: existingUser.username,
      isAdmin: existingUser.isAdmin,
      usersCount: room.users.size,
      hasPassword: !!room.passwordHash,
      users: getRoomUsers(room.roomId),
      messages: room.messages
    };
  }

  // Check password for existing protected room
  if (!isNewRoom && room.passwordHash) {
    if (!password || password.trim() === '') {
      return {
        success: false,
        requiresPassword: true,
        error: 'Password required to join this room',
        roomId: room.roomId,
        roomName: room.roomName
      };
    }

    const isMatch = await bcrypt.compare(password.trim(), room.passwordHash);
    if (!isMatch) {
      return {
        success: false,
        requiresPassword: true,
        error: 'Incorrect room password',
        roomId: room.roomId,
        roomName: room.roomName
      };
    }
  }

  const username = generateUsername();
  const isAdmin = isNewRoom || room.users.size === 0;

  room.users.set(socketId, {
    username,
    isAdmin,
    joinedAt: Date.now()
  });
  room.lastActive = Date.now();

  return {
    success: true,
    roomId: room.roomId,
    roomName: room.roomName,
    username,
    isAdmin,
    usersCount: room.users.size,
    hasPassword: !!room.passwordHash,
    users: getRoomUsers(room.roomId),
    messages: room.messages
  };
};

/**
 * Handle a user leaving a room
 */
const leaveRoom = (roomId, socketId) => {
  if (!roomId || !rooms.has(roomId)) return null;

  const room = rooms.get(roomId);
  if (room.users.has(socketId)) {
    const user = room.users.get(socketId);
    room.users.delete(socketId);
    room.lastActive = Date.now();

    let newAdminId = null;
    if (user.isAdmin && room.users.size > 0) {
      // Reassign admin to the next active user
      const firstUserEntry = room.users.entries().next().value;
      if (firstUserEntry) {
        firstUserEntry[1].isAdmin = true;
        newAdminId = firstUserEntry[0];
      }
    }

    // Note: Do NOT immediately delete room when users.size === 0 so that
    // refreshes, reloads, or temporary reconnects don't erase room messages.
    // Cleanup of inactive empty rooms is handled by cron after 2 hours.
    return {
      username: user.username,
      usersCount: room.users.size,
      deleted: false,
      newAdminId
    };
  }
  return null;
};

/**
 * Get active users in a room
 */
const getRoomUsers = (roomId) => {
  if (!rooms.has(roomId)) return [];
  const room = rooms.get(roomId);
  return Array.from(room.users.entries()).map(([id, data]) => ({
    id,
    username: data.username,
    isAdmin: data.isAdmin
  }));
};

/**
 * Rename user
 */
const renameUser = (roomId, socketId, newName) => {
  if (!rooms.has(roomId)) return false;
  const room = rooms.get(roomId);
  if (room.users.has(socketId)) {
    room.users.get(socketId).username = newName;
    room.lastActive = Date.now();
    return true;
  }
  return false;
};

/**
 * Kick user
 */
const kickUser = (roomId, adminId, targetUserId) => {
  if (!rooms.has(roomId)) return false;
  const room = rooms.get(roomId);
  const admin = room.users.get(adminId);

  if (admin && admin.isAdmin && room.users.has(targetUserId)) {
    room.users.delete(targetUserId);
    room.lastActive = Date.now();
    return true;
  }
  return false;
};

/**
 * Store message in room memory
 */
const addMessageToRoom = (roomId, messageData) => {
  if (!rooms.has(roomId)) return null;
  const room = rooms.get(roomId);
  if (room.messages.length >= MAX_MESSAGES_PER_ROOM) {
    room.messages.shift();
  }
  room.messages.push(messageData);
  room.lastActive = Date.now();
  return messageData;
};

/**
 * Add / toggle emoji reaction on a message
 */
const addMessageReaction = (roomId, messageId, emoji, username) => {
  if (!rooms.has(roomId)) return [];
  const room = rooms.get(roomId);
  const msg = room.messages.find(m => m.id === messageId);
  if (!msg) return [];

  if (!msg.reactions) {
    msg.reactions = [];
  }

  // Find previous reaction from this user on this message, if any
  const prevReaction = msg.reactions.find(r => Array.isArray(r.users) && r.users.includes(username));

  if (prevReaction && prevReaction.emoji === emoji) {
    // Clicking the same emoji toggles it off
    prevReaction.users = prevReaction.users.filter(u => u !== username);
    prevReaction.count = prevReaction.users.length;
  } else {
    // If user previously reacted with a different emoji, remove their previous reaction first
    if (prevReaction) {
      prevReaction.users = prevReaction.users.filter(u => u !== username);
      prevReaction.count = prevReaction.users.length;
    }

    // Add user's reaction to the selected emoji
    const targetReaction = msg.reactions.find(r => r.emoji === emoji);
    if (targetReaction) {
      if (!Array.isArray(targetReaction.users)) targetReaction.users = [];
      if (!targetReaction.users.includes(username)) {
        targetReaction.users.push(username);
      }
      targetReaction.count = targetReaction.users.length;
    } else {
      msg.reactions.push({
        emoji,
        count: 1,
        users: [username]
      });
    }
  }

  // Clean up any reaction objects where count is 0
  msg.reactions = msg.reactions.filter(r => r.count > 0);

  room.lastActive = Date.now();
  return msg.reactions;
};

/**
 * Toggle pin message in a room
 */
const togglePinMessage = (roomId, messageId) => {
  if (!rooms.has(roomId)) return false;
  const room = rooms.get(roomId);
  const msg = room.messages.find(m => m.id === messageId);
  if (!msg) return false;

  msg.pinned = !msg.pinned;
  room.lastActive = Date.now();
  return msg.pinned;
};

/**
 * Forward message to target room
 */
const forwardMessageToRoom = async ({ targetRoomId, message, username, targetPassword }) => {
  if (!targetRoomId) return { success: false, error: 'Target room code required' };
  const normalizedTarget = targetRoomId.trim().toUpperCase();

  if (!rooms.has(normalizedTarget)) {
    return { success: false, error: `Target room ${normalizedTarget} does not exist.` };
  }

  const targetRoom = rooms.get(normalizedTarget);

  if (targetRoom.passwordHash) {
    if (!targetPassword || targetPassword.trim() === '') {
      return { success: false, requiresPassword: true, error: 'Target room is password protected. Password required.' };
    }
    const isMatch = await bcrypt.compare(targetPassword.trim(), targetRoom.passwordHash);
    if (!isMatch) {
      return { success: false, requiresPassword: true, error: 'Incorrect target room password.' };
    }
  }

  const forwardedMsg = {
    id: Math.random().toString(36).substring(7),
    username,
    message: message.message || '',
    type: message.type || 'text',
    fileData: message.fileData || null,
    isForwarded: true,
    forwardedFrom: message.username,
    reactions: [],
    pinned: false,
    timestamp: new Date().toISOString()
  };

  addMessageToRoom(normalizedTarget, forwardedMsg);

  return {
    success: true,
    message: forwardedMsg,
    targetRoomId: normalizedTarget
  };
};

module.exports = {
  createOrJoinRoom,
  leaveRoom,
  getRoomUsers,
  renameUser,
  kickUser,
  addMessageToRoom,
  addMessageReaction,
  togglePinMessage,
  checkRoom,
  forwardMessageToRoom,
  rooms
};
