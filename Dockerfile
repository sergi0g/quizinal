FROM oven/bun:1.4.2-alpine AS builder

WORKDIR /app

COPY bun.lock package.json ./
RUN bun install

COPY next-env.d.ts next.config.mjs postcss.config.mjs tsconfig.json ./
COPY public public
COPY components components
COPY lib lib
COPY app app

RUN bun run build

FROM dhi.io/nginx:1.31.6-debian13 AS runner

COPY --from=builder /app/out /usr/share/nginx/html
