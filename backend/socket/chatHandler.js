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
  checkRoom,
  rooms
} = require('../controllers/roomController');

const MAX_MSG_LENGTH = 1000;

function initSocket(io) {
  io.on('connection', (socket) => {
    // Check Room Info
    socket.on('check_room', (roomId, callback) => {
      try {
        if (typeof roomId !== 'string' || !roomId.trim()) {
          if (typeof callback === 'function') callback(null);
          return;
        }
        const info = checkRoom(roomId);
        if (typeof callback === 'function') callback(info);
      } catch (err) {
        console.error('[Socket Error check_room]', err);
      }
    });

    // Join or Create Room
    socket.on('join_room', async (payload, callback) => {
      try {
        let roomId = '';
        let password = '';
        let roomName = '';
        let isExplicitCreate = false;

        if (typeof payload === 'string') {
          roomId = payload;
        } else if (payload && typeof payload === 'object') {
          roomId = typeof payload.roomId === 'string' ? payload.roomId : '';
          password = typeof payload.password === 'string' ? payload.password : '';
          roomName = typeof payload.roomName === 'string' ? payload.roomName : '';
          isExplicitCreate = !!payload.isExplicitCreate;
        }

        const result = await createOrJoinRoom(roomId, socket.id, { password, roomName, isExplicitCreate });

        if (!result.success) {
          if (typeof callback === 'function') callback(result);
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
        if (typeof callback === 'function') {
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
      } catch (err) {
        console.error('[Socket Error join_room]', err);
        if (typeof callback === 'function') callback({ success: false, error: 'Internal join error' });
      }
    });

    // Send Message
    socket.on('send_message', (data) => {
      try {
        if (!data || typeof data !== 'object') return;

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

        if (!roomId || typeof roomId !== 'string') return;
        if (socket.roomId !== roomId || !rooms.has(roomId) || !rooms.get(roomId).users.has(socket.id)) return;

        if (!roomId || typeof roomId !== 'string') return;
        if (typeof type !== 'string') return;
        if (type === 'text' && (!message || typeof message !== 'string' || message.trim() === '')) return;

        const cleanMessage = (type === 'text' && typeof message === 'string') ? message.substring(0, MAX_MSG_LENGTH) : '';

        const cleanReplyTo = (replyTo && typeof replyTo === 'object' && typeof replyTo.id === 'string') ? {
          id: replyTo.id,
          username: typeof replyTo.username === 'string' ? replyTo.username : 'Anonymous',
          message: typeof replyTo.message === 'string' ? replyTo.message.substring(0, 100) : ''
        } : null;

        const messageObj = {
          id: (typeof data.id === 'string' && data.id) ? data.id : Math.random().toString(36).substring(7),
          username: (typeof username === 'string' && username.trim()) ? username.trim() : (socket.username || 'Anonymous'),
          message: cleanMessage,
          type,
          fileData: (fileData && typeof fileData === 'object') ? fileData : null,
          replyTo: cleanReplyTo,
          isForwarded: !!isForwarded,
          forwardedFrom: typeof forwardedFrom === 'string' ? forwardedFrom : null,
          reactions: [],
          pinned: false,
          timestamp: new Date().toISOString()
        };

        // Persist in room
        addMessageToRoom(roomId, messageObj);

        // Broadcast to all clients in room
        io.to(roomId).emit('receive_message', messageObj);
      } catch (err) {
        console.error('[Socket Error send_message]', err);
      }
    });

    // Reaction on Message
    socket.on('react_message', (data) => {
      try {
        if (!data || typeof data !== 'object') return;
        const { roomId, messageId, emoji, username } = data;
        if (!roomId || typeof roomId !== 'string') return;
        if (!messageId || typeof messageId !== 'string') return;
        if (!emoji || typeof emoji !== 'string') return;
        if (socket.roomId !== roomId || !rooms.has(roomId) || !rooms.get(roomId).users.has(socket.id)) return;

        const user = (typeof username === 'string' && username) ? username : (socket.username || socket.id);
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
      } catch (err) {
        console.error('[Socket Error react_message]', err);
      }
    });

    // Pin Message
    socket.on('pin_message', (data) => {
      try {
        if (!data || typeof data !== 'object') return;
        const { roomId, messageId } = data;
        if (!roomId || typeof roomId !== 'string') return;
        if (!messageId || typeof messageId !== 'string') return;
        if (socket.roomId !== roomId || !rooms.has(roomId) || !rooms.get(roomId).users.has(socket.id)) return;

        const isPinned = togglePinMessage(roomId, messageId);
        io.to(roomId).emit('message_pinned', { messageId, pinned: isPinned });
      } catch (err) {
        console.error('[Socket Error pin_message]', err);
      }
    });

    // Forward Message
    socket.on('forward_message', async (data, callback) => {
      try {
        if (!data || typeof data !== 'object') {
          if (typeof callback === 'function') callback({ success: false, error: 'Invalid forward data' });
          return;
        }
        const { targetRoomId, message, username, targetPassword } = data;
        if (!targetRoomId || typeof targetRoomId !== 'string' || !message || typeof message !== 'object') {
          if (typeof callback === 'function') callback({ success: false, error: 'Invalid forward parameters' });
          return;
        }
        const forwardUser = (typeof username === 'string' && username) ? username : (socket.username || 'Anonymous');
        const cleanPassword = typeof targetPassword === 'string' ? targetPassword : '';

        const forwardResult = await forwardMessageToRoom({
          targetRoomId,
          message,
          username: forwardUser,
          targetPassword: cleanPassword
        });

        if (forwardResult.success) {
          // Broadcast to target room
          io.to(forwardResult.targetRoomId).emit('receive_message', forwardResult.message);
        }

        if (typeof callback === 'function') {
          callback(forwardResult);
        }
      } catch (err) {
        console.error('[Socket Error forward_message]', err);
        if (typeof callback === 'function') callback({ success: false, error: 'Internal forward error' });
      }
    });

    // Rename User
    socket.on('change_name', (data, callback) => {
      try {
        if (!data || typeof data !== 'object') {
          if (typeof callback === 'function') callback({ success: false });
          return;
        }
        const { roomId, newName, oldName } = data;
        if (!roomId || typeof roomId !== 'string' || !newName || typeof newName !== 'string') {
          if (typeof callback === 'function') callback({ success: false });
          return;
        }

        const success = renameUser(roomId, socket.id, newName.trim());
        if (success) {
          socket.username = newName.trim();
          io.to(roomId).emit('system_message', {
            message: `${oldName || 'User'} changed name to ${newName.trim()}`,
            users: getRoomUsers(roomId)
          });
          if (typeof callback === 'function') callback({ success: true, newName: newName.trim() });
        } else {
          if (typeof callback === 'function') callback({ success: false });
        }
      } catch (err) {
        console.error('[Socket Error change_name]', err);
        if (typeof callback === 'function') callback({ success: false });
      }
    });

    // Kick User (Admin only)
    socket.on('kick_user', (data, callback) => {
      try {
        if (!data || typeof data !== 'object') {
          if (typeof callback === 'function') callback({ success: false, error: 'Invalid request' });
          return;
        }
        const { roomId, targetId } = data;
        if (!roomId || typeof roomId !== 'string' || !targetId || typeof targetId !== 'string') {
          if (typeof callback === 'function') callback({ success: false, error: 'Invalid parameters' });
          return;
        }

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
          if (typeof callback === 'function') callback({ success: true });
        } else {
          if (typeof callback === 'function') callback({ success: false, error: 'Unauthorized' });
        }
      } catch (err) {
        console.error('[Socket Error kick_user]', err);
        if (typeof callback === 'function') callback({ success: false, error: 'Internal kick error' });
      }
    });

    // Typing Indicators
    socket.on('typing', (data) => {
      try {
        if (!data || typeof data !== 'object') return;
        const { roomId, username, isTyping } = data;
        if (!roomId || typeof roomId !== 'string') return;
        if (socket.roomId !== roomId || !rooms.has(roomId) || !rooms.get(roomId).users.has(socket.id)) return;
        socket.to(roomId).emit('user_typing', {
          username: typeof username === 'string' ? username : (socket.username || 'Anonymous'),
          isTyping: !!isTyping
        });
      } catch (err) {
        console.error('[Socket Error typing]', err);
      }
    });

    // Explicit Leave Room
    socket.on('leave_room', (data, callback) => {
      try {
        const targetRoomId = (data && typeof data === 'object' && typeof data.roomId === 'string') ? data.roomId : socket.roomId;
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
          if (typeof callback === 'function') callback({ success: true });
        }
      } catch (err) {
        console.error('[Socket Error leave_room]', err);
        if (typeof callback === 'function') callback({ success: false });
      }
    });

    // Socket Disconnect
    socket.on('disconnect', () => {
      try {
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
      } catch (err) {
        console.error('[Socket Error disconnect]', err);
      }
    });
  });
}

module.exports = { initSocket };
