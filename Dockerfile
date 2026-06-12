# --- Build stage ---
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# --- Runtime stage ---
FROM node:22-slim

# yt-dlp + deno 설치 (deno: YouTube JS 챌린지 해결용)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates python3 python3-pip unzip && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/download/2026.06.09/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    pip3 install --no-cache-dir --break-system-packages youtube-transcript-api && \
    curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh && \
    apt-get purge -y curl unzip && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/dist/ ./dist/

EXPOSE 3000
CMD ["node", "--use-system-ca", "dist/remote.js"]
