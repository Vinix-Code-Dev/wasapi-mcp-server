# syntax=docker/dockerfile:1

# --- builder -------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# Install production-only deps in a clean tree for the runtime stage.
RUN npm ci --omit=dev

# --- runtime -------------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3000

# Default to remote OAuth serve mode. Required env: OAUTH_ISSUER_URL,
# MCP_PUBLIC_URL, WASAPI_BASE_URL, REDIS_URL, TOKEN_HASH_SECRET,
# KEY_ENCRYPTION_SECRET, GRANT_EXCHANGE_SECRET (see `node dist/index.js --help`).
CMD ["node", "dist/index.js", "serve"]
