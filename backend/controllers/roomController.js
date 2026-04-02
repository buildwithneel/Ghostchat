const { generateRoomId, generateUsername } = require('../utils/helpers');

// Map<roomId, { users: Map<socketId, {username, isAdmin}>, createdAt: number, lastActive: number }>
const rooms = new Map();
const ROOM_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

const createOrJoinRoom = (roomId, socketId) => {
  let isNewRoom = false;
  if (!roomId) roomId = generateRoomId();

  if (!rooms.has(roomId)) {
    isNewRoom = true;
    rooms.set(roomId, {
      users: new Map(),
      createdAt: Date.now(),
      lastActive: Date.now()
    });
  }

  const room = rooms.get(roomId);
  
  // If user already exists in this room with this socket ID, return their existing data
  if (room.users.has(socketId)) {
    const existingUser = room.users.get(socketId);
    return { roomId, username: existingUser.username, isAdmin: existingUser.isAdmin, usersCount: room.users.size };
  }

  const username = generateUsername();
  
  // First user is admin
  const isAdmin = isNewRoom || room.users.size === 0;
  
  room.users.set(socketId, { username, isAdmin });
  room.lastActive = Date.now();
  
  return { roomId, username, isAdmin, usersCount: room.users.size };
};

const leaveRoom = (roomId, socketId) => {
  if (!rooms.has(roomId)) return null;

  const room = rooms.get(roomId);
  if (room.users.has(socketId)) {
    const user = room.users.get(socketId);
    room.users.delete(socketId);
    room.lastActive = Date.now();
    
    // Auto-delete room if empty
    if (room.users.size === 0) {
      rooms.delete(roomId);
    } else if (user.isAdmin) {
      // Re-assign admin to the oldest user
      const firstUserEntry = room.users.entries().next().value;
      if (firstUserEntry) {
        firstUserEntry[1].isAdmin = true;
      }
    }

    return { 
      username: user.username, 
      usersCount: room.users.size, 
      deleted: room.users.size === 0,
      newAdminId: room.users.size > 0 ? Array.from(room.users.keys()).find(k => room.users.get(k).isAdmin) : null
    };
  }
  return null;
};

const getRoomUsers = (roomId) => {
  if (!rooms.has(roomId)) return [];
  const room = rooms.get(roomId);
  return Array.from(room.users.entries()).map(([id, data]) => ({
    id,
    username: data.username,
    isAdmin: data.isAdmin
  }));
};

const renameUser = (roomId, socketId, newName) => {
  if (!rooms.has(roomId)) return false;
  const room = rooms.get(roomId);
  if (room.users.has(socketId)) {
    room.users.get(socketId).username = newName;
    return true;
  }
  return false;
};

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

// Internal reference for cron jobs
module.exports = {
  createOrJoinRoom,
  leaveRoom,
  getRoomUsers,
  renameUser,
  kickUser,
  rooms
};
