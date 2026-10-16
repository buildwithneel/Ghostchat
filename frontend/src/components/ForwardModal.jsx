import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Forward, Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { socket } from '../utils/socket';

export default function ForwardModal({
  isOpen,
  onClose,
  message,
  currentRoomId,
  username,
  onForwardSuccess
}) {
  const [targetRoomId, setTargetRoomId] = useState('');
  const [targetPassword, setTargetPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [recentRooms, setRecentRooms] = useState([]);
  const [status, setStatus] = useState({ loading: false, error: null, success: false });

  useEffect(() => {
    if (isOpen) {
      setStatus({ loading: false, error: null, success: false });
      setTargetPassword('');
      setRequiresPassword(false);
      try {
        const saved = JSON.parse(localStorage.getItem('ghostchat_recent_rooms') || '[]');
        // Filter out current room
        const filtered = saved.filter(r => r.roomId !== currentRoomId);
        setRecentRooms(filtered);
      } catch {
        setRecentRooms([]);
      }
    }
  }, [isOpen, currentRoomId]);

  if (!isOpen || !message) return null;

  const handleForward = (e) => {
    if (e) e.preventDefault();
    const cleanTarget = targetRoomId.trim().toUpperCase();
    if (!cleanTarget) {
      setStatus({ loading: false, error: 'Please enter a target room code', success: false });
      return;
    }

    if (cleanTarget === currentRoomId) {
      setStatus({ loading: false, error: 'Cannot forward to the same room', success: false });
      return;
    }

    setStatus({ loading: true, error: null, success: false });

    socket.emit('forward_message', {
      fromRoomId: currentRoomId,
      targetRoomId: cleanTarget,
      message,
      username,
      targetPassword: targetPassword.trim()
    }, (response) => {
      if (response?.success) {
        setStatus({ loading: false, error: null, success: true });
        if (onForwardSuccess) {
          onForwardSuccess(cleanTarget);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else if (response?.requiresPassword) {
        setRequiresPassword(true);
        setStatus({
          loading: false,
          error: response.error || 'Password required for this room',
          success: false
        });
      } else {
        setStatus({
          loading: false,
          error: response?.error || 'Failed to forward message',
          success: false
        });
      }
    });
  };

  const previewSnippet = message.type === 'file' 
    ? `📎 ${message.fileData?.originalName || 'File Attachment'}`
    : message.message;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative flex flex-col gap-4 text-slate-900 dark:text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-xl">
                <Forward className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Forward Message</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message Preview */}
          <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/50">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              From {message.username}
            </div>
            <div className="text-sm line-clamp-3 text-slate-800 dark:text-slate-200">
              {previewSnippet}
            </div>
          </div>

          {/* Recent Rooms Quick Select */}
          {recentRooms.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 block uppercase tracking-wider">
                Recent Rooms
              </span>
              <div className="flex flex-wrap gap-2">
                {recentRooms.slice(0, 4).map((r) => (
                  <button
                    key={r.roomId}
                    type="button"
                    onClick={() => {
                      setTargetRoomId(r.roomId);
                      setRequiresPassword(false);
                      setStatus({ loading: false, error: null, success: false });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      targetRoomId === r.roomId
                        ? 'bg-indigo-500 text-white border-indigo-400 shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {r.roomName || r.roomId}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Target Code Form */}
          <form onSubmit={handleForward} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Target Room Code
              </label>
              <input
                type="text"
                placeholder="e.g. ROOM123"
                value={targetRoomId}
                onChange={(e) => {
                  setTargetRoomId(e.target.value.toUpperCase());
                  if (status.error) setStatus(prev => ({ ...prev, error: null }));
                }}
                maxLength={12}
                className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3 uppercase tracking-wider font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* Password input if protected */}
            {(requiresPassword || targetPassword) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex flex-col gap-1.5"
              >
                <label className="text-xs font-semibold text-amber-500 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Room Password
                </label>
                <input
                  type="password"
                  placeholder="Enter target room password"
                  value={targetPassword}
                  onChange={(e) => setTargetPassword(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800/80 border border-amber-500/50 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
                />
              </motion.div>
            )}

            {/* Status alerts */}
            {status.error && (
              <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{status.error}</span>
              </div>
            )}

            {status.success && (
              <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Message forwarded successfully!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={status.loading || !targetRoomId.trim() || status.success}
              className="mt-2 w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
            >
              {status.loading ? (
                'Forwarding...'
              ) : status.success ? (
                'Forwarded!'
              ) : (
                <>
                  Forward Message
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
