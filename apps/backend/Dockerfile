# Backend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY shared/types/package*.json ./shared/types/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy package files and source
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY shared/types/ ./shared/types/
COPY apps/backend/ ./apps/backend/

# Install all dependencies
RUN npm ci

# Generate Prisma client
RUN cd apps/backend && npx prisma generate

# Build the application
RUN cd apps/backend && npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

# Copy built application
COPY --from=builder --chown=fastify:nodejs /app/apps/backend/dist ./dist
COPY --from=builder --chown=fastify:nodejs /app/apps/backend/package*.json ./
COPY --from=builder --chown=fastify:nodejs /app/apps/backend/prisma ./prisma
COPY --from=deps --chown=fastify:nodejs /app/apps/backend/node_modules ./node_modules

# Create uploads directory
RUN mkdir -p uploads && chown fastify:nodejs uploads

USER fastify

EXPOSE 3001

ENV PORT=3001
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "dist/server.js"]