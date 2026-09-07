FROM node:22.13-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22.13-bookworm-slim AS builder
WORKDIR /app
ARG SITE_URL=http://localhost:3000
ENV NEXT_TELEMETRY_DISABLED=1 \
    SITE_URL=${SITE_URL}
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22.13-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/app/data/wedding.sqlite

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "server.js"]
