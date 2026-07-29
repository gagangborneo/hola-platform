# syntax=docker/dockerfile:1
# Satu image dipakai oleh API, worker, dan Bull Board. Dokploy mengubah CMD
# worker menjadi `node dist/worker.js`; migration tetap release step terpisah.
FROM node:24-alpine AS dependencies

RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN pnpm --filter @hola/api build

FROM node:24-alpine AS runtime

# `pg_dump` dan `pg_restore` dibutuhkan J-30. Rclone dipakai oleh container
# hola-backup; menyediakannya di image bersama membuat recovery manual tetap
# mungkin tanpa menyalin credential ke image lain.
RUN apk add --no-cache curl postgresql16-client rclone \
  && addgroup -S hola \
  && adduser -S -G hola hola
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build --chown=hola:hola /workspace/node_modules ./node_modules
COPY --from=build --chown=hola:hola /workspace/package.json ./package.json
COPY --from=build --chown=hola:hola /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=hola:hola /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=hola:hola /workspace/apps/api/dist ./apps/api/dist
COPY --from=build --chown=hola:hola /workspace/packages/db ./packages/db
COPY --from=build --chown=hola:hola /workspace/packages/shared ./packages/shared

USER hola
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/index.js"]
