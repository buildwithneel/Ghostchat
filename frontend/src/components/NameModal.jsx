import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function NameModal({ isOpen, onClose, currentName, onSave }) {
  const [newName, setNewName] = useState(currentName || '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel w-full max-w-sm rounded-2xl p-6 shadow-2xl relative border border-slate-700/50"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-semibold mb-4 text-white">Change Name</h3>
        
        <input 
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New Username"
          maxLength={20}
          className="w-full bg-slate-800/80 border border-slate-600 rounded-xl px-4 py-3 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              if (newName.trim()) onSave(newName.trim());
            }}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}
