# 1. Stage: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm install

# 2. Stage: Builder (Prisma Generate + Next.js Standalone Build)
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ARG GIT_COMMIT_SHA=production
ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA}

RUN npx prisma generate
RUN npm run build

# 3. Stage: Production Runner
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl git bash
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/housemate.db"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Persistent SQLite volume folder
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Copy standalone build output, static files, and prisma schema/seed
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

USER nextjs

EXPOSE 3000

# Push SQLite schema to persistent /app/data/housemate.db and start Next.js standalone server on port 3000
CMD ["sh", "-c", "node ./node_modules/prisma/build/index.js db push --skip-generate && node server.js"]
