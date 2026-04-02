import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WelcomeMessage({ show }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4"
        >
          <div className="glass-panel relative overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="text-6xl mb-4"
            >
              👻
            </motion.div>
            <h2 className="text-xl md:text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400">
              No names. No traces.<br/>Just talk.
            </h2>
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent pointer-events-none" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
