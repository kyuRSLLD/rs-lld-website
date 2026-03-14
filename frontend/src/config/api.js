// API base URL — uses VITE_API_URL env var if set, otherwise defaults to Railway backend.
// On Railway: VITE_API_URL="" (empty = relative URLs, backend is co-located)
// On Bluehost/static: VITE_API_URL not set, so falls back to Railway URL
const API_BASE = import.meta.env.VITE_API_URL ?? 'https://rs-lld-website-production.up.railway.app';

export default API_BASE;

// Helper to build full API URL
export const apiUrl = (path) => `${API_BASE}${path}`;
