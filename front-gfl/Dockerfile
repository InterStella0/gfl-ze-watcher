FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json .

RUN npm ci

ARG BUILD_ENV=development

RUN printf "Building in environment: $BUILD_ENV\n"

COPY .env.${BUILD_ENV} .env

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY nginx.base.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]