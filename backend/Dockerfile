# Backend — Node.js production image
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Remove .env if accidentally copied — credentials come from Coolify env vars
RUN rm -f .env

EXPOSE 4000

CMD ["node", "server.js"]
