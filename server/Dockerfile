# Build from the REPOSITORY ROOT so the npm workspace and @taskflow/shared
# resolve the same way they do locally:
#   docker build -f server/Dockerfile -t taskflow-server .
# syntax=docker/dockerfile:1

# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first (cached until a package.json/lock changes).
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci

# Copy sources and build shared → prisma client → server.
COPY shared ./shared
COPY server ./server
RUN npm run build --workspace shared \
 && npm run prisma:generate --workspace server \
 && npm run build --workspace server

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Prod dependencies only.
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci --omit=dev && npm cache clean --force

# Compiled output + prisma schema/migrations (for reference; migrations are
# applied by the separate `migrate` step, not on container boot).
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/prisma ./server/prisma

# Attachment storage volume (local driver default).
RUN mkdir -p /app/server/uploads
WORKDIR /app/server

EXPOSE 5000
# Readiness/liveness probe target: GET /health
CMD ["node", "dist/src/server.js"]
