#!/bin/bash

[[ $DEBUG == "1" ]] && env

set -e

cat > "$HOME/.pgpass" <<EOF
${DB_HOST}:${DB_PORT}:${DB_NAME}:${DB_USERNAME}:${DB_PASSWORD}
EOF
chmod 600 "$HOME/.pgpass"

cat > "$HOME/.pg_service.conf" <<EOF
[cs2_website]
host=${DB_HOST}
port=${DB_PORT}
dbname=${DB_NAME}
user=${DB_USERNAME}
EOF

# Set service file path
export PGSERVICEFILE="$HOME/.pg_service.conf"

exec /usr/bin/xvfb-run --auto-servernum --server-num=5 /usr/bin/spawn-fcgi -p 5555 -n -d /home/qgis -- /usr/lib/cgi-bin/qgis_mapserv.fcgi