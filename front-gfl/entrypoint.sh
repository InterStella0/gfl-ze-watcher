#!/bin/sh
set -e

while ! wget --spider -q http://backend:3000/health; do
    echo "Waiting for service to become healthy..."
    sleep 2
done

bun run generate

bun run start