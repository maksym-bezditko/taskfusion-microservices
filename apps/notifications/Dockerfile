FROM node:18-alpine AS build
WORKDIR /app
COPY pnpm-lock.yaml ./
COPY package.json ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN npx nx build notifications

FROM node:18-alpine AS prod
WORKDIR /app
COPY --from=build /app/dist/apps/notifications /app
COPY pnpm-lock.yaml ./
COPY package.json ./
RUN npm install -g pnpm && pnpm install --prod

CMD ["node", "main.js"]
