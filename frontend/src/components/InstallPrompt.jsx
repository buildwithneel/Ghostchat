import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share, Plus, Download, Smartphone, ChevronUp } from 'lucide-react';

// ── Utility: detect platform ─────────────────────────────────────────────────
function getPlatform() {
  const ua = navigator.userAgent;
  const isIOS =
    (/iphone|ipad|ipod/i.test(ua) && !window.MSStream) ||
    // iPadOS 13+ reports as Macintosh with touch support
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  const isSamsungBrowser = /samsungbrowser/i.test(ua);
  const isChrome = /chrome|crios/i.test(ua) && !/edg/i.test(ua);
  const isFirefox = /firefox|fxios/i.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua) || /version\/[\d.]+.*safari/i.test(ua);

  return { isIOS, isAndroid, isSamsungBrowser, isChrome, isFirefox, isSafari };
}

function isRunningStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

const platform = getPlatform();

// ── Component ────────────────────────────────────────────────────────────────
export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Never show if already installed
    if (isRunningStandalone()) return;

    // Check if user dismissed recently (7-day cooldown)
    try {
      const ts = localStorage.getItem('ghostchat_pwa_dismissed');
      if (ts && Date.now() - parseInt(ts, 10) < 7 * 24 * 60 * 60 * 1000) return;
    } catch {}

    // Delay before showing so it doesn't fight for attention on first load
    const timer = setTimeout(() => {
      if (platform.isIOS && platform.isSafari) {
        // iOS Safari: manual install via Share sheet
        setShow(true);
      }
    }, 3500);

    // Android / Chrome: listen for native prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      clearTimeout(timer);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Also show after install completes (cleanup)
    const handleInstalled = () => {
      setShow(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    setShowIOSGuide(false);
    try {
      localStorage.setItem('ghostchat_pwa_dismissed', Date.now().toString());
    } catch {}
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android/Chrome: trigger native install dialog
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
        setDeferredPrompt(null);
      }
    } else if (platform.isIOS) {
      // iOS: show manual instructions
      setShowIOSGuide((prev) => !prev);
    }
  };

  if (!show) return null;

  const isIOSManual = platform.isIOS && !deferredPrompt;

  return (
    <AnimatePresence>
      <motion.div
        key="install-prompt"
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="max-w-lg mx-auto bg-slate-900/98 border border-slate-700/70 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden">
          {/* ── Main Row ── */}
          <div className="flex items-center gap-3 p-3.5">
            {/* App Icon */}
            <div className="shrink-0 w-12 h-12 rounded-2xl overflow-hidden shadow-lg border border-white/10">
              <img src="/icon-192.png" alt="GhostChat" className="w-full h-full object-cover" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                Install GhostChat
              </p>
              <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                {isIOSManual
                  ? 'Add to Home Screen for full-screen, offline-ready chat.'
                  : 'Install for offline access, fast launch & a native app feel.'}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-semibold rounded-xl shadow-md active:scale-95 transition-transform"
              >
                {isIOSManual ? (
                  <>
                    <Share className="w-3.5 h-3.5" />
                    How to
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Install
                  </>
                )}
              </button>
              <button
                onClick={dismiss}
                className="p-2 text-slate-500 hover:text-slate-300 rounded-xl hover:bg-slate-800/60 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── iOS Guide ── */}
          <AnimatePresence>
            {showIOSGuide && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-1 border-t border-slate-800/80">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Add to Home Screen
                  </p>

                  <div className="space-y-3">
                    {/* Step 1 */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-indigo-400 font-bold text-xs">1</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Tap the{' '}
                          <span className="inline-flex items-center gap-0.5 text-indigo-300 font-semibold">
                            <Share className="w-3 h-3" /> Share
                          </span>{' '}
                          button at the bottom of your Safari browser bar.
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          ⚠️ This only works in <strong>Safari</strong> — not Chrome or Firefox on iOS.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-purple-400 font-bold text-xs">2</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed flex-1">
                        Scroll down in the share sheet and tap{' '}
                        <span className="inline-flex items-center gap-0.5 text-purple-300 font-semibold">
                          <Plus className="w-3 h-3" /> Add to Home Screen
                        </span>.
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-emerald-400 font-bold text-xs">3</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed flex-1">
                        Tap <strong className="text-white">Add</strong> in the top-right corner. GhostChat will
                        appear on your Home Screen like a native app.
                      </p>
                    </div>
                  </div>

                  {/* iOS Safari indicator arrow */}
                  <div className="flex items-center justify-center mt-3 text-slate-500 text-[11px] gap-1">
                    <ChevronUp className="w-3 h-3 animate-bounce" />
                    Share button is at the bottom of Safari
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
