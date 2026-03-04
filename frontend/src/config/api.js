// API base URL - set VITE_API_URL environment variable for production
// In development: empty string (relative URLs work when served by Flask)
// In production: https://rs-lld-website-production.up.railway.app
const API_BASE = import.meta.env.VITE_API_URL || '';

export default API_BASE;

// Helper to build full API URL
export const apiUrl = (path) => `${API_BASE}${path}`;
