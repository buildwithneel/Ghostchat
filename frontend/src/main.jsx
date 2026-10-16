import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { SocketProvider } from './hooks/useSocket.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SocketProvider>
        <App />
      </SocketProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

// ─── Service Worker Registration ─────────────────────────────────────────────
// We register AFTER the app is interactive so the SW install bandwidth
// doesn't compete with the initial JS/CSS download.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registered. Scope:', registration.scope);

        // Check for SW updates every time the page gains focus
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // A new SW is waiting — tell it to activate immediately.
              // The page will reload once the new SW takes control.
              console.log('[PWA] New version available. Activating...');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((err) => {
        // Don't throw — PWA is an enhancement, not a requirement
        console.warn('[PWA] Service Worker registration failed:', err);
      });

    // When the new SW takes control, reload once for a clean slate
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}
