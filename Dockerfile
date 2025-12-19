# Midday API Dockerfile
# ======================
# Located at repository root for Fly.io GitHub integration
# Build context is the repository root (for monorepo access)

# Base image with Bun
FROM oven/bun:1.2.22 AS base

# Install turbo CLI globally using Bun
FROM base AS turbo-cli
RUN bun add -g turbo

# Builder stage - prune the monorepo for just the API
FROM turbo-cli AS builder
WORKDIR /app

# Copy all files from the repository root (build context)
COPY . .

# Use turbo CLI to prune workspaces - creates optimized /out directory
# This extracts only the packages needed for @midday/api
RUN turbo prune @midday/api --docker

# Installer stage - install dependencies and build
FROM base AS installer
WORKDIR /app

# Install build dependencies for native modules (canvas, sharp, etc.)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pruned package.json files first (for better Docker layer caching)
COPY --from=builder /app/out/json/ .

# Install dependencies
RUN bun install --frozen-lockfile || bun install

# Copy the full pruned source code
COPY --from=builder /app/out/full/ .

# Build the engine package if it exists (required by API for type imports)
RUN if [ -d "apps/engine" ]; then cd apps/engine && bun run build; fi

# Runner stage
FROM installer AS runner

# Set the API directory as working directory
WORKDIR /app/apps/api

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port (Fly.io uses 8080 by default)
EXPOSE 8080

# Run the API directly with Bun
CMD ["bun", "run", "src/index.ts"]