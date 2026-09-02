FROM node:22-bookworm-slim AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build

WORKDIR /app
COPY . .
ARG API_ORIGIN=http://api:3001
ENV API_ORIGIN=${API_ORIGIN}
RUN npm run contracts:generate \
  && npm exec tsc -- --noEmit \
  && npm run web:build \
  && cp apps/web/.next/standalone/apps/web/server.js apps/web/.next/standalone/apps/web/server.cjs \
  && cp -a apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static

FROM node:22-bookworm-slim AS api

WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/apps ./apps
COPY --from=build /app/packages ./packages
COPY --from=build /app/db ./db
COPY --from=build /app/scripts ./scripts
USER node
EXPOSE 3001
CMD ["node", "node_modules/tsx/dist/cli.mjs", "apps/api/src/server.ts"]

FROM node:22-bookworm-slim AS web

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.next/standalone /app/standalone
COPY --from=build /app/apps/web/.next/static /app/standalone/apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "/app/standalone/apps/web/server.cjs"]
