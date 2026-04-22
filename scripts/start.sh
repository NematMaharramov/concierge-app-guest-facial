#!/bin/bash
# ════════════════════════════════════════
#  Start / Deploy the application
# ════════════════════════════════════════
set -e

if [ ! -f ".env" ]; then
  echo "❌ .env file not found. Copy .env to .env and fill in values."
  exit 1
fi

echo "→ Pulling latest images / building..."
docker compose pull --ignore-pull-failures || true
docker compose build --no-cache

echo "→ Starting services..."
docker compose up -d

echo "→ Waiting for database to be ready..."
sleep 8

echo "→ Running migrations..."
docker compose exec backend npx prisma migrate deploy

echo "→ Seeding database (first run only)..."
docker compose exec backend npx ts-node --project tsconfig.seed.json prisma/seed.ts || echo "  (Seed already run or skipped)"

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅  Application is running!"
echo "═══════════════════════════════════════════"
echo ""
echo "  Guest site:   http://localhost"
echo "  Admin login:  http://localhost/login"
echo "  API:          http://localhost/api"
echo ""
echo "  Default Admin:"
echo "  Email:    admin@raffles-concierge.com"
echo "  Password: Admin@2024!"
echo ""
echo "  ⚠️  Change the admin password immediately!"
echo ""
