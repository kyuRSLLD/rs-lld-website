# Railway sets the build context to the backend/ directory (dockerfilePath = "backend/Dockerfile")
# So all COPY paths are relative to backend/ — no "backend/" prefix needed.

FROM python:3.11-slim

WORKDIR /app

# Install poppler-utils for pdf2image (Bill Analyzer feature)
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source (includes src/static/ with pre-built frontend)
COPY . .

# Create database directory
RUN mkdir -p src/database

# Start the app — gunicorn is used in production via railway.toml startCommand
CMD python src/main.py
