# LLD Restaurant Supply — Deployment Architecture

## ⚠️ PERMANENT RULES — DO NOT CHANGE

### Frontend → Cloudflare Pages ONLY
- **Live URL**: https://lldrestaurantsupply.com
- **Pages project**: `lld-restaurant-supply` on Cloudflare Pages
- **Pages URL**: https://lld-restaurant-supply.pages.dev
- **Deploy command**: Run from `frontend/` directory:
  ```
  npm run build
  CLOUDFLARE_API_TOKEN=<token> npx wrangler pages deploy dist --project-name lld-restaurant-supply --commit-dirty=true
  ```
- The Railway backend **must NEVER serve frontend static files**
- The `backend/src/static/` folder must remain **empty** (no HTML, JS, CSS, or assets)
- `backend/src/main.py` has `static_folder=None` — do not change this

### Backend → Railway ONLY
- **API URL**: https://rs-lld-website-production.up.railway.app
- **Deploy**: Auto-deploys on `git push origin main` (Railway watches the `backend/` directory)
- The Railway backend serves **only `/api/*` routes** — no HTML pages, no SPA routing
- The frontend calls the backend via `VITE_API_URL` environment variable

### DNS (Cloudflare DNS — zone: lldrestaurantsupply.com)
| Record | Name | Points To |
|--------|------|-----------|
| CNAME | `lldrestaurantsupply.com` | `lld-restaurant-supply.pages.dev` (proxied) |
| CNAME | `www.lldrestaurantsupply.com` | `lld-restaurant-supply.pages.dev` (proxied) |

### Deploy Checklist
1. Make frontend changes in `frontend/src/`
2. `cd frontend && npm run build`
3. Deploy to Cloudflare Pages with wrangler (see command above)
4. **Do NOT copy `frontend/dist/` into `backend/src/static/`**
5. Backend changes auto-deploy to Railway on git push

### Why This Matters
Previously the domain was accidentally pointing to Railway which was serving a stale copy of the frontend from `backend/src/static/`. This caused frontend updates to not appear on the live site even after Cloudflare Pages was updated. This architecture ensures:
- Frontend updates are instant (Cloudflare Pages CDN)
- Backend API updates are independent
- No stale static files in the backend
