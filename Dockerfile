# =============================
# Stage 0: Base with Bun
# =============================
FROM oven/bun:1.2.22 AS base

# Install turbo globally
RUN bun add -g turbo


# =============================
# Stage 1: Builder
# =============================
FROM base AS builder
WORKDIR /app

# Copy full repo
COPY . .

# Prune API workspace for Docker
RUN turbo prune @midday/api --docker

# Now inside pruned output
WORKDIR /app/out/full

# Install deps needed for builds
RUN bun install

# Build ENGINE before API
RUN cd apps/engine && bun run build

# Build API (if needed)
# RUN cd apps/api && bun run build


# =============================
# Stage 2: Installer
# =============================
FROM base AS installer
WORKDIR /app

# Copy pruned JSON for install
COPY --from=builder /app/out/json/ .

# Install API deps
RUN bun install

# Copy pruned FULL repo
COPY --from=builder /app/out/full/ .

# Copy ENGINE dist output from builder
COPY --from=builder /app/out/full/apps/engine/dist ./apps/engine/dist


# =============================
# Stage 3: Runner
# =============================
FROM installer AS runner

WORKDIR /app/apps/api

ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
