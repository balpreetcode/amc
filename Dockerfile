# ==========================================
# Stage 1: Build the Vite + React app
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# ==========================================
# Stage 2: Serve with nginx
# ==========================================
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx config for SPA routing + API proxy
RUN echo 'server { \
    listen 8080; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /workflow { \
        proxy_pass http://workflow-backend:8080; \
        proxy_http_version 1.1; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
    location /health { \
        proxy_pass http://workflow-backend:8080; \
    } \
    location /templates { \
        proxy_pass http://workflow-backend:8080; \
    } \
    location /template { \
        proxy_pass http://workflow-backend:8080; \
    } \
    location /download { \
        proxy_pass http://workflow-backend:8080; \
    } \
    location /output { \
        proxy_pass http://workflow-backend:8080; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Run as non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
