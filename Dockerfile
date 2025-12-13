# =============================
# Stage 0: Base With Bun & Turbo
# =============================
FROM oven/bun:1.2.22 AS base

# Install turbo globally
RUN bun add -g turbo

# =============================
# Stage 1: Builder (Pruned Repo)
# =============================
FROM base AS builder
WORKDIR /app

# Copy the entire monorepo into the container (context should be the root of the repo)
COPY . .

# Ensure Bun's dependencies are installed
RUN bun install

# Prune for API workspace (Monorepo → Pruned)
RUN turbo prune @midday/api --docker

# Move into pruned workspace
WORKDIR /app/out/full

# Install deps for build
RUN bun install

# Build engine inside the pruned workspace
RUN cd apps/engine && bun run build

# =============================
# Stage 2: Installer (Production)
# =============================
FROM base AS installer
WORKDIR /app

# Copy the pruned dependencies from the builder stage
COPY --from=builder /app/out/json/ .

# Install production dependencies
RUN bun install

# Copy source code from pruned output
COPY --from=builder /app/out/full/ .

# Copy built engine dist from pruned output
COPY --from=builder /app/out/full/apps/engine/dist ./apps/engine/dist

# =============================
# Stage 3: Runner
# =============================
FROM installer AS runner

WORKDIR /app/apps/api

ENV NODE_ENV=production
EXPOSE 8080

# Start the app using Bun
CMD ["bun", "run", "src/index.ts"]
