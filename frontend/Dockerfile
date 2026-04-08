# Frontend — multi-stage build: Vite → nginx
# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: serve ────────────────────────────────────────────────────────────
FROM nginx:1.25-alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx template — envsubst replaces ${BACKEND_URL} at startup
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

# nginx:alpine image automatically runs envsubst on /etc/nginx/templates/*.template
CMD ["nginx", "-g", "daemon off;"]
