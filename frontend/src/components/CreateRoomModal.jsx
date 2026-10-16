import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Lock, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';

export default function CreateRoomModal({ isOpen, onClose, onCreate }) {
  const [roomName, setRoomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomCode(code);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onCreate({
        roomName: roomName.trim(),
        roomId: customCode.trim().toUpperCase() || undefined,
        password: hasPassword ? password.trim() : null
      });
    } catch (err) {
      setError(err?.message || 'Failed to create room');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative flex flex-col gap-4 text-slate-900 dark:text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-2xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Create New Room</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Set up a custom temporary space</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="flex flex-col gap-4 mt-1">
            {/* Room Name */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Room Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Study Lounge, Secret Project"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={40}
                className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
              />
            </div>

            {/* Custom Room Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Room Code / ID
                </label>
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Generate Code
                </button>
              </div>
              <input
                type="text"
                placeholder="Auto-generated if left blank"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                maxLength={10}
                className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 uppercase tracking-widest font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* Password Protection Toggle */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className={`w-4 h-4 ${hasPassword ? 'text-amber-500' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-xs font-semibold block">Password Protection</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Only people with the password can join</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHasPassword(!hasPassword)}
                  className={`w-11 h-6 rounded-full relative transition-colors ${hasPassword ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${hasPassword ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {hasPassword && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/50"
                >
                  <input
                    type="password"
                    placeholder="Set room password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={hasPassword}
                    className="w-full bg-white dark:bg-slate-900 border border-amber-500/40 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </motion.div>
              )}
            </div>

            {error && (
              <div className="text-xs text-red-500 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (hasPassword && !password.trim())}
              className="mt-2 w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
            >
              {loading ? (
                'Creating Room...'
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Launch Room
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
