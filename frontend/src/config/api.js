// API base URL - set VITE_API_URL environment variable for production
// In development, uses empty string (relative URLs work via Vite proxy or same-origin Flask)
// In production, set VITE_API_URL=https://your-railway-app.up.railway.app
const API_BASE = import.meta.env.VITE_API_URL || '';

export default API_BASE;
