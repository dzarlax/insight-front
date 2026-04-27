FROM node:25-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

# `envsubst` is provided by gettext; the official nginx:alpine image already
# includes it. We list it here defensively in case the base image ever drops it.
RUN apk add --no-cache gettext

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# nginx config template — entrypoint substitutes ${CSP_REMOTE} at container start
# and writes the result to /etc/nginx/conf.d/default.conf.
COPY <<'NGINX' /etc/nginx/templates/default.conf.template
map $sent_http_content_type $csp_header {
    default "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ${CSP_REMOTE}; frame-src 'self' ${CSP_REMOTE}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";
}

server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;

    # Security headers — applied to every response.
    # CSP: 'unsafe-inline' for style-src is required for React inline styles + recharts;
    # tighten via nonce in a later iteration. connect-src/frame-src use the actual
    # OIDC issuer origin (substituted by docker-entrypoint.sh) when available,
    # falling back to `https:` if OIDC_ISSUER is not set at runtime.
    add_header Content-Security-Policy $csp_header always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable" always;
        add_header X-Content-Type-Options "nosniff" always;
    }

    location /healthz {
        access_log off;
        default_type text/plain;
        return 200 "ok";
    }
}
NGINX

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
