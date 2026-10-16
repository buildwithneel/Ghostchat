import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Lock, Clock, EyeOff } from 'lucide-react';

export default function FileUploadModal({ isOpen, onClose, onUpload }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [password, setPassword] = useState('');
  const [viewOnce, setViewOnce] = useState(false);
  const [expiryHours, setExpiryHours] = useState('1'); // Expiry in hours
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = () => {
    if (!selectedFile) return;
    onUpload({
      file: selectedFile,
      password: password.trim(),
      viewOnce,
      expiryMins: (parseFloat(expiryHours) * 60).toString()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl relative border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg sm:text-xl font-bold mb-5 text-slate-900 dark:text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Upload File
        </h3>

        {!selectedFile ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-600 rounded-2xl p-8 mb-6 text-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800/30 transition-all group"
          >
             <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3 group-hover:text-indigo-400 transition-colors" />
             <p className="text-slate-300 font-medium">Click to select file</p>
             <p className="text-slate-500 text-sm mt-1">Image, Video, PDF (Max 50MB)</p>
          </div>
        ) : (
          <div className="bg-slate-800/50 p-4 rounded-xl mb-6 border border-slate-700 flex justify-between items-center">
            <div className="truncate text-slate-200 font-medium pr-4">
              {selectedFile.name} 
              <span className="text-slate-500 text-sm block">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <button onClick={() => setSelectedFile(null)} className="text-red-400 hover:text-red-300 p-2"><X className="w-4 h-4" /></button>
          </div>
        )}

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*,video/*,application/pdf"
        />

        {selectedFile && (
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 w-full bg-slate-800/30 rounded-xl p-3 border border-slate-700">
              <Lock className="w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Optional Password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-transparent border-none text-white focus:outline-none w-full"
              />
            </div>
            
            <div className="flex items-center gap-3 w-full bg-slate-800/30 rounded-xl p-3 border border-slate-700">
              <Clock className="w-5 h-5 text-slate-400" />
              <select 
                value={expiryHours} 
                onChange={e => setExpiryHours(e.target.value)}
                className="bg-transparent border-none text-white focus:outline-none w-full appearance-none"
              >
                <option value="0.016">1 Minute</option>
                <option value="0.083">5 Minutes</option>
                <option value="1">1 Hour</option>
                <option value="24">24 Hours</option>
              </select>
            </div>

            <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-800/30 rounded-xl border border-slate-700 hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center justify-center w-6 h-6 rounded border border-slate-500 bg-slate-900">
                {viewOnce && <div className="w-3 h-3 bg-indigo-500 rounded-sm" />}
              </div>
              <input type="checkbox" checked={viewOnce} onChange={e => setViewOnce(e.target.checked)} className="hidden" />
              <div className="flex flex-col">
                <span className="text-white flex items-center gap-2"><EyeOff className="w-4 h-4" /> View Once</span>
                <span className="text-slate-400 text-xs">Self-destructs after opening</span>
              </div>
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-300 font-medium hover:bg-slate-800">Cancel</button>
          <button 
            onClick={handleUploadSubmit}
            disabled={!selectedFile}
            className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20"
          >
            Send File
          </button>
        </div>
      </motion.div>
    </div>
  );
}
