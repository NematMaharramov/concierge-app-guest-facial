#!/bin/bash
# Pull latest code and redeploy with zero data loss
set -e
echo "→ Pulling latest changes..."
git pull

echo "→ Rebuilding containers..."
docker compose build --no-cache

echo "→ Restarting with zero downtime..."
docker compose up -d --no-deps backend frontend nginx

echo "→ Running any new migrations..."
sleep 5
docker compose exec backend npx prisma migrate deploy

echo "✅ Update complete!"
