import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Users, Settings, Moon, Sun, Volume2, VolumeX, QrCode, Lock, LogOut } from 'lucide-react';
import { getUserColor, getInitials } from '../utils/colors';

export default function SmartTopBar({ 
  roomId, 
  roomName,
  hasPassword,
  activeUsersCount, 
  username, 
  isAdmin, 
  onShowQr, 
  onShowSettings,
  onLeaveRoom,
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
      className="glass-panel shrink-0 px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between z-30 transition-all duration-300 shadow-sm border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl w-full min-w-0"
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold truncate">
              {roomName && roomName !== `Room ${roomId}` ? roomName : 'Ghost Room'}
            </span>
            {hasPassword && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500 font-semibold bg-amber-500/10 px-1.5 py-0.2 rounded">
                <Lock className="w-2.5 h-2.5" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-400 truncate max-w-[120px] sm:max-w-[200px]">
              {roomId}
            </h1>
            <button 
              onClick={copyRoomLink} 
              className="p-1 sm:p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-700/80 rounded-lg text-slate-600 dark:text-slate-300 transition-all active:scale-95 shrink-0" 
              title="Copy Room Link"
            >
              {copied ? <span className="text-[10px] text-emerald-500 font-bold px-1">Copied!</span> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
            <button 
              onClick={onShowQr} 
              className="p-1 sm:p-1.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-all active:scale-95 hidden sm:block shrink-0"
              title="Show QR Code"
            >
              <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Active Users Badge */}
        <motion.div 
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/40 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-slate-200 dark:border-slate-700/50"
          title={`${activeUsersCount} user${activeUsersCount === 1 ? '' : 's'} active`}
        >
          <div className="relative flex h-2 sm:h-2.5 w-2 sm:w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 sm:h-2.5 w-2 sm:w-2.5 bg-emerald-500"></span>
          </div>
          <span className="text-xs sm:text-sm font-bold">{activeUsersCount}</span>
        </motion.div>

        {/* Theme and Sound Controls (Desktop) */}
        <div className="hidden md:flex items-center gap-1.5">
          <button 
            onClick={toggleTheme} 
            className="p-2 text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-300 transition-colors bg-slate-100 dark:bg-slate-800/40 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700/50"
            title={isDarkTheme ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkTheme ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
          </button>
          <button 
            onClick={toggleSound} 
            className="p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors bg-slate-100 dark:bg-slate-800/40 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700/50"
            title={soundEnabled ? "Mute Sound Effects" : "Enable Sound Effects"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-red-500" />}
          </button>
        </div>

        {/* User Alias & Settings Trigger */}
        <motion.div 
           whileHover={{ scale: 1.02 }}
           whileTap={{ scale: 0.98 }}
           onClick={onShowSettings}
           className="pl-1 sm:pl-2 pr-2 sm:pr-3 py-1 bg-slate-100 dark:bg-gradient-to-r dark:from-slate-800/80 dark:to-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-full flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-colors shadow-sm group"
        >
          <div 
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm text-white shadow-inner relative overflow-hidden"
            style={{ backgroundColor: userColor }}
          >
            {isAdmin && <div className="absolute inset-0 border-2 border-yellow-400 rounded-full"></div>}
            {getInitials(username)}
          </div>
          <span className="text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-medium hidden xs:block max-w-[80px] sm:max-w-[100px] truncate">{username}</span>
          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors group-hover:rotate-45 duration-300" />
        </motion.div>

        {/* Quick Leave Room Button */}
        {onLeaveRoom && (
          <button
            onClick={onLeaveRoom}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/15 rounded-full transition-colors shrink-0"
            title="Leave Room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.header>
  );
}
