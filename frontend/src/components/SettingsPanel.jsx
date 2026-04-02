import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, Sun, Volume2, VolumeX, LogOut, Trash2, Edit3 } from 'lucide-react';
import { getUserColor, getInitials } from '../utils/colors';

export default function SettingsPanel({
  isOpen,
  onClose,
  username,
  onEditName,
  isDarkTheme,
  toggleTheme,
  soundEnabled,
  toggleSound,
  onClearChat,
  onLeaveRoom
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-80 max-w-[90vw] glass-panel bg-slate-900/90 border-l border-slate-700/50 z-50 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Settings
              </h2>
              <button 
                onClick={onClose}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
              
              {/* Profile Section */}
              <div className="flex flex-col items-center gap-3">
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-xl relative"
                  style={{ backgroundColor: getUserColor(username) }}
                >
                  {getInitials(username)}
                  <button 
                    onClick={() => { onClose(); onEditName(); }}
                    className="absolute -bottom-1 -right-1 p-2 bg-indigo-500 rounded-full hover:bg-indigo-400 transition-colors shadow-lg border-2 border-slate-900"
                  >
                    <Edit3 className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white">{username}</h3>
                  <p className="text-sm text-slate-400">Current Alias</p>
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preferences</h4>
                
                <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-700/50 rounded-lg text-amber-300">
                      {isDarkTheme ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5" />}
                    </div>
                    <span className="text-slate-200 font-medium">Dark Mode</span>
                  </div>
                  <button 
                    onClick={toggleTheme}
                    className={`w-12 h-6 rounded-full relative transition-colors ${isDarkTheme ? 'bg-indigo-500' : 'bg-slate-600'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${isDarkTheme ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-700/50 rounded-lg">
                      {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-red-400" />}
                    </div>
                    <span className="text-slate-200 font-medium">Sound Effects</span>
                  </div>
                  <button 
                    onClick={toggleSound}
                    className={`w-12 h-6 rounded-full relative transition-colors ${soundEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${soundEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="space-y-4 mt-auto pt-8">
                <h4 className="text-xs font-bold text-red-500/80 uppercase tracking-wider">Danger Zone</h4>
                
                <button 
                  onClick={() => { onClose(); onClearChat(); }}
                  className="w-full flex items-center gap-3 p-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/20"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="font-medium">Clear Chat History</span>
                </button>
                
                <button 
                  onClick={() => { onClose(); onLeaveRoom(); }}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium shadow-lg shadow-red-500/20"
                >
                  <LogOut className="w-5 h-5" />
                  Leave Room
                </button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
