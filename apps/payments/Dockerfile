FROM node:18-alpine AS build
WORKDIR /app
COPY pnpm-lock.yaml ./
COPY package.json ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN npx nx build payments

FROM node:18-alpine AS prod
WORKDIR /app
COPY --from=build /app/dist/apps/payments /app
COPY pnpm-lock.yaml ./
COPY package.json ./
RUN npm install -g pnpm && pnpm install --prod

EXPOSE 8080
CMD ["node", "main.js"]
