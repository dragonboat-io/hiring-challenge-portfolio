FROM node:22-bookworm-slim

# better-sqlite3 ships prebuilt binaries for this platform, but keep the
# toolchain available so a fallback node-gyp build can succeed.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/app.db
EXPOSE 3000

# Migrate and seed on every start — both are idempotent, so this is safe
# against a volume that already holds data.
CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && npm run start"]
