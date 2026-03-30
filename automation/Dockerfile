FROM oven/bun:1.2.22-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src ./src
COPY shared ./shared

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 CMD ["bun", "run", "healthcheck"]

CMD ["bun", "run", "start"]
