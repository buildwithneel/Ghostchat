import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, Shield, Zap, Search, Moon, Sun, Lock, Clock, Trash2, ArrowRight } from 'lucide-react';
import CreateRoomModal from '../components/CreateRoomModal';
import { useTheme } from '../App';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [recentRooms, setRecentRooms] = useState([]);
  const navigate = useNavigate();

  // Use shared theme from App context instead of local state
  const { isDarkTheme, toggleTheme } = useTheme();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ghostchat_recent_rooms') || '[]');
      if (Array.isArray(saved)) {
        setRecentRooms(saved);
      }
    } catch {
      setRecentRooms([]);
    }
  }, []);

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
    <div className="h-full w-full flex flex-col items-center justify-center p-4 py-8 relative overflow-y-auto bg-slate-100 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Top Bar Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-300 shadow-md backdrop-blur-md transition-all active:scale-95"
          title={isDarkTheme ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkTheme ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
        </button>
      </div>
      
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center max-w-2xl w-full my-auto"
      >
        <motion.div 
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="flex justify-center mb-6"
        >
          <div className="p-4 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl glass-panel shadow-xl">
            <Ghost className="w-16 h-16 text-indigo-500 dark:text-indigo-400" />
          </div>
        </motion.div>

        <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
          GhostChat
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg mb-8 max-w-md mx-auto">
          Unlimited rooms, encrypted ephemeral spaces, password protection. No signup, no logs.
        </p>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-xl mx-auto mb-8">
          {/* Create Room Card */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="glass-panel p-6 sm:p-7 rounded-3xl flex flex-col items-center justify-between text-center cursor-pointer group shadow-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all"
            onClick={() => setShowCreateModal(true)}
          >
            <div className="w-12 h-12 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold mb-1 text-slate-800 dark:text-slate-100">Create Room</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Custom room name, optional password, and shareable code.
            </p>
            <button
              type="button"
              className="w-full py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
            >
              Configure & Create <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>

          {/* Join Room Card */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="glass-panel p-6 sm:p-7 rounded-3xl flex flex-col items-center justify-between text-center group shadow-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all"
          >
            <div className="w-12 h-12 bg-purple-500/10 dark:bg-purple-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Search className="w-6 h-6 text-purple-500 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-bold mb-1 text-slate-800 dark:text-slate-100">Join Room</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter your friend's room code to join instantly.
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
          <div className="w-full max-w-xl mx-auto mb-8 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="flex items-center justify-between mb-3 px-1">
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
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/50 text-left transition-all group flex flex-col justify-between"
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
        <div className="flex justify-center gap-8 text-slate-500 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-500" /> Password Protection
          </div>
          <div className="flex items-center gap-1.5">
            <Ghost className="w-4 h-4 text-indigo-400" /> Ephemeral Data
          </div>
        </div>
      </motion.div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateRoomSubmit}
      />

    </div>
  );
}
