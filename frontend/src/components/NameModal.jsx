import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Check } from 'lucide-react';

export default function NameModal({ isOpen, onClose, currentName, onSave }) {
  const [newName, setNewName] = useState(currentName || '');

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName || '');
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (trimmed) {
      onSave(trimmed);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl p-6 shadow-2xl relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
        >
          {/* Close Button */}
          <button 
            type="button"
            onClick={onClose} 
            className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
              <Edit3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Change Name</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Set your alias for this room</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <input 
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new alias..."
                maxLength={20}
                className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm font-medium transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400 dark:text-slate-500 pointer-events-none">
                {newName.length}/20
              </span>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-semibold"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={!newName.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-semibold shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
