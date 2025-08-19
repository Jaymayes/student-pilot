# Multi-stage Dockerfile for ScholarLink Billing Service
FROM node:18-alpine AS base

# Install security updates and dependencies
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    tini \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 65532 -S nonroot && \
    adduser -u 65532 -S nonroot -G nonroot

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
FROM base AS dependencies
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Development stage
FROM base AS development
COPY . .
RUN npm ci
RUN npx prisma generate
EXPOSE 3000
USER nonroot
CMD ["dumb-init", "npm", "run", "dev"]

# Build stage
FROM base AS build
COPY . .
RUN npm ci
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    tini \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 65532 -S nonroot && \
    adduser -u 65532 -S nonroot -G nonroot

WORKDIR /app

# Copy production dependencies and built application
COPY --from=dependencies --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=build --chown=nonroot:nonroot /app/dist ./dist
COPY --from=build --chown=nonroot:nonroot /app/package*.json ./
COPY --from=build --chown=nonroot:nonroot /app/prisma ./prisma

# Set security-focused environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use non-root user
USER nonroot

# Expose port
EXPOSE 3000

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["tini", "--"]

# Start application
CMD ["dumb-init", "node", "dist/index.js"]

# Labels for metadata
LABEL org.opencontainers.image.title="ScholarLink Billing Service"
LABEL org.opencontainers.image.description="Credit-based billing system with Stripe integration"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="ScholarLink"
LABEL org.opencontainers.image.licenses="Proprietary"