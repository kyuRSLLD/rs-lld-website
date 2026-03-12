# ── Stage 1: Build the React frontend ─────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /frontend

# Install pnpm
RUN npm install -g pnpm

# Install frontend dependencies
COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Copy frontend source
COPY frontend/ ./

# Build with production Railway API URL baked in
ARG VITE_API_URL=https://rs-lld-website-production.up.railway.app
ARG VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
RUN pnpm build

# ── Stage 2: Python backend ────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Install poppler-utils for pdf2image (Bill Analyzer feature)
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Copy built frontend into Flask static folder
COPY --from=frontend-builder /frontend/dist ./src/static/

# Create database directory
RUN mkdir -p src/database

# Start the app — gunicorn is used in production via railway.toml startCommand
CMD python src/main.py
