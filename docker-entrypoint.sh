#!/bin/sh
set -e

# Inject runtime OIDC config into index.html if env vars are set
if [ -n "$OIDC_ISSUER" ] && [ -n "$OIDC_CLIENT_ID" ]; then
  CONFIG_SCRIPT="<script>window.__OIDC_CONFIG__={issuer_url:\"$OIDC_ISSUER\",client_id:\"$OIDC_CLIENT_ID\"}</script>"
  sed -i "s|</head>|${CONFIG_SCRIPT}</head>|" /usr/share/nginx/html/index.html
  echo "OIDC config injected: issuer=$OIDC_ISSUER client_id=$OIDC_CLIENT_ID"
fi

# Render CSP with the actual OIDC issuer origin so connect-src / frame-src can
# be tight (specific host) instead of broad `https:`. Falls back to `https:` if
# OIDC_ISSUER is not set, keeping the build usable without runtime config.
if [ -n "$OIDC_ISSUER" ]; then
  # Strip path and trailing slash to get just `scheme://host[:port]`.
  OIDC_ORIGIN=$(echo "$OIDC_ISSUER" | sed -E 's|^([a-z]+://[^/]+).*|\1|')
  CSP_REMOTE="$OIDC_ORIGIN"
else
  CSP_REMOTE="https:"
fi
export CSP_REMOTE

# Substitute placeholders in nginx config template.
envsubst '${CSP_REMOTE}' < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf
echo "CSP connect-src/frame-src remote: $CSP_REMOTE"

exec "$@"
