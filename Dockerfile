# syntax=docker/dockerfile:1
# Management API image: serves the REST API, the flagd sync endpoint and the built dashboard.
# MariaDB and flagd stay separate services; configure them via the environment variables in
# docs/02-architecture.md §9.

FROM node:24-bookworm-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY shared/package.json shared/
COPY web/package.json web/

FROM base AS web-build
RUN npm ci
COPY tsconfig.base.json ./
COPY shared shared
COPY web web
RUN npm run build:web

FROM base AS runtime
# HOST=0.0.0.0: the default loopback bind is unreachable from outside the container.
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
RUN npm ci --omit=dev --workspace @fms/server --workspace @fms/shared \
    && npm cache clean --force
COPY tsconfig.base.json prisma.config.ts ./
COPY prisma prisma
COPY shared shared
COPY server server
RUN npx prisma generate
COPY --from=web-build /app/web/dist web/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
# The server applies pending migrations at boot (prisma migrate deploy) before listening.
CMD ["node_modules/.bin/tsx", "server/src/index.ts"]
