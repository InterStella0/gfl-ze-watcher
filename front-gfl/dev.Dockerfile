FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json .

RUN npm ci

ARG BUILD_ENV=development
ARG NEXT_PUBLIC_DISCORD_CLIENT_ID=""
ARG NEXT_PUBLIC_DISCORD_REDIRECT_URI=""

RUN printf "Building in environment: $BUILD_ENV\n"

COPY . .

RUN echo "NEXT_PUBLIC_DISCORD_CLIENT_ID=${NEXT_PUBLIC_DISCORD_CLIENT_ID}" > .env \
 && echo "NEXT_PUBLIC_DISCORD_REDIRECT_URI=${NEXT_PUBLIC_DISCORD_REDIRECT_URI}" >> .env

EXPOSE 5173

RUN apk add --no-cache curl

CMD ["npm", "run", "dev", "--", "-p", "5173"]