// Dynamic Backend URL for Local Dev & Live Production (Vercel + Render)
const getBackendUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    // If running in production on HTTPS without explicit env var, default to live backend to prevent Mixed Content
    if (window.location.protocol === 'https:' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      return 'https://ghostchat-backend.onrender.com';
    }
  }
  return 'http://localhost:3000';
};

export const BACKEND_URL = getBackendUrl();

export const API_ROUTES = {
  upload: `${BACKEND_URL}/api/files/upload`,
  download: (fileId) => `${BACKEND_URL}/api/files/download/${fileId}`,
  view: (fileId, token) => `${BACKEND_URL}/api/files/view/${fileId}${token ? `?token=${encodeURIComponent(token)}` : ''}`,
  info: (fileId) => `${BACKEND_URL}/api/files/info/${fileId}`,
};
