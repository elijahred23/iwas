# ---- build React app ----
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

# Copy the rest of the frontend source
COPY frontend .
RUN npm run build

# ---- serve static using nginx ----
FROM nginx:alpine

# Use SPA-friendly nginx config
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
