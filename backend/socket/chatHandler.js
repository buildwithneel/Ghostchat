const {
  createOrJoinRoom,
  leaveRoom,
  getRoomUsers,
  renameUser,
  kickUser,
  addMessageToRoom,
  addMessageReaction,
  togglePinMessage,
  forwardMessageToRoom,
  checkRoom
} = require('../controllers/roomController');

const MAX_MSG_LENGTH = 1000;

function initSocket(io) {
  io.on('connection', (socket) => {
    // Check Room Info
    socket.on('check_room', (roomId, callback) => {
      const info = checkRoom(roomId);
      if (callback) callback(info);
    });

    // Join or Create Room
    socket.on('join_room', async (payload, callback) => {
      let roomId = '';
      let password = '';
      let roomName = '';
      let isExplicitCreate = false;

      if (typeof payload === 'string') {
        roomId = payload;
      } else if (payload && typeof payload === 'object') {
        roomId = payload.roomId || '';
        password = payload.password || '';
        roomName = payload.roomName || '';
        isExplicitCreate = !!payload.isExplicitCreate;
      }

      const result = await createOrJoinRoom(roomId, socket.id, { password, roomName, isExplicitCreate });

      if (!result.success) {
        if (callback) callback(result);
        return;
      }

      // If user was previously in another room on this socket, leave it
      if (socket.roomId && socket.roomId !== result.roomId) {
        socket.leave(socket.roomId);
      }

      socket.join(result.roomId);
      socket.roomId = result.roomId;
      socket.username = result.username;

      // Broadcast to other users in room
      socket.to(result.roomId).emit('user_joined', {
        message: `${result.username} joined the chat.`,
        usersCount: result.usersCount,
        users: getRoomUsers(result.roomId)
      });

      // Send complete room info to joiner
      if (callback) {
        callback({
          success: true,
          roomId: result.roomId,
          roomName: result.roomName,
          username: result.username,
          isAdmin: result.isAdmin,
          users: result.users,
          messages: result.messages,
          hasPassword: result.hasPassword
        });
      }
    });

    // Send Message
    socket.on('send_message', (data) => {
      const {
        roomId,
        message,
        username,
        type = 'text',
        fileData = null,
        replyTo = null,
        isForwarded = false,
        forwardedFrom = null
      } = data;

      if (!roomId) return;
      if (type === 'text' && (!message || message.trim() === '')) return;

      const cleanMessage = type === 'text' ? message.substring(0, MAX_MSG_LENGTH) : '';

      const messageObj = {
        id: data.id || Math.random().toString(36).substring(7),
        username: username || socket.username || 'Anonymous',
        message: cleanMessage,
        type,
        fileData,
        replyTo: replyTo ? {
          id: replyTo.id,
          username: replyTo.username,
          message: replyTo.message ? replyTo.message.substring(0, 100) : ''
        } : null,
        isForwarded: !!isForwarded,
        forwardedFrom: forwardedFrom || null,
        reactions: [],
        pinned: false,
        timestamp: new Date().toISOString()
      };

      // Persist in room
      addMessageToRoom(roomId, messageObj);

      // Broadcast to all clients in room
      io.to(roomId).emit('receive_message', messageObj);
    });

    // Reaction on Message
    socket.on('react_message', (data) => {
      const { roomId, messageId, emoji, username } = data;
      if (!roomId || !messageId || !emoji) return;

      const user = username || socket.username || socket.id;
      const updatedReactions = addMessageReaction(roomId, messageId, emoji, user);

      io.to(roomId).emit('reaction_updated', {
        messageId,
        reactions: updatedReactions
      });

      // Legacy event for existing clients
      io.to(roomId).emit('reaction_added', {
        messageId,
        emoji,
        reactions: updatedReactions
      });
    });

    // Pin Message
    socket.on('pin_message', (data) => {
      const { roomId, messageId } = data;
      if (!roomId || !messageId) return;

      const isPinned = togglePinMessage(roomId, messageId);
      io.to(roomId).emit('message_pinned', { messageId, pinned: isPinned });
    });

    // Forward Message
    socket.on('forward_message', async (data, callback) => {
      const { fromRoomId, targetRoomId, message, username, targetPassword } = data;
      const forwardUser = username || socket.username || 'Anonymous';

      const forwardResult = await forwardMessageToRoom({
        targetRoomId,
        message,
        username: forwardUser,
        targetPassword
      });

      if (forwardResult.success) {
        // Broadcast to target room
        io.to(forwardResult.targetRoomId).emit('receive_message', forwardResult.message);
      }

      if (callback) {
        callback(forwardResult);
      }
    });

    // Rename User
    socket.on('change_name', (data, callback) => {
      const { roomId, newName, oldName } = data;
      if (!roomId || !newName) return;

      const success = renameUser(roomId, socket.id, newName.trim());
      if (success) {
        socket.username = newName.trim();
        io.to(roomId).emit('system_message', {
          message: `${oldName} changed name to ${newName.trim()}`,
          users: getRoomUsers(roomId)
        });
        if (callback) callback({ success: true, newName: newName.trim() });
      } else {
        if (callback) callback({ success: false });
      }
    });

    // Kick User (Admin only)
    socket.on('kick_user', (data, callback) => {
      const { roomId, targetId } = data;
      const success = kickUser(roomId, socket.id, targetId);
      if (success) {
        const targetSocket = io.sockets.sockets.get(targetId);
        if (targetSocket) {
          targetSocket.emit('kicked_out');
          targetSocket.leave(roomId);
          targetSocket.roomId = null;
        }

        io.to(roomId).emit('system_message', {
          message: `A user was removed by the room admin.`,
          users: getRoomUsers(roomId)
        });
        if (callback) callback({ success: true });
      } else {
        if (callback) callback({ success: false, error: 'Unauthorized' });
      }
    });

    // Typing Indicators
    socket.on('typing', (data) => {
      const { roomId, username, isTyping } = data;
      if (!roomId) return;
      socket.to(roomId).emit('user_typing', { username, isTyping });
    });

    // Explicit Leave Room
    socket.on('leave_room', (data, callback) => {
      const targetRoomId = data?.roomId || socket.roomId;
      if (targetRoomId) {
        const result = leaveRoom(targetRoomId, socket.id);
        socket.leave(targetRoomId);
        socket.roomId = null;

        if (result && !result.deleted) {
          socket.to(targetRoomId).emit('user_left', {
            message: `${result.username} left the chat.`,
            usersCount: result.usersCount,
            users: getRoomUsers(targetRoomId)
          });

          if (result.newAdminId) {
            socket.to(targetRoomId).emit('system_message', {
              message: `Admin privileges transferred to another user.`,
              users: getRoomUsers(targetRoomId)
            });
          }
        }
        if (callback) callback({ success: true });
      }
    });

    // Socket Disconnect
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
              message: `Admin privileges transferred to another user.`,
              users: getRoomUsers(socket.roomId)
            });
          }
        }
      }
    });
  });
}

module.exports = { initSocket };
