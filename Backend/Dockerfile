# Node.js Backend for Google Cloud Run
FROM node:18-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Cloud Run uses port 8080 by default
EXPOSE 8080

CMD ["node", "server.js"]