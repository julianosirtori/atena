FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY apps/workers/package.json ./apps/workers/
COPY apps/panel/package.json ./apps/panel/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/channels/package.json ./packages/channels/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx turbo build

FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/workers/dist ./apps/workers/dist
COPY --from=build /app/packages/config/dist ./packages/config/dist
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/packages/channels/dist ./packages/channels/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/workers/package.json ./apps/workers/
COPY apps/panel/package.json ./apps/panel/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/channels/package.json ./packages/channels/
COPY packages/shared/package.json ./packages/shared/
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
