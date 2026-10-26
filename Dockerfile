# Faceless Autopilot - Production Dockerfile with Node.js and FFmpeg
FROM node:22-bullseye-slim AS base

# Install FFmpeg and essential media libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build Vite frontend bundle
RUN npm run build

# Create persistent data and storage directories
RUN mkdir -p /app/data/storage

# Environment defaults
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/status || exit 1

# Start the full-stack server
CMD ["npm", "start"]
