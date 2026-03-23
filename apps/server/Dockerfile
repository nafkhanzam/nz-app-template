# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# Build the server
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY . .
WORKDIR /app/apps/server
RUN pnpm generate && pnpm build

# Production image
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app/apps/server

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copy necessary files
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/server/node_modules ./node_modules
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/apps/server/src/zenstack ./src/zenstack

# Give appuser write access to directories that need runtime writes
RUN chown -R appuser:nodejs ./src/zenstack && \
    chown -R appuser:nodejs /app/node_modules/.pnpm/@prisma+engines* || true

USER appuser

EXPOSE 3000
CMD ["node", "dist/main.js"]
