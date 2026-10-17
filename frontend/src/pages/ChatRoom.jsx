import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { ChevronDown, Search, X, Pin, Check, Copy, Share2, Lock, QrCode } from 'lucide-react';

import MessageBubble from '../components/MessageBubble';
import InputBar from '../components/InputBar';
import FileUploadModal from '../components/FileUploadModal';
import NameModal from '../components/NameModal';
import SmartTopBar from '../components/SmartTopBar';
import WelcomeMessage from '../components/WelcomeMessage';
import SettingsPanel from '../components/SettingsPanel';
import EmptyState from '../components/EmptyState';
import ForwardModal from '../components/ForwardModal';
import RoomPasswordModal from '../components/RoomPasswordModal';

import { socket } from '../utils/socket';
import { API_ROUTES } from '../utils/config';
import { soundEngine } from '../utils/sound';
import { useTheme } from '../App';

export default function ChatRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [isTypingStr, setIsTypingStr] = useState('');

  // Modals & Panels
  const [showQr, setShowQr] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWelcome] = useState(true);

  // New Room System & Action States
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [forwardNotice, setForwardNotice] = useState(null);

  // Theme & Sound — managed by App.jsx ThemeContext (single source of truth)
  const { isDarkTheme, toggleTheme, soundEnabled, toggleSound: ctxToggleSound } = useTheme();

  // Keep soundEngine in sync with context
  useEffect(() => {
    soundEngine.enabled = soundEnabled;
  }, [soundEnabled]);

  const toggleSound = () => {
    soundEngine.setEnabled(!soundEnabled);
    ctxToggleSound();
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(null);
  const [viewportOffsetTop, setViewportOffsetTop] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [qrCopied, setQrCopied] = useState(false);

  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const sentMessageIdsRef = useRef(new Set());
  const playedSoundIdsRef = useRef(new Set());
  const currentUsernameRef = useRef(username);

  useEffect(() => {
    currentUsernameRef.current = username;
  }, [username]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#a855f7', '#ec4899', '#facc15']
    });
  };

  const saveRecentRoom = useCallback((id, name, hasPwd) => {
    try {
      const saved = JSON.parse(localStorage.getItem('ghostchat_recent_rooms') || '[]');
      const filtered = saved.filter(r => r.roomId !== id);
      const updated = [
        { roomId: id, roomName: name || id, hasPassword: !!hasPwd, lastVisited: Date.now() },
        ...filtered
      ].slice(0, 10);
      localStorage.setItem('ghostchat_recent_rooms', JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Room Join Flow
  const attemptJoin = useCallback((passwordToTry = '') => {
    const passedRoomName = location.state?.roomName || '';
    const isExplicitCreate = location.state?.isExplicitCreate || false;

    socket.emit('join_room', {
      roomId,
      password: passwordToTry,
      roomName: passedRoomName,
      isExplicitCreate
    }, (response) => {
      if (response?.success) {
        setUsername(response.username);
        setIsAdmin(response.isAdmin);
        setRoomName(response.roomName || response.roomId);
        setHasPassword(!!response.hasPassword);
        setActiveUsers(response.users || []);
        if (response.messages && Array.isArray(response.messages)) {
          setMessages(response.messages);
        }
        setPasswordModalOpen(false);
        setPasswordError('');

        saveRecentRoom(response.roomId, response.roomName, response.hasPassword);

        if (response.roomId !== roomId) {
          navigate(`/room/${response.roomId}`, { replace: true, state: {} });
        }
      } else if (response?.requiresPassword) {
        if (response.roomName) setRoomName(response.roomName);
        setHasPassword(true);
        setPasswordModalOpen(true);
        if (passwordToTry) {
          setPasswordError(response.error || 'Incorrect password. Please try again.');
        }
      } else {
        alert(response?.error || 'Unable to join room.');
        navigate('/');
      }
    });
  }, [roomId, location.state, navigate, saveRecentRoom]);

  useEffect(() => {
    const initialPwd = location.state?.password || '';
    attemptJoin(initialPwd);

    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      if (isNearBottom) {
        setShowScrollBottom(false);
        setUnreadCount(0);
      } else {
        setShowScrollBottom(true);
      }
    };

    const scrollEl = scrollContainerRef.current;
    if (scrollEl) scrollEl.addEventListener('scroll', handleScroll);
    return () => {
       if (scrollEl) scrollEl.removeEventListener('scroll', handleScroll);
    };
  }, [roomId, attemptJoin, location.state]);

  // Mobile virtual keyboard & visual viewport synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleViewportChange = () => {
      if (window.visualViewport) {
        const vv = window.visualViewport;
        setViewportHeight(vv.height);
        setViewportOffsetTop(vv.offsetTop || 0);

        // Keyboard is active if visual viewport height dropped significantly below screen height
        const keyboardActive = vv.height < (window.innerHeight - 80);
        setIsKeyboardOpen(keyboardActive);

        // Keep page scroll locked at top (prevent iOS Safari unwanted window offset)
        if (window.scrollY > 0) {
          window.scrollTo(0, 0);
        }

        if (keyboardActive) {
          // Scroll immediately to the latest message so user sees context above keyboard
          requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
            }
          });
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
      handleViewportChange();
    }
    window.addEventListener('resize', handleViewportChange);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
    };
  }, []);

  const handleInputFocus = () => {
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    });
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 120);
  };

  const handleOpenUpload = (file = null) => {
    setUploadFile(file || null);
    setShowUploadModal(true);
  };

  useEffect(() => {
    const isAtBottom = () => {
      if (!scrollContainerRef.current) return true;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      return scrollHeight - scrollTop - clientHeight < 150;
    };

    const handleReceiveMsg = (data) => {
      setMessages((prev) => {
        if (data.id && prev.some(m => m.id === data.id)) return prev;
        return [...prev, data];
      });
      
      const isMsgOwn = (data.id && sentMessageIdsRef.current.has(data.id)) ||
                       (data.username && currentUsernameRef.current && data.username === currentUsernameRef.current);
      
      // Play sound only if not own message, sound is enabled, and not a duplicate sound for this message ID
      if (!isMsgOwn && soundEnabled) {
        const canPlay = !data.id || !playedSoundIdsRef.current.has(data.id);
        if (canPlay) {
          if (data.id) playedSoundIdsRef.current.add(data.id);
          soundEngine.playReceive();
        }
      }
      
      if (data.message && data.message.toLowerCase().includes('party')) {
        triggerConfetti();
      }

      setTimeout(() => {
        if (isAtBottom() || isMsgOwn) {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          } else {
            bottomRef.current?.scrollIntoView({ behavior: 'auto' });
          }
        } else {
          setUnreadCount(prev => prev + 1);
          setShowScrollBottom(true);
        }
      }, 50);
    };

    const handleSystemMsg = (data) => {
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'system', message: data.message, timestamp: new Date().toISOString() }]);
      if (data.users) setActiveUsers(data.users);
      
      setTimeout(() => {
        if (isAtBottom()) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    const handleUserJoined = (data) => handleSystemMsg(data);
    const handleUserLeft = (data) => handleSystemMsg(data);

    const handleTyping = (data) => {
      if (data.isTyping) {
        setIsTypingStr(`${data.username} is typing...`);
        if (isAtBottom()) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      } else {
        setIsTypingStr('');
      }
    };

    const handleKicked = () => {
      alert("You have been removed by the room admin.");
      navigate('/');
    };

    const handlePin = (data) => {
      setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, pinned: data.pinned !== undefined ? data.pinned : !m.pinned } : m));
    };
    
    // Real-time reaction update
    const handleReaction = (data) => {
      setMessages(prev => prev.map(m => {
        if (m.id === data.messageId) {
          return { ...m, reactions: data.reactions || [] };
        }
        return m;
      }));
    };

    socket.on('receive_message', handleReceiveMsg);
    socket.on('system_message', handleSystemMsg);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('user_typing', handleTyping);
    socket.on('kicked_out', handleKicked);
    socket.on('message_pinned', handlePin);
    socket.on('reaction_updated', handleReaction);
    socket.on('reaction_added', handleReaction);

    return () => {
      socket.off('receive_message', handleReceiveMsg);
      socket.off('system_message', handleSystemMsg);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('user_typing', handleTyping);
      socket.off('kicked_out', handleKicked);
      socket.off('message_pinned', handlePin);
      socket.off('reaction_updated', handleReaction);
      socket.off('reaction_added', handleReaction);
    };
  }, [roomId, navigate, username, soundEnabled]);

  const sendMessage = (text, replyTarget = null) => {
    const msgId = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    sentMessageIdsRef.current.add(msgId);

    socket.emit('send_message', { 
       roomId, 
       message: text, 
       username, 
       type: 'text',
       id: msgId,
       replyTo: replyTarget ? {
         id: replyTarget.id,
         username: replyTarget.username,
         message: replyTarget.type === 'file' ? '📎 File Attachment' : replyTarget.message
       } : null
    });
    soundEngine.playSend();
    if (text.toLowerCase().includes('party')) triggerConfetti();
    setReplyingTo(null);

    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    });
  };

  const handleFileUpload = async ({ file, password, expiryMins, viewOnce }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', roomId);
    formData.append('username', username);
    formData.append('expiryMins', expiryMins);
    formData.append('password', password);
    formData.append('viewOnce', viewOnce);

    try {
      const res = await fetch(API_ROUTES.upload, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setShowUploadModal(false);
        socket.emit('send_message', {
          roomId,
          username,
          type: 'file',
          fileData: data.file,
          message: 'Shared a file',
          id: Math.random().toString(36).substring(7)
        });
        soundEngine.playSend();
      } else {
        alert(data.error);
      }
    } catch {
      alert('Upload failed');
    }
  };

  const renameUser = (newName) => {
    socket.emit('change_name', { roomId, oldName: username, newName }, (res) => {
      if(res.success) {
        setUsername(res.newName);
        setShowNameModal(false);
      }
    });
  };

  const kickUser = (targetUsername) => {
    if(!isAdmin) return;
    const target = activeUsers.find(u => u.username === targetUsername);
    if(target && target.id) {
       socket.emit('kick_user', { roomId, targetId: target.id }, (res) => {
         if(!res.success) alert("Failed to kick user.");
       });
    }
  };

  const pinMessage = (messageId) => {
     socket.emit('pin_message', { roomId, messageId });
  };
  
  const reactToMessage = (messageId, emoji) => {
     socket.emit('react_message', { roomId, messageId, emoji, username });
  };

  const handleTypingActivity = (isTyping) => {
    socket.emit('typing', { roomId, username, isTyping });
  };

  const clearChat = () => {
    if (confirm('Are you sure you want to clear your local chat display?')) {
      setMessages([]);
    }
  };

  const leaveRoom = () => {
    socket.emit('leave_room', { roomId });
    navigate('/');
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadCount(0);
    setShowScrollBottom(false);
  };

  const handleForwardSuccess = (targetId) => {
    setForwardNotice(`Message forwarded to ${targetId}`);
    setTimeout(() => setForwardNotice(null), 3000);
  };

  // Filter messages
  const filteredMessages = messages.filter(m => 
    !searchQuery || 
    (m.message && m.message.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (m.username && m.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div 
      style={{ 
        height: viewportHeight ? `${viewportHeight}px` : '100%',
        maxHeight: viewportHeight ? `${viewportHeight}px` : '100dvh',
        top: viewportOffsetTop ? `${viewportOffsetTop}px` : 0
      }}
      className="w-full overflow-hidden flex flex-col font-sans bg-slate-100 dark:bg-[#080b12] fixed inset-0 md:relative"
    >
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         <div className="absolute top-[-10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-600/10"></div>
         <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[150px] dark:bg-purple-600/10"></div>
      </div>

      <WelcomeMessage show={showWelcome} />
      
      <SmartTopBar 
        roomId={roomId}
        roomName={roomName}
        hasPassword={hasPassword}
        activeUsersCount={activeUsers.length}
        username={username}
        isAdmin={isAdmin}
        onShowQr={() => setShowQr(true)}
        onShowSettings={() => setShowSettings(true)}
        onLeaveRoom={leaveRoom}
        isDarkTheme={isDarkTheme}
        toggleTheme={toggleTheme}
        soundEnabled={soundEnabled}
        toggleSound={toggleSound}
      />

      {/* Forward Success Notice Toast */}
      <AnimatePresence>
        {forwardNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md"
          >
            <Check className="w-4 h-4" />
            <span>{forwardNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Search Bar Dropdown */}
      <AnimatePresence>
        {showSearch && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-slate-900/50 backdrop-blur-md border-b border-slate-700/50 z-20"
          >
             <div className="max-w-4xl mx-auto p-4 flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-400" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search messages..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-500 text-lg"
                />
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800">
                   <X className="w-5 h-5" />
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <main ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 md:px-8 relative z-10 overscroll-contain">
        <div className="max-w-4xl mx-auto flex flex-col pt-4 min-h-full">
          
          {/* Pinned Messages Area */}
          {messages.filter(m => m.pinned).length > 0 && !searchQuery && (
             <div className="sticky top-0 z-10 w-full rounded-2xl glass-panel p-3 mb-6 border-l-4 border-l-yellow-400 shadow-xl overflow-hidden bg-slate-900/80 backdrop-blur-xl">
                <div className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Pin className="w-3 h-3" /> Pinned Messages
                </div>
                {messages.filter(m => m.pinned).slice(-3).map((msg, i) => (
                  <div key={`pin-${i}`} className="text-slate-200 text-sm py-1 border-b border-slate-700/30 last:border-0 truncate flex items-center gap-2">
                    <span className="text-slate-400 font-semibold">{msg.username}</span> 
                    <span className="text-slate-300 truncate">{msg.type==='file' ? '📎 File Attachment' : msg.message}</span>
                  </div>
                ))}
             </div>
          )}

          {filteredMessages.length === 0 && !isTypingStr && (
             searchQuery ? (
                <div className="text-center text-slate-500 mt-20">No messages match "{searchQuery}"</div>
             ) : (
                <EmptyState />
             )
          )}

          {filteredMessages.map((msg, idx) => {
            const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
            const isConsecutive = prevMsg && prevMsg.username === msg.username && prevMsg.type !== 'system' && msg.type !== 'system';
            
            return (
              <MessageBubble 
                 key={msg.id || idx} 
                 message={msg} 
                 isOwn={msg.username === username} 
                 isAdmin={isAdmin}
                 isConsecutive={isConsecutive}
                 currentUsername={username}
                 onKickUser={kickUser}
                 onPinMessage={pinMessage}
                 onReact={reactToMessage}
                 onReply={(m) => setReplyingTo(m)}
                 onForward={(m) => setForwardingMessage(m)}
              />
            );
          })}
          
          {isTypingStr && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-slate-400 text-xs ml-12 mb-4 flex items-center gap-2 font-medium">
              <div className="flex gap-1.5 py-2 px-3 bg-slate-800/50 rounded-2xl border border-slate-700/50 items-center justify-center">
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
              </div>
              {isTypingStr}
            </motion.div>
          )}
          
          <div ref={bottomRef} className="h-6" />
        </div>
      </main>

      {/* Floating Scroll to Bottom */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-24 right-4 md:right-10 z-40"
          >
            <button 
              onClick={scrollToBottom}
              className="relative p-3 bg-slate-800 border border-slate-700 rounded-full shadow-2xl hover:bg-slate-700 transition-colors group"
            >
              <ChevronDown className="w-5 h-5 text-indigo-400 mt-1" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse border-2 border-slate-900">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Input Bar */}
      <InputBar 
        onSendMessage={sendMessage} 
        onTyping={handleTypingActivity} 
        onOpenUpload={handleOpenUpload} 
        onSearchToggle={() => setShowSearch(!showSearch)}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        isKeyboardOpen={isKeyboardOpen}
        onInputFocus={handleInputFocus}
      />

      {/* Modals */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        username={username}
        onEditName={() => setShowNameModal(true)}
        onShowQr={() => setShowQr(true)}
        isDarkTheme={isDarkTheme}
        toggleTheme={toggleTheme}
        soundEnabled={soundEnabled}
        toggleSound={toggleSound}
        onClearChat={clearChat}
        onLeaveRoom={leaveRoom}
      />

      <NameModal 
        isOpen={showNameModal} 
        onClose={() => setShowNameModal(false)} 
        currentName={username} 
        onSave={renameUser} 
      />

      <FileUploadModal 
        isOpen={showUploadModal} 
        onClose={() => {
          setShowUploadModal(false);
          setUploadFile(null);
        }} 
        onUpload={handleFileUpload} 
        initialFile={uploadFile}
      />

      <ForwardModal
        isOpen={!!forwardingMessage}
        message={forwardingMessage}
        currentRoomId={roomId}
        username={username}
        onClose={() => setForwardingMessage(null)}
        onForwardSuccess={handleForwardSuccess}
      />

      <RoomPasswordModal
        isOpen={passwordModalOpen}
        roomId={roomId}
        roomName={roomName}
        error={passwordError}
        onClose={() => {
          setPasswordModalOpen(false);
          navigate('/');
        }}
        onSubmit={(pwd) => attemptJoin(pwd)}
      />

      {/* QR Code & Invite Share Modal */}
      <AnimatePresence>
        {showQr && (
           <div 
             className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" 
             onClick={() => setShowQr(false)}
           >
             <motion.div 
               initial={{ opacity: 0, scale: 0.92, y: 10 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.92, y: 10 }}
               className="w-full max-w-sm rounded-3xl p-6 sm:p-7 text-center shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 relative" 
               onClick={e => e.stopPropagation()}
             >
               {/* Close button */}
               <button
                 type="button"
                 onClick={() => setShowQr(false)}
                 className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                 title="Close"
               >
                 <X className="w-5 h-5" />
               </button>

               {/* Header */}
               <div className="flex flex-col items-center gap-1 mb-4">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1 shadow-inner">
                   <QrCode className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white">Room Invitation</h3>
                 <p className="text-xs text-slate-500 dark:text-slate-400">
                   {roomName && roomName !== `Room ${roomId}` ? roomName : `Room ${roomId}`}
                 </p>
                 {hasPassword && (
                   <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full mt-1 border border-amber-500/20">
                     <Lock className="w-3 h-3" /> Password Protected
                   </span>
                 )}
               </div>

               {/* QR Code Container */}
               <div className="bg-white p-4 sm:p-5 rounded-2xl mx-auto inline-block mb-4 shadow-md border border-slate-200 dark:border-slate-700/60">
                 <QRCodeSVG 
                   value={`${window.location.origin}/room/${roomId}`} 
                   size={180} 
                   level="M"
                 />
               </div>

               {/* Room Code Display */}
               <div className="mb-4">
                 <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">Room Code</span>
                 <p className="text-slate-800 dark:text-slate-100 font-mono tracking-widest text-lg font-bold bg-slate-100 dark:bg-slate-800/80 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
                   {roomId}
                 </p>
               </div>

               {/* Share and Copy Buttons */}
               <div className="flex flex-col gap-2.5">
                 <button
                   type="button"
                   onClick={() => {
                     const inviteUrl = `${window.location.origin}/room/${roomId}`;
                     if (navigator.clipboard && navigator.clipboard.writeText) {
                       navigator.clipboard.writeText(inviteUrl).then(() => {
                         setQrCopied(true);
                         setTimeout(() => setQrCopied(false), 2000);
                       });
                     } else {
                       setQrCopied(true);
                       setTimeout(() => setQrCopied(false), 2000);
                     }
                   }}
                   className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700/60 transition-colors flex items-center justify-center gap-2 active:scale-95"
                 >
                   {qrCopied ? (
                     <>
                       <Check className="w-4 h-4 text-emerald-500" />
                       <span className="text-emerald-500">Invite Link Copied!</span>
                     </>
                   ) : (
                     <>
                       <Copy className="w-4 h-4 text-indigo-500" />
                       <span>Copy Invite Link</span>
                     </>
                   )}
                 </button>

                 <button
                   type="button"
                   onClick={async () => {
                     const inviteUrl = `${window.location.origin}/room/${roomId}`;
                     if (navigator.share) {
                       try {
                         await navigator.share({
                           title: `Join ${roomName || roomId} on GhostChat`,
                           text: `Join ${roomName || `Room ${roomId}`} on GhostChat!${hasPassword ? ' (Password protected)' : ''}`,
                           url: inviteUrl
                         });
                       } catch (err) {
                         if (err.name !== 'AbortError') {
                           navigator.clipboard?.writeText(inviteUrl);
                           setQrCopied(true);
                           setTimeout(() => setQrCopied(false), 2000);
                         }
                       }
                     } else {
                       navigator.clipboard?.writeText(inviteUrl);
                       setQrCopied(true);
                       setTimeout(() => setQrCopied(false), 2000);
                     }
                   }}
                   className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                 >
                   <Share2 className="w-4 h-4" />
                   <span>Share Room Invitation</span>
                 </button>
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>

    </div>
  );
}
