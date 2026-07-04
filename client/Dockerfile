# Build from the REPOSITORY ROOT (workspace + @taskflow/shared resolution):
#   docker build -f client/Dockerfile -t taskflow-client .
# syntax=docker/dockerfile:1

# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci

COPY shared ./shared
COPY client ./client
# NEXT_PUBLIC_* are inlined at build time.
ARG NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
RUN npm run build --workspace shared \
 && npm run build --workspace client

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/client/.next ./client/.next
COPY --from=build /app/client/public ./client/public
COPY --from=build /app/client/next.config.js ./client/next.config.js

WORKDIR /app/client
EXPOSE 3000
CMD ["npm", "run", "start"]
