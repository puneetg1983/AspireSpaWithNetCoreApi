# Stage 1: Build the Angular application
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy nginx configuration template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy custom entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint-custom.sh
RUN chmod +x /docker-entrypoint-custom.sh

# Copy built Angular app from build stage
# Angular 19+ outputs to dist/<project-name>/browser
COPY --from=build /app/dist/AuthSpa2.Angular/browser /usr/share/nginx/html

# Default API URL (will be overridden by Aspire)
ENV API_URL=http://apiservice

# Expose port 80
EXPOSE 80

# Use custom entrypoint that only substitutes API_URL
CMD ["/docker-entrypoint-custom.sh"]
