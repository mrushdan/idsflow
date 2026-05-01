# syntax=docker/dockerfile:1

# ---------- Stage 1: build the frontend ----------
FROM node:20-bookworm-slim AS frontend-build
WORKDIR /app/frontend

# Install deps first for better layer caching.
# We use `npm install` rather than `npm ci` because the Lovable-generated
# package-lock.json is out of sync with package.json (missing transitive
# entries for vitest's deps). `npm install` reconciles them; `npm ci` would
# fail. We accept slightly looser version pinning in exchange for builds
# that don't break on lockfile drift.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install --no-audit --no-fund

# Build
COPY frontend/ ./
RUN npm run build
# Output is at /app/backend/static (vite.config.ts: outDir = '../backend/static')

# ---------- Stage 2: Python runtime ----------
FROM python:3.12-slim-bookworm AS runtime

# Ghostscript will go here in Phase 5 for re-PDF rasterization.
# Skipping for Phase 1 to keep the image small.
# RUN apt-get update && apt-get install -y --no-install-recommends ghostscript && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
# Pull in the built frontend from stage 1
COPY --from=frontend-build /app/backend/static ./static

ENV PORT=5555
EXPOSE 5555

CMD ["sh", "-c", "gunicorn app:app -b 0.0.0.0:$PORT --workers 2 --timeout 120"]
