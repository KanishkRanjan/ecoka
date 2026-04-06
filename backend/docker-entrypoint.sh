#!/bin/sh
set -e

echo "[ecoka] Pushing schema to database..."
npx prisma db push --skip-generate --accept-data-loss

echo "[ecoka] Seeding products (idempotent upsert)..."
npx ts-node --transpile-only prisma/seed.ts || echo "[ecoka] seed step failed — continuing"

exec "$@"
