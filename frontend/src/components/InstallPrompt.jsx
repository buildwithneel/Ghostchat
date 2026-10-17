import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share, Plus, Download, Smartphone, ChevronUp, CheckCircle2 } from 'lucide-react';

// ── Utility: detect platform ─────────────────────────────────────────────────
export function getPlatform() {
  if (typeof window === 'undefined') {
    return { isIOS: false, isAndroid: false, isSafari: false, isChrome: false };
  }
  const ua = navigator.userAgent;
  const isIOS =
    (/iphone|ipad|ipod/i.test(ua) && !window.MSStream) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  const isSamsungBrowser = /samsungbrowser/i.test(ua);
  const isChrome = /chrome|crios/i.test(ua) && !/edg/i.test(ua);
  const isSafari =
    (/^((?!chrome|android).)*safari/i.test(ua) || /version\/[\d.]+.*safari/i.test(ua)) && !isChrome;

  return { isIOS, isAndroid, isSamsungBrowser, isChrome, isSafari };
}

export function isRunningStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState(() => getPlatform());

  const syncDeferredPrompt = useCallback(() => {
    if (typeof window !== 'undefined' && window.deferredInstallPrompt) {
      setDeferredPrompt(window.deferredInstallPrompt);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setPlatform(getPlatform());

    // 1. If already running as installed PWA, do not show
    if (isRunningStandalone()) {
      setIsInstalled(true);
      return;
    }

    // 2. Check early captured beforeinstallprompt
    syncDeferredPrompt();

    // 3. Check dismissal cooldown (unless opened manually)
    let isDismissed = false;
    try {
      const ts = localStorage.getItem('ghostchat_pwa_dismissed');
      if (ts && Date.now() - parseInt(ts, 10) < 3 * 24 * 60 * 60 * 1000) {
        isDismissed = true;
      }
    } catch {}

    // Delay showing banner slightly so it doesn't interrupt page load
    const timer = setTimeout(() => {
      if (isDismissed) return;

      const plat = getPlatform();
      if (plat.isIOS) {
        setShow(true);
      } else if (syncDeferredPrompt() || !plat.isIOS) {
        setShow(true);
      }
    }, 2500);

    // 4. Listen for beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      window.deferredInstallPrompt = e;
      setDeferredPrompt(e);
      if (!isDismissed) {
        setShow(true);
      }
    };

    const handlePromptAvailable = () => {
      syncDeferredPrompt();
      if (!isDismissed) {
        setShow(true);
      }
    };

    // 5. Listen for manual open request (from Settings)
    const handleManualOpen = () => {
      syncDeferredPrompt();
      const plat = getPlatform();
      if (plat.isIOS) {
        setShowIOSGuide(true);
      }
      setShow(true);
    };

    // 6. Listen for successful install
    const handleInstalled = () => {
      setIsInstalled(true);
      setShow(false);
      setDeferredPrompt(null);
      window.deferredInstallPrompt = null;
      try {
        localStorage.setItem('ghostchat_pwa_installed', 'true');
      } catch {}
    };

    // 7. Listen for display-mode change
    const mediaMatcher = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e) => {
      if (e.matches) {
        handleInstalled();
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('pwa-open-install', handleManualOpen);
    window.addEventListener('appinstalled', handleInstalled);
    if (mediaMatcher.addEventListener) {
      mediaMatcher.addEventListener('change', handleDisplayModeChange);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('pwa-open-install', handleManualOpen);
      window.removeEventListener('appinstalled', handleInstalled);
      if (mediaMatcher.removeEventListener) {
        mediaMatcher.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, [syncDeferredPrompt]);

  const dismiss = () => {
    setShow(false);
    setShowIOSGuide(false);
    try {
      localStorage.setItem('ghostchat_pwa_dismissed', Date.now().toString());
    } catch {}
  };

  const handleInstall = async () => {
    const promptEvent = deferredPrompt || window.deferredInstallPrompt;

    if (promptEvent) {
      // Android / Desktop Chrome: Trigger native browser install dialog
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setShow(false);
          setDeferredPrompt(null);
          window.deferredInstallPrompt = null;
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else if (platform.isIOS) {
      // iOS: Toggle visual guide
      setShowIOSGuide((prev) => !prev);
    } else {
      // Fallback for browsers that don't support beforeinstallprompt
      setShowIOSGuide((prev) => !prev);
    }
  };

  if (!show || isInstalled) return null;

  const isIOSManual = platform.isIOS && !deferredPrompt;

  return (
    <AnimatePresence>
      <motion.div
        key="install-prompt-banner"
        initial={{ opacity: 0, y: 70 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 70 }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="max-w-lg mx-auto bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden text-slate-900 dark:text-slate-100">
          
          {/* ── Main Banner ── */}
          <div className="flex items-center gap-3 p-3.5 sm:p-4">
            {/* App Icon */}
            <div className="shrink-0 w-12 h-12 rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700/60 p-0.5 bg-indigo-500/10">
              <img src="/icon-192.png" alt="GhostChat" className="w-full h-full object-cover rounded-xl" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                Install GhostChat App
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                {isIOSManual
                  ? 'Add to Home Screen for full-screen offline chat.'
                  : 'Fast launch, offline capability & native app experience.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold rounded-xl shadow-md active:scale-95 transition-all"
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
                type="button"
                onClick={dismiss}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── iOS Step-by-Step Guide ── */}
          <AnimatePresence>
            {showIOSGuide && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800"
              >
                <div className="px-4 py-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Add to Home Screen (Safari)
                    </p>
                    <span className="text-[10px] text-indigo-500 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full">
                      iOS Safari Guide
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Step 1 */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">1</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
                        Tap the{' '}
                        <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold px-1 py-0.5 bg-indigo-500/10 rounded">
                          <Share className="w-3 h-3" /> Share
                        </span>{' '}
                        button at the bottom of Safari.
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-purple-600 dark:text-purple-400 font-bold text-xs">2</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
                        Scroll down and tap{' '}
                        <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold px-1 py-0.5 bg-purple-500/10 rounded">
                          <Plus className="w-3 h-3" /> Add to Home Screen
                        </span>.
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">3</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
                        Tap <strong className="text-slate-900 dark:text-white font-bold">Add</strong> in the top-right corner to finish.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center pt-1 text-slate-400 dark:text-slate-500 text-[11px] gap-1">
                    <ChevronUp className="w-3 h-3 animate-bounce" />
                    Share icon is in Safari&apos;s navigation bar
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
