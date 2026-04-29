#!/bin/sh
set -e

# Write runtime OIDC config to an external JS file. We can't inline the script
# in index.html — strict CSP (`script-src 'self'`) would reject it. Always
# write the file so index.html's <script src> tag never 404s; an empty config
# leaves window.__OIDC_CONFIG__ undefined and the SPA falls back to dev mode.
OIDC_CONFIG_FILE=/usr/share/nginx/html/oidc-config.js
if [ -n "$OIDC_ISSUER" ] && [ -n "$OIDC_CLIENT_ID" ]; then
  printf 'window.__OIDC_CONFIG__={issuer_url:"%s",client_id:"%s"};\n' \
    "$OIDC_ISSUER" "$OIDC_CLIENT_ID" > "$OIDC_CONFIG_FILE"
  echo "OIDC config written to $OIDC_CONFIG_FILE: issuer=$OIDC_ISSUER client_id=$OIDC_CLIENT_ID"
else
  : > "$OIDC_CONFIG_FILE"
  echo "OIDC config not set — $OIDC_CONFIG_FILE left empty (dev fallback)"
fi

# Inject <script src="/oidc-config.js"> into index.html if not already present.
# Idempotent: only adds the tag once even on container restart.
if ! grep -q 'src="/oidc-config.js"' /usr/share/nginx/html/index.html; then
  sed -i 's|</head>|<script src="/oidc-config.js"></script></head>|' \
    /usr/share/nginx/html/index.html
fi

# Render CSP with the actual OIDC issuer origin so connect-src / frame-src can
# be tight (specific host) instead of broad `https:`. Falls back to `https:` if
# OIDC_ISSUER is not set, keeping the build usable without runtime config.
if [ -n "$OIDC_ISSUER" ]; then
  # Strip path/query/fragment to get just `scheme://host[:port]`. Validate
  # that the input actually looks like a URL — if not, fall back to `https:`
  # rather than splatting a malformed value into the CSP header. The
  # character class [^/?#] stops at the first authority terminator, so an
  # OIDC_ISSUER like https://issuer.example.com?foo=bar still yields a
  # valid CSP source (https://issuer.example.com), not a malformed token.
  if echo "$OIDC_ISSUER" | grep -qE '^[A-Za-z][A-Za-z0-9+.-]*://[^[:space:]/?#]+'; then
    CSP_REMOTE=$(echo "$OIDC_ISSUER" | sed -E 's|^([A-Za-z][A-Za-z0-9+.-]*://[^/?#]+).*|\1|')
  else
    echo "WARN: OIDC_ISSUER='$OIDC_ISSUER' is not a well-formed URL — using https: in CSP"
    CSP_REMOTE="https:"
  fi
else
  CSP_REMOTE="https:"
fi
export CSP_REMOTE

# Substitute placeholders in nginx config template.
envsubst '${CSP_REMOTE}' < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf
echo "CSP connect-src/frame-src remote: $CSP_REMOTE"

exec "$@"
