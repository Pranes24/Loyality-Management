# Backend — Node.js production image
# Build context: repo root (Coolify default)
FROM node:20-alpine

WORKDIR /app

# Copy from backend/ subdirectory (Coolify uses repo root as build context)
COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ .

# Remove .env if accidentally present — credentials come from Coolify env vars
RUN rm -f .env

EXPOSE 4000

CMD ["node", "server.js"]
