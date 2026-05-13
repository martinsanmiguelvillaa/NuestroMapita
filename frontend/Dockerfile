# Stage 1: build de la app React con Vite
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: servir el build con Nginx
FROM nginx:alpine

# Copiar el build generado por Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración de Nginx con proxy al backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
