# ---------- Build ----------
FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# ---------- Runtime ----------
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000

# Aplica as migrations pendentes e sobe o servidor
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/server.js"]
