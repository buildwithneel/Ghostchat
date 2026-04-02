const { createOrJoinRoom, leaveRoom, getRoomUsers, renameUser, kickUser } = require('../controllers/roomController');

const MAX_MSG_LENGTH = 1000;

function initSocket(io) {
  io.on('connection', (socket) => {
    // Join Room
    socket.on('join_room', (roomId, callback) => {
      const roomData = createOrJoinRoom(roomId, socket.id);
      socket.join(roomData.roomId);
      socket.roomId = roomData.roomId;

      // Notify others in the room
      socket.to(roomData.roomId).emit('user_joined', {
        message: `${roomData.username} joined the chat.`,
        usersCount: roomData.usersCount,
        users: getRoomUsers(roomData.roomId)
      });
      
      // Send success response
      if(callback) {
        callback({ 
          success: true, 
          roomId: roomData.roomId,
          username: roomData.username, 
          isAdmin: roomData.isAdmin,
          users: getRoomUsers(roomData.roomId)
        });
      }
    });

    // Handle incoming messages
    socket.on('send_message', (data) => {
      const { roomId, message, username, type = 'text', fileData = null } = data;
      
      if (!roomId) return;
      if (type === 'text' && (!message || message.trim() === '')) return;
      
      const cleanMessage = type === 'text' ? message.substring(0, MAX_MSG_LENGTH) : '';

      io.to(roomId).emit('receive_message', {
        id: Math.random().toString(36).substring(7),
        username,
        message: cleanMessage,
        type,
        fileData,
        timestamp: new Date().toISOString(),
        pinned: false
      });
    });

    socket.on('change_name', (data, callback) => {
      const { roomId, newName, oldName } = data;
      if (!roomId || !newName) return;
      
      const success = renameUser(roomId, socket.id, newName);
      if (success) {
        io.to(roomId).emit('system_message', {
          message: `${oldName} changed name to ${newName}`,
          users: getRoomUsers(roomId)
        });
        if (callback) callback({ success: true, newName });
      }
    });

    socket.on('pin_message', (data) => {
      const { roomId, messageId } = data;
      io.to(roomId).emit('message_pinned', { messageId });
    });

    socket.on('kick_user', (data, callback) => {
      const { roomId, targetId } = data;
      const success = kickUser(roomId, socket.id, targetId);
      if (success) {
        // Force the targeted socket to disconnect or leave
        const targetSocket = io.sockets.sockets.get(targetId);
        if (targetSocket) {
          targetSocket.emit('kicked_out');
          targetSocket.leave(roomId);
          targetSocket.roomId = null;
        }
        
        io.to(roomId).emit('system_message', {
          message: `A user was kicked by the admin.`,
          users: getRoomUsers(roomId)
        });
        if (callback) callback({ success: true });
      } else {
         if (callback) callback({ success: false, error: 'Unauthorized' });
      }
    });

    socket.on('typing', (data) => {
      const { roomId, username, isTyping } = data;
      socket.to(roomId).emit('user_typing', { username, isTyping });
    });

    socket.on('disconnect', () => {
      if (socket.roomId) {
        const result = leaveRoom(socket.roomId, socket.id);
        if (result && !result.deleted) {
          socket.to(socket.roomId).emit('user_left', {
            message: `${result.username} left the chat.`,
            usersCount: result.usersCount,
            users: getRoomUsers(socket.roomId)
          });
          
          if (result.newAdminId) {
             socket.to(socket.roomId).emit('system_message', {
               message: `Admin rules have been passed to a new user.`,
               users: getRoomUsers(socket.roomId)
             });
          }
        }
      }
    });
  });
}

module.exports = { initSocket };
