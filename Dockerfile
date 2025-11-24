# =============================
# Stage 0: Base with Bun
# =============================
FROM oven/bun:1.2.21 AS base

# Install turbo globally
RUN bun add -g turbo

# =============================
# Stage 1: Builder
# =============================
FROM base AS builder
WORKDIR /app

# Copy everything from monorepo root
COPY . .

# Prune only the API workspace for Docker
RUN turbo prune @midday/api --docker

# Build engine workspace if not built
RUN cd apps/engine && bun run build

# =============================
# Stage 2: Installer
# =============================
FROM base AS installer
WORKDIR /app

# Install dependencies (from pruned JSON)
COPY --from=builder /app/out/json/ .
RUN bun install

# Copy full source code
COPY --from=builder /app/out/full/ .

# Copy prebuilt engine dist
COPY apps/engine/dist /app/apps/engine/dist

# =============================
# Stage 3: Runner
# =============================
FROM installer AS runner

WORKDIR /app/apps/api

ENV NODE_ENV=production
EXPOSE 3000

# Run Bun API
CMD ["bun", "run", "src/index.ts"]
