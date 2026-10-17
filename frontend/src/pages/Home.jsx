import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ghost, Shield, Zap, Search, Moon, Sun, Lock, Clock, Trash2, ArrowRight, Download } from 'lucide-react';
import CreateRoomModal from '../components/CreateRoomModal';
import { useTheme } from '../App';
import { isRunningStandalone } from '../components/InstallPrompt';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [recentRooms, setRecentRooms] = useState([]);
  const navigate = useNavigate();

  // Use shared theme from App context instead of local state
  const { isDarkTheme, toggleTheme } = useTheme();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const joinParam = params.get('join') || params.get('room');
      if (joinParam && joinParam.trim()) {
        navigate(`/room/${joinParam.trim().toUpperCase()}`, { replace: true });
        return;
      }
    } catch {}

    try {
      const saved = JSON.parse(localStorage.getItem('ghostchat_recent_rooms') || '[]');
      if (Array.isArray(saved)) {
        setRecentRooms(saved);
      }
    } catch {
      setRecentRooms([]);
    }
  }, [navigate]);

  const handleCreateRoomSubmit = ({ roomName, roomId: customId, password }) => {
    const targetId = customId || 'new';
    navigate(`/room/${targetId}`, {
      state: {
        roomName,
        password,
        isExplicitCreate: true
      }
    });
  };

  const handleJoinRoom = (e) => {
    if (e) e.preventDefault();
    if (roomId.trim()) {
      navigate(`/room/${roomId.trim().toUpperCase()}`);
    }
  };

  const clearRecentRooms = () => {
    localStorage.removeItem('ghostchat_recent_rooms');
    setRecentRooms([]);
  };

  return (
    <div className="h-full w-full flex flex-col p-3 sm:p-6 relative overflow-y-auto overflow-x-hidden bg-slate-100 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Top Bar Actions: Theme Toggle + Install App */}
      <div className="sticky top-0 z-30 flex items-center justify-end gap-2 w-full max-w-2xl mx-auto pt-1 pb-2 shrink-0">
        {!isRunningStandalone() && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('pwa-open-install'))}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 shadow-sm backdrop-blur-md transition-all active:scale-95 text-xs font-semibold flex items-center gap-1.5"
            title="Install GhostChat App"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 sm:p-2.5 rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-300 shadow-sm backdrop-blur-md transition-all active:scale-95"
          title={isDarkTheme ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkTheme ? <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />}
        </button>
      </div>
      
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content Area: centered on large screens, naturally scrollable without clipping on iPhone SE */}
      <div className="sm:my-auto min-h-0 w-full flex flex-col items-center justify-start sm:justify-center py-2 sm:py-6">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 text-center max-w-2xl w-full flex flex-col items-center"
        >
          {/* Logo Badge */}
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="flex justify-center mb-3 sm:mb-5"
          >
            <div className="p-3 sm:p-4 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl glass-panel shadow-lg">
              <Ghost className="w-10 h-10 sm:w-14 sm:h-14 text-indigo-500 dark:text-indigo-400" />
            </div>
          </motion.div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold mb-2 sm:mb-3 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            GhostChat
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-base md:text-lg mb-5 sm:mb-8 max-w-md mx-auto px-2 leading-relaxed">
            Unlimited rooms, encrypted ephemeral spaces, password protection. No signup, no logs.
          </p>

          {/* Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5 w-full max-w-xl mx-auto mb-5 sm:mb-8">
            {/* Create Room Card */}
            <motion.div 
              whileHover={{ y: -3 }}
              className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-between text-center cursor-pointer group shadow-md hover:shadow-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all"
              onClick={() => setShowCreateModal(true)}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-2.5 sm:mb-3.5 group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500 dark:text-indigo-400" />
              </div>
              <h3 className="text-base sm:text-lg font-bold mb-1 text-slate-800 dark:text-slate-100">Create Room</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mb-3 sm:mb-4">
                Custom room name, optional password, and shareable code.
              </p>
              <button
                type="button"
                className="w-full py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 active:scale-95"
              >
                Configure & Create <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>

            {/* Join Room Card */}
            <motion.div 
              whileHover={{ y: -3 }}
              className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-between text-center group shadow-md hover:shadow-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/10 dark:bg-purple-500/20 rounded-2xl flex items-center justify-center mb-2.5 sm:mb-3.5 group-hover:scale-110 transition-transform">
                <Search className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 dark:text-purple-400" />
              </div>
              <h3 className="text-base sm:text-lg font-bold mb-1 text-slate-800 dark:text-slate-100">Join Room</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mb-3 sm:mb-4">
                Enter your friend&apos;s room code to join instantly.
              </p>
              <form onSubmit={handleJoinRoom} className="w-full relative">
                <input 
                  type="text" 
                  placeholder="ROOM CODE" 
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2.5 text-center text-xs sm:text-sm font-semibold uppercase tracking-widest text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  maxLength={10}
                />
                {roomId && (
                  <button 
                    type="submit" 
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-purple-500 hover:bg-purple-600 rounded-lg text-white text-xs font-semibold flex items-center justify-center transition-colors"
                  >
                    Join
                  </button>
                )}
              </form>
            </motion.div>
          </div>

          {/* Recent Rooms Quick Switcher */}
          {recentRooms.length > 0 && (
            <div className="w-full max-w-xl mx-auto mb-5 sm:mb-8 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md">
              <div className="flex items-center justify-between mb-2.5 px-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" /> Recent Rooms
                </span>
                <button
                  type="button"
                  onClick={clearRecentRooms}
                  className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                  title="Clear Recent Rooms"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {recentRooms.slice(0, 6).map((room) => (
                  <button
                    key={room.roomId}
                    type="button"
                    onClick={() => navigate(`/room/${room.roomId}`)}
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/50 text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-500 font-mono">
                        {room.roomId}
                      </span>
                      {room.hasPassword && (
                        <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate w-full">
                      {room.roomName || 'Ghost Room'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Security Badges */}
          <div className="flex justify-center gap-6 sm:gap-8 text-slate-500 text-xs pb-4">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" /> Password Protection
            </div>
            <div className="flex items-center gap-1.5">
              <Ghost className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" /> Ephemeral Data
            </div>
          </div>
        </motion.div>
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateRoomSubmit}
      />

    </div>
  );
}
