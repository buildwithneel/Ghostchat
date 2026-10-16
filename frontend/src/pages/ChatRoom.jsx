import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { ChevronDown, Search, X } from 'lucide-react';

import MessageBubble from '../components/MessageBubble';
import InputBar from '../components/InputBar';
import FileUploadModal from '../components/FileUploadModal';
import NameModal from '../components/NameModal';
import SmartTopBar from '../components/SmartTopBar';
import WelcomeMessage from '../components/WelcomeMessage';
import SettingsPanel from '../components/SettingsPanel';
import EmptyState from '../components/EmptyState';

import { socket } from '../utils/socket';
import { API_ROUTES } from '../utils/config';
import { soundEngine } from '../utils/sound';

export default function ChatRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [isTypingStr, setIsTypingStr] = useState('');

  const [showQr, setShowQr] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const saved = localStorage.getItem('ghostchat_theme');
    return saved !== null ? saved === 'dark' : true;
  });
  
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('ghostchat_sound');
    return saved !== null ? saved === 'true' : true;
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#a855f7', '#ec4899', '#facc15']
    });
  };

  useEffect(() => {
    if (isDarkTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ghostchat_theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  useEffect(() => {
    soundEngine.enabled = soundEnabled;
    localStorage.setItem('ghostchat_sound', soundEnabled ? 'true' : 'false');
  }, [soundEnabled]);

  const toggleTheme = () => {
    setIsDarkTheme(prev => !prev);
  };

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      soundEngine.setEnabled(next);
      return next;
    });
  };

  useEffect(() => {
    socket.emit('join_room', roomId, (response) => {
      if (response?.success) {
        setUsername(response.username);
        setIsAdmin(response.isAdmin);
        setActiveUsers(response.users || []);
        if (response.roomId !== roomId) {
          navigate(`/room/${response.roomId}`, { replace: true });
        }
      } else {
        navigate('/');
      }
    });

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
    }
  }, [roomId, navigate]);

  useEffect(() => {
    const isAtBottom = () => {
      if (!scrollContainerRef.current) return true;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      return scrollHeight - scrollTop - clientHeight < 150;
    };

    const handleReceiveMsg = (data) => {
      setMessages((prev) => [...prev, data]);
      
      const isMsgOwn = data.username === username;
      
      if (!isMsgOwn) soundEngine.playReceive();
      
      if (data.message && data.message.toLowerCase().includes('party')) {
        triggerConfetti();
      }

      setTimeout(() => {
        if (isAtBottom() || isMsgOwn) {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else {
          setUnreadCount(prev => prev + 1);
          setShowScrollBottom(true);
        }
      }, 100);
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
      alert("You have been kicked by the admin.");
      navigate('/');
    };

    const handlePin = (data) => {
      setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, pinned: !m.pinned } : m));
    };
    
    const handleReaction = (data) => {
      setMessages(prev => prev.map(m => {
        if (m.id === data.messageId) {
           const existing = m.reactions || [];
           const rIndex = existing.findIndex(r => r.emoji === data.emoji);
           if (rIndex >= 0) {
              const newR = [...existing];
              newR[rIndex].count += 1;
              return { ...m, reactions: newR };
           } else {
              return { ...m, reactions: [...existing, { emoji: data.emoji, count: 1 }] };
           }
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
    socket.on('reaction_added', handleReaction);

    return () => {
      socket.off('receive_message', handleReceiveMsg);
      socket.off('system_message', handleSystemMsg);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('user_typing', handleTyping);
      socket.off('kicked_out', handleKicked);
      socket.off('message_pinned', handlePin);
      socket.off('reaction_added', handleReaction);
    };
  }, [roomId, navigate, username, soundEnabled]);


  const sendMessage = (text, replyTo = null) => {
    socket.emit('send_message', { 
       roomId, 
       message: text, 
       username, 
       type: 'text',
       id: Date.now().toString(), // local id generation for react mapping if needed
       replyTo: replyTo 
    });
    soundEngine.playSend();
    if (text.toLowerCase().includes('party')) triggerConfetti();
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
        socket.emit('send_message', { roomId, username, type: 'file', fileData: data.file, message: 'Shared a file', id: Date.now().toString() });
        soundEngine.playSend();
      } else {
        alert(data.error);
      }
    } catch (err) {
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
     if(!isAdmin) return;
     socket.emit('pin_message', { roomId, messageId });
  };
  
  const reactToMessage = (messageId, emoji) => {
     socket.emit('react_message', { roomId, messageId, emoji });
  };

  const handleTypingActivity = (isTyping) => {
    socket.emit('typing', { roomId, username, isTyping });
  };

  const clearChat = () => {
    if (confirm('Are you sure you want to clear your local chat history?')) {
      setMessages([]);
    }
  };

  const leaveRoom = () => {
    navigate('/');
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadCount(0);
    setShowScrollBottom(false);
  };

  // Filter messages early
  const filteredMessages = messages.filter(m => 
    !searchQuery || 
    (m.message && m.message.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (m.username && m.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-full w-full max-h-[100dvh] overflow-hidden flex flex-col font-sans transition-colors duration-300 bg-slate-100 dark:bg-[#080b12]">
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         <div className="absolute top-[-10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-600/10"></div>
         <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[150px] dark:bg-purple-600/10"></div>
      </div>

      <WelcomeMessage show={showWelcome} />
      
      <SmartTopBar 
        roomId={roomId}
        activeUsersCount={activeUsers.length}
        username={username}
        isAdmin={isAdmin}
        onShowQr={() => setShowQr(true)}
        onShowSettings={() => setShowSettings(true)}
        isDarkTheme={isDarkTheme}
        toggleTheme={toggleTheme}
        soundEnabled={soundEnabled}
        toggleSound={toggleSound}
      />

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
                  <Pin className="w-3 h-3" /> Pinned
                </div>
                {messages.filter(m => m.pinned).slice(-2).map((msg, i) => (
                  <div key={`pin-${i}`} className="text-slate-200 text-sm py-1 border-b border-slate-700/30 last:border-0 truncate flex items-center gap-2">
                    <span className="text-slate-400 font-semibold">{msg.username}</span> 
                    <span className="text-slate-300 truncate">{msg.type==='text'? msg.message : '📎 File Attachment'}</span>
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
                 onKickUser={kickUser}
                 onPinMessage={pinMessage}
                 onReact={reactToMessage}
                 onReply={(m) => {}} // Could be extended to set an active reply state
              />
            )
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

      <InputBar 
        onSendMessage={sendMessage} 
        onTyping={handleTypingActivity} 
        onOpenUpload={() => setShowUploadModal(true)} 
        onSearchToggle={() => setShowSearch(!showSearch)}
      />

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        username={username}
        onEditName={() => setShowNameModal(true)}
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
        onClose={() => setShowUploadModal(false)} 
        onUpload={handleFileUpload} 
      />

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQr && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setShowQr(false)}
           >
             <motion.div 
               initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
               className="glass-panel p-8 rounded-3xl text-center shadow-2xl border border-slate-700/50" 
               onClick={e => e.stopPropagation()}
             >
               <h3 className="text-xl font-bold text-white mb-6">Scan to Join</h3>
               <div className="bg-white p-4 rounded-2xl mx-auto inline-block mb-6 shadow-[0_0_40px_rgba(99,102,241,0.4)]">
                 <QRCodeSVG value={window.location.href} size={200} />
               </div>
               <p className="text-slate-400 font-mono tracking-widest text-xl bg-slate-900/50 py-2 px-4 rounded-xl border border-slate-700/50">{roomId}</p>
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
