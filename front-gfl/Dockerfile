# Stage 1: Install dependencies (cached layer)
FROM oven/bun:alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun ci
# Stage 2: Runtime with all dependencies
FROM oven/bun:alpine AS builder
WORKDIR /app

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

ARG BUILD_ENV=production
ARG DISCORD_CLIENT_ID=""
ARG NEXT_PUBLIC_DISCORD_REDIRECT_URI=""
ARG DISCORD_CLIENT_SECRET=""
ARG NEXT_PUBLIC_DOMAIN=""
ARG NEXTAUTH_SECRET=""
ARG STEAM_SECRET=""
ARG NEXTAUTH_URL=""
ARG FRONTEND_URL=""
ARG ANALYZE=""

# Create environment file
RUN cat <<EOF > .env.production
DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
NEXTAUTH_URL=${NEXTAUTH_URL}
DISCORD_CLIENT_SECRET=${DISCORD_CLIENT_SECRET}
NEXT_PUBLIC_DISCORD_REDIRECT_URI=${NEXT_PUBLIC_DISCORD_REDIRECT_URI}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
STEAM_SECRET=${STEAM_SECRET}
NEXT_PUBLIC_DOMAIN=${NEXT_PUBLIC_DOMAIN}
FRONTEND_URL=${FRONTEND_URL}
ANALYZE=${ANALYZE}
EOF

RUN chmod +x ./entrypoint.sh

EXPOSE 3000

RUN bun run build

ENTRYPOINT ["./entrypoint.sh"]