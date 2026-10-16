import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Smile, X, Search, Reply } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

export default function InputBar({
  onSendMessage,
  onTyping,
  onOpenUpload,
  onSearchToggle,
  replyingTo,
  onCancelReply
}) {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const emojiRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (replyingTo && onCancelReply) {
          onCancelReply();
        } else {
          setShowEmoji(false);
          inputRef.current?.blur();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [replyingTo, onCancelReply]);

  // Focus input automatically when replyingTo changes
  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    if (showEmoji) window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showEmoji]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (message.trim()) {
      onSendMessage(message, replyingTo);
      setMessage('');
      if (onCancelReply) onCancelReply();
      if (onTyping) onTyping(false);
      clearTimeout(typingTimeoutRef.current);
      setShowEmoji(false);
    }
  };

  const handleTextChange = (e) => {
    setMessage(e.target.value);
    
    if (onTyping) {
      onTyping(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    }
  };

  const onEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  useEffect(() => {
    return () => clearTimeout(typingTimeoutRef.current);
  }, []);

  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="shrink-0 w-full px-2 sm:px-4 md:px-8 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] bg-gradient-to-t from-slate-100 via-slate-100/95 dark:from-[#090d16] dark:via-[#090d16]/95 to-transparent z-30 transition-colors pointer-events-none"
    >
      <div className="max-w-4xl mx-auto relative pointer-events-auto flex flex-col gap-1.5">
        
        {/* Reply Indicator Strip */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="px-4 py-2 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-lg flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-lg shrink-0">
                  <Reply className="w-4 h-4" />
                </div>
                <div className="min-w-0 text-xs">
                  <span className="font-semibold text-indigo-500 dark:text-indigo-400">
                    Replying to {replyingTo.username}
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 truncate max-w-xs sm:max-w-md">
                    {replyingTo.type === 'file' ? '📎 File Attachment' : replyingTo.message}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancelReply}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                title="Cancel Reply"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emoji Picker Popup */}
        <AnimatePresence>
          {showEmoji && (
            <motion.div 
              ref={emojiRef}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-[calc(100%+8px)] right-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50 max-w-[calc(100vw-24px)]"
            >
              <EmojiPicker 
                theme="auto" 
                onEmojiClick={onEmojiClick}
                width={Math.min(320, typeof window !== 'undefined' ? window.innerWidth - 32 : 300)}
                height={360}
                searchDisabled={true}
                skinTonesDisabled={true}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Form Bar */}
        <form onSubmit={handleSend} className="glass-panel p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl flex items-end gap-1.5 sm:gap-2 shadow-xl border border-slate-200 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/85 backdrop-blur-xl transition-all">
          
          <button 
            type="button"
            onClick={onOpenUpload}
            className="p-2 sm:p-3 text-slate-500 hover:text-indigo-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0 group relative"
            title="Upload File"
          >
            <Paperclip className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          
          <button 
            type="button"
            onClick={onSearchToggle}
            className="p-2 sm:p-3 hidden sm:block text-slate-500 hover:text-emerald-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0 group"
            title="Search Messages"
          >
            <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>

          <div className="relative flex-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700/50 focus-within:border-indigo-500/50 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all flex items-center min-w-0">
            <textarea
              ref={inputRef}
              value={message}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : "Type a message... (Press '/' to focus)"}
              className="w-full bg-transparent pl-3 sm:pl-4 pr-9 sm:pr-12 py-2.5 sm:py-3.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none max-h-28 sm:max-h-32 min-h-[44px] sm:min-h-[52px] scrollbar-hide text-sm sm:text-base leading-relaxed"
              rows={1}
            />
            <button 
              type="button"
              onClick={() => setShowEmoji(!showEmoji)}
              className="absolute right-2 sm:right-3 bottom-2.5 sm:bottom-3 p-1 text-slate-400 hover:text-yellow-500 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-lg"
            >
              {showEmoji ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Smile className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>

          <button 
            type="submit" 
            disabled={!message.trim()}
            className="p-2.5 sm:p-3.5 bg-gradient-to-tr from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] shrink-0 active:scale-95 flex items-center justify-center"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5 translate-x-0.5 -translate-y-0.5" />
          </button>

        </form>
      </div>
    </motion.div>
  );
}
