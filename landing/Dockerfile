# Multi-stage Dockerfile for the BoVerse landing/build Next.js app.
# Produces a small standalone runtime image suitable for Fly.io.

FROM node:20-alpine AS base
WORKDIR /app

# ── deps stage ────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── build stage ───────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Pin Turbopack root via env so the build agrees with next.config.ts.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runtime stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Bind to all interfaces so Render's edge proxy can reach the container.
# Next.js standalone defaults to 127.0.0.1 in some versions — that's a 502.
ENV HOSTNAME=0.0.0.0

# Non-root user for safety.
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Next.js standalone output is the recommended Docker shape.
# (next.config.ts must include output: 'standalone' for this to work.)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
