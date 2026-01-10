#!/bin/bash
# Initial server setup script for Digital Ocean
# Run this once on a fresh Ubuntu server

set -e

echo "🔧 Digital Ocean Server Setup Script"
echo "====================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

echo "📦 Updating system packages..."
apt update && apt upgrade -y

echo ""
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

echo ""
echo "🐳 Installing Docker Compose..."
if ! command -v docker compose &> /dev/null; then
    apt install docker-compose-plugin -y
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✅ Docker Compose already installed${NC}"
fi

echo ""
echo "👤 Creating deploy user..."
if id "deploy" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Deploy user already exists${NC}"
else
    adduser --disabled-password --gecos "" deploy
    usermod -aG docker deploy
    usermod -aG sudo deploy
    echo -e "${GREEN}✅ Deploy user created${NC}"
fi

echo ""
echo "🔐 Setting up SSH for GitHub Actions..."
if [ ! -d "/home/deploy/.ssh" ]; then
    mkdir -p /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chown deploy:deploy /home/deploy/.ssh
fi

echo ""
echo "🔥 Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo -e "${YELLOW}⚠️  Firewall rules added. Run 'ufw enable' to activate.${NC}"
else
    echo -e "${YELLOW}⚠️  UFW not installed. Install with: apt install ufw${NC}"
fi

echo ""
echo -e "${GREEN}✅ Server setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Switch to deploy user: su - deploy"
echo "2. Generate SSH key: ssh-keygen -t ed25519 -C 'github-actions' -f ~/.ssh/github_actions"
echo "3. Add public key: cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys"
echo "4. Copy private key for GitHub Secrets: cat ~/.ssh/github_actions"
echo "5. Clone your repository: git clone YOUR_REPO_URL ~/wnr"
echo "6. Configure environment files in backend/, client/, and adminui/ directories"
echo "7. Run deployment: cd ~/wnr && ./scripts/deploy-server.sh"
echo ""

