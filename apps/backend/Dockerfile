# Build stage
FROM node:20-alpine AS builder
RUN corepack enable pnpm

WORKDIR /app

# Copy workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/backend/ apps/backend/

# Generate Prisma client and build
RUN cd apps/backend && npx prisma generate && cd ../../packages/shared && npx tsc || true
RUN cd apps/backend && npx nest build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/package.json ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/main.js"]
