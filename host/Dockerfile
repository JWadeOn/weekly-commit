# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# REMOTE_URL is the browser-facing URL of the remote MFE (with or without https://; vite adds https if missing)
ARG REMOTE_URL=http://localhost:3001
ENV REMOTE_URL=${REMOTE_URL}
# Optional: API base URL for production (e.g. /api for same-origin)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM nginx:alpine
RUN apk add --no-cache gettext
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template
RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Match Railway's PORT (default 8080). Entrypoint uses PORT at runtime.
EXPOSE 8080
CMD ["/docker-entrypoint.sh"]
