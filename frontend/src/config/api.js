// API base URL — always use relative URLs so the app works on any domain
// (Railway, lldrestaurantsupply.com, or any future domain)
const API_BASE = '';

export default API_BASE;

// Helper to build full API URL
export const apiUrl = (path) => `${API_BASE}${path}`;
