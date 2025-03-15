FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json .

RUN npm ci

ARG BUILD_ENV=development

RUN printf "Building in environment: $BUILD_ENV\n"

COPY . .

EXPOSE 5173

RUN apk add --no-cache curl

CMD ["npm", "run", "dev", "--", "--host"]