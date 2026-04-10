# Stage 1: 构建前端
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY src/ src/
COPY public/ public/

RUN npm run build

# Stage 2: 生产运行
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY public/ public/
COPY --from=build /app/dist dist/

EXPOSE 8080

CMD ["node", "server.js"]
