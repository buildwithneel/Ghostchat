// Dynamic Backend URL for Local Dev & Live Production (Vercel + Render)
export const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
).replace(/\/+$/, '');

export const API_ROUTES = {
  upload: `${BACKEND_URL}/api/files/upload`,
  download: (fileId) => `${BACKEND_URL}/api/files/download/${fileId}`,
  view: (fileId, token) => `${BACKEND_URL}/api/files/view/${fileId}${token ? `?token=${encodeURIComponent(token)}` : ''}`,
  info: (fileId) => `${BACKEND_URL}/api/files/info/${fileId}`,
};
