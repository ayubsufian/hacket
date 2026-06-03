# =============================================================================
# HackET Backend — Production Dockerfile
# =============================================================================

FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/database/package*.json ./packages/database/

# Install dependencies (includes devDependencies for prisma generate)
RUN npm ci

# Copy prisma schema and generate client
COPY apps/backend/prisma ./apps/backend/prisma/
RUN npm run db:generate --workspace=apps/backend

# Copy source code
COPY apps/backend/src ./apps/backend/src/
COPY packages/database ./packages/database/

# Remove devDependencies to reduce image size (optional)
RUN npm prune --production

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["npm", "start"]
