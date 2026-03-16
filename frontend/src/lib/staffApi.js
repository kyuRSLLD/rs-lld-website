/**
 * staffApi.js — Shared fetch wrapper for staff portal API calls.
 *
 * Automatically adds the Authorization: Bearer <token> header from localStorage
 * so that cross-domain requests (Bluehost frontend → Railway backend) work
 * without relying on session cookies (which are domain-restricted).
 */

const API_BASE = import.meta.env.VITE_API_URL || ''

export const STAFF_TOKEN_KEY = 'staff_jwt_token'

/** Get the stored JWT token */
export function getStaffToken() {
  return localStorage.getItem(STAFF_TOKEN_KEY)
}

/** Save the JWT token after login */
export function saveStaffToken(token) {
  if (token) localStorage.setItem(STAFF_TOKEN_KEY, token)
}

/** Remove the JWT token on logout */
export function clearStaffToken() {
  localStorage.removeItem(STAFF_TOKEN_KEY)
}

/**
 * Drop-in replacement for fetch() that automatically adds:
 *   - Authorization: Bearer <token>  (JWT from localStorage)
 *   - credentials: 'include'         (session cookie fallback)
 *
 * Accepts either:
 *   - A relative path:  staffFetch('/api/staff/orders')
 *   - A full URL:       staffFetch('https://...railway.app/api/staff/orders')
 *   - An API_BASE URL:  staffFetch(`${API_BASE}/api/staff/orders`)
 *
 * In all cases, the request is sent to API_BASE + relative path.
 */
export function staffFetch(pathOrUrl, options = {}) {
  const token = getStaffToken()
  const headers = { ...(options.headers || {}) }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Normalize the URL: strip API_BASE prefix if present, then prepend it
  let path = pathOrUrl
  if (API_BASE && path.startsWith(API_BASE)) {
    path = path.slice(API_BASE.length)
  }
  // If it's still a full URL (different base), use it as-is
  const fullUrl = path.startsWith('http') ? path : `${API_BASE}${path}`

  return fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include',
  })
}
