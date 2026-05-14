# Multi-stage build for Next.js app
# Builder stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Skip Playwright browser download during npm install
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY . .

# Build the application (set flag to skip Cloudflare initialization)
ENV DOCKER_BUILD=true
RUN npm run build

# Production stage
FROM node:24-alpine AS runner

WORKDIR /app

# Create non-root user (single RUN to save a layer)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

CMD ["node", "server.js"]
