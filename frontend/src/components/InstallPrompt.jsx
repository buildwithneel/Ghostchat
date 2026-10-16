import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // 1. Check if already installed / in standalone mode
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // 2. Check dismissal cooldown (dismissed within last 3 days)
    const lastDismissed = localStorage.getItem('ghostchat_pwa_dismissed');
    if (lastDismissed && Date.now() - parseInt(lastDismissed) < 3 * 24 * 60 * 60 * 1000) {
      setDismissed(true);
    }

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    setIsIOS(isIosDevice);

    // 4. Capture Chromium/Android install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setShowIosGuide(false);
    localStorage.setItem('ghostchat_pwa_dismissed', Date.now().toString());
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIosGuide(true);
    }
  };

  if (isStandalone || dismissed) {
    return null;
  }

  // Only show if we either have the deferred prompt (Android/Chrome) or on iOS Safari
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Install GhostChat application"
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50 bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-start gap-3.5">
          {/* App Icon */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shadow-md shrink-0">
            <img 
              src="/icon-192.png" 
              alt="GhostChat" 
              className="w-full h-full object-cover rounded-[10px]"
            />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-indigo-400" /> Install GhostChat
              </h3>
              <button 
                onClick={handleDismiss} 
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {isIOS 
                ? 'Add to your Home Screen for full-screen anonymous messaging.'
                : 'Install as an app for fast launch and standalone mode.'}
            </p>

            {/* iOS Instructions Dropdown */}
            {showIosGuide && isIOS && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs text-slate-300 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Share className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>1. Tap the <strong>Share</strong> button in Safari toolbar.</span>
                </div>
                <div className="flex items-center gap-2">
                  <PlusSquare className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>2. Scroll down & tap <strong>Add to Home Screen</strong>.</span>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex items-center justify-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
              >
                {isIOS ? (
                  <>
                    <Share className="w-3.5 h-3.5" />
                    {showIosGuide ? 'Follow Steps Above' : 'Install on iOS'}
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Install App
                  </>
                )}
              </button>
              <button
                onClick={handleDismiss}
                className="text-xs font-medium px-3 py-2 rounded-xl text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
