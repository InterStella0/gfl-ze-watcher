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

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY nginx.base.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]