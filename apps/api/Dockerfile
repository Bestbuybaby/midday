# Midday API Dockerfile
# Optimized for Fly.io GitHub deployment
# Deploy from repository ROOT with Dockerfile path: apps/api/Dockerfile

# Base image with Bun
FROM oven/bun:1.2.22 AS base

# Install turbo CLI globally using Bun
FROM base AS turbo-cli
RUN bun add -g turbo

# Builder stage - prune the monorepo for just the API
FROM turbo-cli AS builder
WORKDIR /app

# Copy all files from the repository root
COPY . .

# Use turbo CLI to prune workspaces - creates optimized /out directory
RUN turbo prune @midday/api --docker

# Installer stage - install dependencies and build
FROM base AS installer
WORKDIR /app

# Install build dependencies for native modules (canvas, etc.)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy pruned package.json files first (for better caching)
COPY --from=builder /app/out/json/ .

# Install dependencies
RUN bun install

# Copy the full pruned source code
COPY --from=builder /app/out/full/ .

# Build the engine package (required by API)
# This creates the dist folder that the API imports
RUN cd apps/engine && bun run build || echo "Engine build skipped or not needed"

# Runner stage
FROM installer AS runner

# Set the API directory as working directory
WORKDIR /app/apps/api

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port (Fly.io expects 8080 by default)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the API directly with Bun
CMD ["bun", "run", "src/index.ts"]