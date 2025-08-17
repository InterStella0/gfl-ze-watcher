FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json .

RUN npm ci

ARG BUILD_ENV=development
ARG VITE_DISCORD_CLIENT_ID=""
ARG VITE_DISCORD_REDIRECT_URI=""

RUN printf "Building in environment: $BUILD_ENV\n"

COPY . .

RUN echo "VITE_DISCORD_CLIENT_ID=${VITE_DISCORD_CLIENT_ID}" > .env \
 && echo "VITE_DISCORD_REDIRECT_URI=${VITE_DISCORD_REDIRECT_URI}" >> .env

EXPOSE 5173

RUN apk add --no-cache curl

CMD ["npm", "run", "dev", "--", "--host"]