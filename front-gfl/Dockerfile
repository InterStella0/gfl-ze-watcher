FROM oven/bun:alpine AS builder
WORKDIR /app

COPY package*.json bun.lock ./
RUN bun ci

COPY . .

ARG BUILD_ENV=production
ARG DISCORD_CLIENT_ID=""
ARG NEXT_PUBLIC_DISCORD_REDIRECT_URI=""
ARG DISCORD_CLIENT_SECRET=""
ARG NEXT_PUBLIC_DOMAIN=""
ARG NEXTAUTH_SECRET=""
ARG STEAM_SECRET=""
ARG NEXTAUTH_URL=""

RUN cat <<EOF > .env.production
DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
NEXTAUTH_URL=${NEXTAUTH_URL}
DISCORD_CLIENT_SECRET=${DISCORD_CLIENT_SECRET}
NEXT_PUBLIC_DISCORD_REDIRECT_URI=${NEXT_PUBLIC_DISCORD_REDIRECT_URI}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
STEAM_SECRET=${STEAM_SECRET}
NEXT_PUBLIC_DOMAIN=${NEXT_PUBLIC_DOMAIN}
EOF

RUN bun run build

FROM oven/bun:alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/.env.production ./.env.production

EXPOSE 3000

CMD ["bun", "start"]