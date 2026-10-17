import { useState } from 'react';
import { motion } from 'framer-motion';
import { Reply, Copy, Pin, Forward, Check } from 'lucide-react';

const QUICK_EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '👏'];

export default function MessageActionMenu({ 
  onReply, 
  onForward,
  onCopy, 
  onPin, 
  onReact, 
  isOwn, 
  isAdmin 
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyClick = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const actions = [
    { icon: <Reply className="w-4 h-4" />, label: 'Reply', onClick: onReply },
    { icon: <Forward className="w-4 h-4" />, label: 'Forward', onClick: onForward },
    { 
      icon: copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />, 
      label: copied ? 'Copied!' : 'Copy', 
      onClick: handleCopyClick 
    },
  ];

  if (isAdmin || isOwn) {
    actions.push({ icon: <Pin className="w-4 h-4" />, label: 'Pin', onClick: onPin });
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => e.stopPropagation()}
      className={`absolute -top-12 ${isOwn ? 'right-0' : 'left-0'} flex flex-col items-center pb-2 z-30 select-none`}
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl p-1 flex items-center gap-1">
        {/* Quick Emoji Reaction Strip */}
        <div className="flex items-center gap-0.5 px-1 border-r border-slate-200 dark:border-slate-700/80">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReact(emoji);
              }}
              className="w-7 h-7 flex items-center justify-center text-sm rounded-lg hover:scale-125 hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform active:scale-95"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5">
          {actions.map((act, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                act.onClick();
              }}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors group relative"
              title={act.label}
            >
              {act.icon}
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow">
                {act.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
