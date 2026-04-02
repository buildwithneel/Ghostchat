import { motion } from 'framer-motion';
import { Reply, Copy, Pin, Smile } from 'lucide-react';

export default function MessageActionMenu({ onReply, onCopy, onPin, onReact, isOwn, isAdmin }) {
  const actions = [
    { icon: <Reply className="w-4 h-4" />, label: 'Reply', onClick: onReply },
    { icon: <Copy className="w-4 h-4" />, label: 'Copy', onClick: onCopy },
    { icon: <Smile className="w-4 h-4" />, label: 'React', onClick: onReact },
  ];

  if (isAdmin || isOwn) {
    actions.push({ icon: <Pin className="w-4 h-4" />, label: 'Pin', onClick: onPin });
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className="absolute -top-12 right-0 bg-slate-800/90 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-xl flex items-center p-1 z-10"
    >
      {actions.map((act, i) => (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); act.onClick(); }}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors group relative"
        >
          {act.icon}
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {act.label}
          </span>
        </button>
      ))}
    </motion.div>
  );
}
