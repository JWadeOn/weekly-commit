#!/bin/sh
set -e
export PORT="${PORT:-3000}"
echo "Host app listening on port $PORT"
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
