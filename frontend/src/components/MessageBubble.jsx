import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, File, Lock, Clock, EyeOff, Pin, Forward, MoreHorizontal, Plus } from 'lucide-react';
import MessageActionMenu from './MessageActionMenu';
import { getUserColor, getInitials } from '../utils/colors';
import { API_ROUTES } from '../utils/config';

export default function MessageBubble({ 
  message, 
  isOwn, 
  isAdmin, 
  isConsecutive,
  currentUsername,
  onPinMessage, 
  onKickUser,
  onReact,
  onReply,
  onForward
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const showMenu = isMenuOpen || isHovered;
  const touchTimerRef = useRef(null);
  const bubbleRef = useRef(null);

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsHovered(false);
  };

  const handleCopy = async () => {
    closeMenu();
    const textToCopy = message.type === 'file'
      ? (message.fileData?.originalName || message.message || '')
      : (message.message || '');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const scrollToReplyTarget = (e) => {
    e.stopPropagation();
    if (!message.replyTo?.id) return;
    const target = document.getElementById(`msg-${message.replyTo.id}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('ring-2', 'ring-indigo-500/80', 'rounded-2xl', 'transition-all');
      setTimeout(() => {
        target.classList.remove('ring-2', 'ring-indigo-500/80', 'rounded-2xl');
      }, 1500);
    }
  };

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    if (showMenu) {
      document.addEventListener('click', handleGlobalClick);
    }
    return () => {
      document.removeEventListener('click', handleGlobalClick);
      clearTimeout(touchTimerRef.current);
    };
  }, [showMenu]);

  // Touch handlers for mobile long-press
  const handleTouchStart = () => {
    touchTimerRef.current = setTimeout(() => {
      setIsMenuOpen(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 450);
  };

  const handleTouchEnd = () => {
    clearTimeout(touchTimerRef.current);
  };

  if (message.type === 'system') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-6"
      >
        <div className="bg-slate-800/40 text-slate-400 text-xs px-4 py-1.5 rounded-full border border-slate-700/30 backdrop-blur-md">
          {message.message}
        </div>
      </motion.div>
    );
  }

  const isFile = message.type === 'file' && message.fileData;
  const timeStr = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const userColor = getUserColor(message.username);

  return (
    <motion.div 
      ref={bubbleRef}
      id={`msg-${message.id}`}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      layout
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`flex mb-2 max-w-[85%] relative group ${isOwn ? 'ml-auto justify-end' : 'mr-auto justify-start'} ${!isConsecutive ? 'mt-4' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {!isOwn && (
        <div className={`w-8 h-8 flex-shrink-0 mr-2 ${isConsecutive ? 'opacity-0' : 'opacity-100'}`}>
          {!isConsecutive && (
            <div 
              className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: userColor }}
            >
              {getInitials(message.username)}
            </div>
          )}
        </div>
      )}

      <div className={`flex flex-col relative max-w-full ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Username & Time Header (Only show if not consecutive) */}
        {!isConsecutive && (
          <div className={`flex items-baseline gap-2 mb-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <span className="text-sm font-semibold" style={{ color: isOwn ? '#fff' : userColor }}>
              {isOwn ? 'You' : message.username}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">{timeStr}</span>
            {message.pinned && <Pin className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
          </div>
        )}

        {/* Action Menu (Visible on hover or long-press / click) */}
        <AnimatePresence>
          {showMenu && (
             <MessageActionMenu
                onReply={() => {
                  closeMenu();
                  onReply(message);
                }}
                onForward={() => {
                  closeMenu();
                  if (onForward) onForward(message);
                }}
                onCopy={handleCopy}
                onPin={() => {
                  closeMenu();
                  onPinMessage(message.id);
                }}
                onReact={(emoji) => {
                  closeMenu();
                  onReact(message.id, emoji);
                }}
                isOwn={isOwn}
                isAdmin={isAdmin}
             />
          )}
        </AnimatePresence>

        {/* The Bubble */}
        <motion.div 
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(prev => !prev);
          }}
          whileHover={{ scale: 1.005, y: -0.5 }}
          className={`relative px-4 py-2.5 rounded-2xl break-words whitespace-pre-wrap shadow-md max-w-full z-0 transition-shadow cursor-pointer ${
          isOwn 
            ? 'msg-glass-own text-white' 
            : 'msg-glass text-slate-200'
          } ${
            isOwn 
              ? (isConsecutive ? 'rounded-tr-sm rounded-br-sm' : 'rounded-br-sm rounded-tr-2xl') 
              : (isConsecutive ? 'rounded-tl-sm rounded-bl-sm' : 'rounded-bl-sm rounded-tl-2xl')
          }`}
        >
          {isAdmin && !isOwn && showMenu && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onKickUser(message.username);
              }}
              className="absolute -top-6 left-0 text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded opacity-100 transition-opacity backdrop-blur-sm border border-red-500/30 font-semibold"
            >
              Kick User
            </button>
          )}

          {/* Forwarded Header Indicator */}
          {message.isForwarded && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300 dark:text-slate-400 mb-1.5 pb-1 border-b border-white/10 opacity-90">
              <Forward className="w-3.5 h-3.5 text-indigo-400" />
              <span>Forwarded {message.forwardedFrom ? `from ${message.forwardedFrom}` : ''}</span>
            </div>
          )}

          {/* Reply Context / Thread Reference */}
          {message.replyTo && (
            <div 
              onClick={scrollToReplyTarget}
              title="Click to view replied message"
              className="text-xs bg-black/25 text-slate-300 p-2.5 rounded-xl mb-2.5 border-l-4 border-indigo-400 backdrop-blur-sm truncate max-w-[280px] hover:bg-black/35 transition-colors cursor-pointer"
            >
              <span className="font-bold text-indigo-300 block mb-0.5">
                {message.replyTo.username}
              </span>
              <span className="line-clamp-2 text-slate-300 opacity-90">
                {message.replyTo.message}
              </span>
            </div>
          )}

          {isFile ? (
             <FilePreview fileData={message.fileData} />
          ) : (
            <p className="leading-relaxed text-[15px] select-text">{message.message}</p>
          )}

          {/* Mobile more button indicator */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(prev => !prev);
            }}
            className="sm:hidden absolute top-1 right-1 p-1 text-white/40 hover:text-white"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Hover Timestamp if consecutive */}
          {isConsecutive && showMenu && (
             <motion.span 
               initial={{ opacity: 0, x: isOwn ? 10 : -10 }}
               animate={{ opacity: 1, x: 0 }}
               className={`absolute top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-medium ${isOwn ? '-left-12' : '-right-12'}`}
             >
               {timeStr}
             </motion.span>
          )}

        </motion.div>

        {/* Reactions Render */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-1.5 z-10 relative">
             {message.reactions.map((r, i) => {
                const hasUserReacted = Array.isArray(r.users) && currentUsername && r.users.includes(currentUsername);
                return (
                  <motion.button 
                    key={`${r.emoji}-${i}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReact(message.id, r.emoji);
                    }}
                    whileTap={{ scale: 0.9 }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`backdrop-blur-md rounded-full px-2.5 py-0.5 text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all ${
                      hasUserReacted
                        ? 'bg-indigo-500/15 border border-indigo-500/60 text-indigo-600 dark:text-indigo-400 font-semibold ring-1 ring-indigo-500/30'
                        : 'bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                    title={hasUserReacted ? `You reacted with ${r.emoji} (click to remove)` : `React with ${r.emoji}`}
                  >
                    <span>{r.emoji}</span>
                    <span className={`text-[11px] font-bold ${hasUserReacted ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}>{r.count}</span>
                  </motion.button>
                );
             })}
             <button
               type="button"
               onClick={(e) => {
                 e.stopPropagation();
                 setIsMenuOpen(true);
               }}
               className="p-1 rounded-full bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
               title="Add reaction"
             >
               <Plus className="w-3 h-3" />
             </button>
          </div>
        )}

      </div>
    </motion.div>
  );
}

function FilePreview({ fileData }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [viewToken, setViewToken] = useState(null);
  const [showMedia, setShowMedia] = useState(false);
  
  useEffect(() => {
    const calcTime = () => {
      const remaining = fileData.expiresAt - Date.now();
      if (remaining <= 0) return 'Expired';
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      return `${mins}m ${secs}s`;
    };
    setTimeLeft(calcTime());
    const interval = setInterval(() => setTimeLeft(calcTime()), 1000);
    return () => clearInterval(interval);
  }, [fileData.expiresAt]);

  const handleAction = async (actionType) => {
    let token = null;
    if (fileData.hasPassword && !viewToken) {
      const pwd = prompt(`Enter password to ${actionType} this file:`);
      if (!pwd) return;
      setIsDownloading(true);
      try {
        const res = await fetch(API_ROUTES.download(fileData.fileId), {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ password: pwd })
        });
        const data = await res.json();
        if (data.error) {
          alert(data.error);
          setIsDownloading(false);
          return;
        }
        token = data.token;
        setViewToken(token);
      } catch (e) {
        console.error(e);
        alert('Error validating password');
      }
      setIsDownloading(false);
    } else {
      token = viewToken;
    }

    if (actionType === 'download') {
      window.open(API_ROUTES.view(fileData.fileId, token), '_blank');
    } else if (actionType === 'view') {
      setShowMedia(true);
    }
  };

  if (timeLeft === 'Expired') {
     return <div className="text-red-400 italic text-sm flex items-center gap-2 font-medium bg-red-500/10 p-2 rounded-lg"><Lock className="w-4 h-4" /> This file has expired.</div>;
  }

  const isImage = fileData.mimeType?.startsWith('image/');
  const isVideo = fileData.mimeType?.startsWith('video/');
  const canPreview = isImage || isVideo;
  
  const mediaUrl = API_ROUTES.view(fileData.fileId, viewToken);

  return (
    <div className="flex flex-col min-w-[220px]">
       {showMedia && canPreview ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-2">
            {isImage ? (
                <img src={mediaUrl} alt={fileData.originalName} className="max-h-64 max-w-full object-contain rounded-lg shadow-lg border border-white/10" />
            ) : (
                <video src={mediaUrl} controls className="max-h-64 max-w-full rounded-lg shadow-lg border border-white/10" />
            )}
          </motion.div>
       ) : (
          <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl mb-3 border border-white/10 shadow-inner">
             <File className="w-8 h-8 text-indigo-300 drop-shadow-md" />
             <div className="flex-1 truncate pr-2">
                <p className="font-semibold text-sm truncate text-white drop-shadow-sm">{fileData.originalName}</p>
                <p className="text-xs text-white/70 font-medium">{(fileData.size / 1024 / 1024).toFixed(2)} MB</p>
             </div>
          </div>
       )}
       
       <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] mb-3 font-semibold">
          {fileData.hasPassword && <span className="bg-red-500/80 text-white px-2 py-1 rounded-md shadow-sm flex items-center gap-1"><Lock className="w-3 h-3"/> Locked</span>}
          {fileData.viewOnce && <span className="bg-purple-500/80 text-white px-2 py-1 rounded-md shadow-sm flex items-center gap-1"><EyeOff className="w-3 h-3"/> View Once</span>}
          <span className="bg-black/30 px-2 py-1 rounded-md shadow-sm flex items-center gap-1 text-yellow-300"><Clock className="w-3 h-3"/> {timeLeft}</span>
          {(fileData.downloads > 0 || fileData.downloads === 0) && (
            <span className="bg-emerald-500/80 text-white px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
               {fileData.downloads} DLs
            </span>
          )}
       </div>

       <div className="flex gap-2">
           {canPreview && !showMedia && (
               <button 
                 onClick={() => handleAction('view')}
                 className="flex-1 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold shadow-sm border border-white/10"
               >
                 <EyeOff className="w-3.5 h-3.5" /> View
               </button>
           )}
           <button 
             onClick={() => handleAction('download')}
             disabled={isDownloading}
             className="flex-1 py-1.5 sm:py-2 bg-indigo-500/80 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold shadow-sm border border-indigo-400/50"
           >
             <Download className="w-3.5 h-3.5" /> {isDownloading ? 'Wait' : (showMedia ? 'Save' : 'Download')}
           </button>
       </div>
    </div>
  );
}
