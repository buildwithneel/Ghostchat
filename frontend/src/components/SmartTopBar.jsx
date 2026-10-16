import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Users, Settings, Moon, Sun, Volume2, VolumeX, QrCode } from 'lucide-react';
import { getUserColor, getInitials } from '../utils/colors';

export default function SmartTopBar({ 
  roomId, 
  activeUsersCount, 
  username, 
  isAdmin, 
  onShowQr, 
  onShowSettings,
  isDarkTheme,
  toggleTheme,
  soundEnabled,
  toggleSound
}) {
  const [copied, setCopied] = useState(false);

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const userColor = getUserColor(username);

  return (
    <motion.header 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-panel p-4 flex items-center justify-between sticky top-0 z-30 transition-all duration-300 shadow-md border-b border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 backdrop-blur-xl"
    >
      <div className="flex items-center gap-3 md:gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Ghost Room</span>
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-400 truncate max-w-[120px] md:max-w-[200px]">
              {roomId}
            </h1>
            <button 
              onClick={copyRoomLink} 
              className="p-1.5 md:p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-700/80 rounded-lg text-slate-600 dark:text-slate-300 transition-all active:scale-95" 
              title="Copy Link"
            >
              {copied ? <span className="text-xs text-emerald-500 font-semibold px-1">Copied!</span> : <Copy className="w-4 h-4 md:w-4 md:h-4" />}
            </button>
            <button 
              onClick={onShowQr} 
              className="p-1.5 md:p-2 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-all active:scale-95 hidden sm:block"
              title="Show QR"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <motion.div 
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/50"
        >
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <span className="text-sm font-bold w-4 text-center">{activeUsersCount}</span>
        </motion.div>

        <div className="hidden md:flex items-center gap-2">
          <button 
            onClick={toggleTheme} 
            className="p-2 text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-300 transition-colors bg-slate-100 dark:bg-slate-800/40 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700/50"
            title={isDarkTheme ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkTheme ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
          </button>
          <button 
            onClick={toggleSound} 
            className="p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors bg-slate-100 dark:bg-slate-800/40 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700/50"
            title={soundEnabled ? "Mute Sound Effects" : "Enable Sound Effects"}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-500" /> : <VolumeX className="w-5 h-5 text-red-500" />}
          </button>
        </div>

        <motion.div 
           whileHover={{ scale: 1.02 }}
           whileTap={{ scale: 0.98 }}
           onClick={onShowSettings}
           className="pl-2 pr-4 py-1.5 bg-slate-100 dark:bg-gradient-to-r dark:from-slate-800/80 dark:to-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-full flex items-center gap-3 cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-colors shadow-sm group"
        >
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-inner relative overflow-hidden"
            style={{ backgroundColor: userColor }}
          >
            {isAdmin && <div className="absolute inset-0 border-2 border-yellow-400 rounded-full"></div>}
            {getInitials(username)}
          </div>
          <span className="text-slate-800 dark:text-slate-100 font-medium hidden sm:block max-w-[100px] truncate">{username}</span>
          <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors group-hover:rotate-45 duration-300" />
        </motion.div>
      </div>
    </motion.header>
  );
}
