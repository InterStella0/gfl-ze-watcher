#!/bin/bash
set -e

[[ $DEBUG == "1" ]] && env

# Setup PostgreSQL password file for www-data (QGIS runs as www-data)
cat > /var/www/.pgpass <<EOF
${DB_HOST}:${DB_PORT}:${DB_NAME}:${DB_USERNAME}:${DB_PASSWORD}
EOF
chmod 600 /var/www/.pgpass
chown www-data:www-data /var/www/.pgpass

# Setup PostgreSQL service file in standard system location
mkdir -p /etc/postgresql-common
cat > /etc/postgresql-common/pg_service.conf <<EOF
[cs2_website]
host=${DB_HOST}
port=${DB_PORT}
dbname=${DB_NAME}
user=${DB_USERNAME}
EOF

# Execute the default CMD (or any command passed)
exec "$@"
