FROM node:20-alpine
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

# Generate Prisma client
RUN cd apps/backend && npx prisma generate

# Build shared package (CommonJS output)
RUN cd packages/shared && npx tsc

# Build backend
RUN cd apps/backend && npx nest build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "apps/backend/dist/main.js"]
