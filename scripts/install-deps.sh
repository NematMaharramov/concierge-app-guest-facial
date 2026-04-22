#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Raffles Praslin Concierge — Ubuntu Server Deployment Script
# ═══════════════════════════════════════════════════════════════
set -e

echo ""
echo "═══════════════════════════════════════════════"
echo "  Raffles Concierge — Server Setup"
echo "═══════════════════════════════════════════════"
echo ""

# ── 1. Update system ────────────────────────────────────────────
echo "→ Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# ── 2. Install Docker ───────────────────────────────────────────
echo "→ Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# ── 3. Add current user to docker group ─────────────────────────
sudo usermod -aG docker "$USER"
echo "→ Added $USER to docker group"

# ── 4. Enable Docker on boot ────────────────────────────────────
sudo systemctl enable docker
sudo systemctl start docker

# ── 5. Install git ──────────────────────────────────────────────
sudo apt-get install -y git

echo ""
echo "✅ System dependencies installed."
echo ""
echo "Next steps:"
echo "  1. Log out and back in (for docker group to take effect)"
echo "  2. cd /path/to/concierge-app"
echo "  3. cp .env.example .env  (then edit with your values)"
echo "  4. bash scripts/start.sh"
echo ""
