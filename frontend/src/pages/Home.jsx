import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ghost, Shield, Zap, Search } from 'lucide-react';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = () => {
    navigate('/room/new');
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/room/${roomId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-slate-900">
      
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center max-w-2xl w-full"
      >
        <motion.div 
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="flex justify-center mb-6"
        >
          <div className="p-4 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl glass-panel">
            <Ghost className="w-16 h-16 text-indigo-400" />
          </div>
        </motion.div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
          GhostChat
        </h1>
        <p className="text-slate-400 text-lg md:text-xl mb-12">
          Secure, anonymous, temporary spaces. No login, no trace. 
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-xl mx-auto">
          {/* Create Room Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-panel p-8 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer group"
            onClick={handleCreateRoom}
          >
            <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-500/30 transition-colors">
              <Zap className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-200">New Room</h3>
            <p className="text-sm text-slate-400">Generate a secure temporary chat space instantly.</p>
          </motion.div>

          {/* Join Room Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-panel p-8 rounded-3xl flex flex-col items-center justify-center text-center group"
          >
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
              <Search className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-4 text-slate-200">Join Room</h3>
            <form onSubmit={handleJoinRoom} className="w-full relative">
              <input 
                type="text" 
                placeholder="Enter Code" 
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-center text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all uppercase tracking-widest"
                maxLength={8}
              />
              {roomId && (
                <button type="submit" className="absolute right-2 top-2 p-1.5 bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors">
                  <Search className="w-4 h-4 text-white" />
                </button>
              )}
            </form>
          </motion.div>
        </div>

        <div className="mt-16 flex justify-center gap-8 text-slate-500 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> End-to-end Encrypted
          </div>
          <div className="flex items-center gap-2">
            <Ghost className="w-4 h-4" /> No Logs
          </div>
        </div>
      </motion.div>
    </div>
  );
}
