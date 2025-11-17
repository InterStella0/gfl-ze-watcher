FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG BUILD_ENV=production
ARG NEXT_PUBLIC_DISCORD_CLIENT_ID=""
ARG NEXT_PUBLIC_DISCORD_REDIRECT_URI=""

RUN echo "NEXT_PUBLIC_DISCORD_CLIENT_ID=${NEXT_PUBLIC_DISCORD_CLIENT_ID}" > .env.production \
 && echo "NEXT_PUBLIC_DISCORD_REDIRECT_URI=${NEXT_PUBLIC_DISCORD_REDIRECT_URI}" >> .env.production\
 && echo "NEXT_PUBLIC_DOMAIN=${NEXT_PUBLIC_DOMAIN}" >> .env.production


RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/.env.production ./.env

EXPOSE 3000

CMD ["npm", "start"]