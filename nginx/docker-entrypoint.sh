#!/bin/sh
set -e

# Set default values if environment variables are not provided
export BACKEND_HOST=${BACKEND_HOST:-backend}
export FRONTEND_HOST=${FRONTEND_HOST:-frontend}
export QGIS_HOST=${QGIS_HOST:-qgis-server}

echo "Using upstream hosts:"
echo "  Backend: ${BACKEND_HOST}:3000"
echo "  Frontend: ${FRONTEND_HOST}:3000"
echo "  QGIS: ${QGIS_HOST}:9993"

# Substitute environment variables in nginx config
envsubst '${BACKEND_HOST} ${FRONTEND_HOST} ${QGIS_HOST}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

# Test nginx configuration
nginx -t

# Start nginx
exec nginx -g "daemon off;"