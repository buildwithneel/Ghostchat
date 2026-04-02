import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Smile, X, Search } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

export default function InputBar({ onSendMessage, onTyping, onOpenUpload, onSearchToggle }) {
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
        setShowEmoji(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      onSendMessage(message);
      setMessage('');
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
      className="pb-4 pt-2 px-4 md:px-8 w-full bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent sticky bottom-0 z-30 pointer-events-none"
    >
      <div className="max-w-4xl mx-auto relative pointer-events-auto">
        
        <AnimatePresence>
          {showEmoji && (
            <motion.div 
              ref={emojiRef}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-[calc(100%+10px)] right-0 md:right-16 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-700/50"
            >
              <EmojiPicker 
                theme="dark" 
                onEmojiClick={onEmojiClick}
                width={300}
                height={400}
                searchDisabled={true}
                skinTonesDisabled={true}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="glass-panel p-2 rounded-3xl flex items-end gap-2 shadow-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-xl transition-all">
          
          <button 
            type="button"
            onClick={onOpenUpload}
            className="p-3 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-full transition-colors shrink-0 group relative"
            title="Upload File"
          >
            <Paperclip className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          
          <button 
            type="button"
            onClick={onSearchToggle}
            className="p-3 hidden sm:block text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-full transition-colors shrink-0 group"
            title="Search Messages"
          >
            <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>

          <div className="relative flex-1 bg-slate-800/50 rounded-2xl border border-slate-700/50 focus-within:border-indigo-500/50 focus-within:bg-slate-800 transition-all flex items-center">
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
              placeholder="Type a message... (Press '/' to focus)"
              className="w-full bg-transparent pl-4 pr-12 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-32 min-h-[52px] scrollbar-hide text-sm sm:text-base leading-relaxed"
              rows={1}
            />
            <button 
              type="button"
              onClick={() => setShowEmoji(!showEmoji)}
              className="absolute right-3 bottom-3 p-1 text-slate-400 hover:text-yellow-400 transition-colors hover:bg-slate-700/50 rounded-lg"
            >
              {showEmoji ? <X className="w-5 h-5" /> : <Smile className="w-5 h-5" />}
            </button>
          </div>

          <button 
            type="submit"
            disabled={!message.trim()}
            className="p-3.5 bg-gradient-to-tr from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] shrink-0 active:scale-95"
          >
            <Send className="w-5 h-5 translate-x-0.5 -translate-y-0.5" />
          </button>

        </form>
      </div>
    </motion.div>
  );
}
