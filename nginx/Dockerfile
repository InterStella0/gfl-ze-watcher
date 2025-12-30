FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY nginx.base.conf /etc/nginx/nginx.conf

CMD ["nginx", "-g", "daemon off;"]