FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/dist ./dist
COPY package.json ./
# Remove any prepare hooks and install only production dependencies
RUN npm pkg delete scripts.prepare || true \
 && npm i --omit=dev
CMD ["node", "dist/server.js"]