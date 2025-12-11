#!/bin/sh
set -e

# Substitute only API_URL in the nginx config template
# This preserves nginx's own variables like $uri, $host, etc.
envsubst '${API_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
