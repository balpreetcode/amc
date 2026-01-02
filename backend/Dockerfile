FROM node:20-alpine

WORKDIR /app

# Install ffmpeg for video processing
RUN apk add --no-cache ffmpeg wget

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create temp and output directories with proper permissions
RUN mkdir -p /temp /output && \
    chown -R node:node /app && \
    chown -R node:node /temp && \
    chown -R node:node /output

USER node

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "server.js"]
