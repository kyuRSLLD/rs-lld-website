#!/bin/bash
# ============================================================
# LLD Restaurant Supply — Frontend Deploy Script
# RULE: Frontend goes to Cloudflare Pages ONLY. Never Railway.
# ============================================================

set -e

echo "🏗️  Building frontend..."
cd "$(dirname "$0")/frontend"
npm run build

# Safety check: make sure backend/src/static is empty
STATIC_DIR="../backend/src/static"
if [ "$(ls -A $STATIC_DIR 2>/dev/null)" ]; then
  echo "❌ ERROR: backend/src/static/ is not empty!"
  echo "   The Railway backend must NEVER serve frontend files."
  echo "   Remove all files from backend/src/static/ before deploying."
  exit 1
fi

echo "🚀 Deploying to Cloudflare Pages..."
CLOUDFLARE_API_TOKEN="cfut_Bgk6Oe2ZTrR83Ot7xpj6Avwhes7alhNFaItCsm2C5ec8b0b2" \
  npx wrangler pages deploy dist \
  --project-name lld-restaurant-supply \
  --commit-dirty=true

echo "✅ Frontend deployed to Cloudflare Pages!"
echo "   Live at: https://lldrestaurantsupply.com"
echo "   (Hard refresh with Ctrl+Shift+R if you see old version)"
