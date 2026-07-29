# syntax=docker/dockerfile:1
FROM node:24-alpine AS dependencies

RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
WORKDIR /workspace
COPY . .
ARG GIT_SHA=development
ARG NEXT_PUBLIC_APP_ENV=prod
ARG NEXT_PUBLIC_API_BASE_URL
ARG API_BASE_URL_INTERNAL
ARG NEXT_PUBLIC_ADMIN_BASE_URL
ARG NEXT_PUBLIC_MEDIA_BASE_URL
ARG NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ENV GIT_SHA=$GIT_SHA \
  NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV \
  NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
  API_BASE_URL_INTERNAL=$API_BASE_URL_INTERNAL \
  NEXT_PUBLIC_ADMIN_BASE_URL=$NEXT_PUBLIC_ADMIN_BASE_URL \
  NEXT_PUBLIC_MEDIA_BASE_URL=$NEXT_PUBLIC_MEDIA_BASE_URL \
  NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
  SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
  SENTRY_ORG=$SENTRY_ORG \
  SENTRY_PROJECT=$SENTRY_PROJECT
RUN pnpm --filter @hola/admin build

FROM node:24-alpine AS runtime

RUN addgroup -S hola && adduser -S -G hola hola
WORKDIR /app
ENV NODE_ENV=production \
  PORT=3000 \
  HOSTNAME=0.0.0.0
COPY --from=build --chown=hola:hola /workspace/apps/admin/.next/standalone ./
COPY --from=build --chown=hola:hola /workspace/apps/admin/.next/static ./apps/admin/.next/static
USER hola
WORKDIR /app/apps/admin
EXPOSE 3000
CMD ["node", "server.js"]
