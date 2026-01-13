#!/bin/bash
# Server-side deployment script for Digital Ocean
# This script runs on the server to deploy the application

set -e

echo "🚀 Wild n' Root - Server Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"
echo ""

# Check for environment files
ENV_FILES_MISSING=0

if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  backend/.env not found${NC}"
    if [ -f "backend/env.example" ]; then
        echo "   Copying env.example to .env..."
        cp backend/env.example backend/.env
        echo -e "${YELLOW}   ⚠️  Please configure backend/.env with production values${NC}"
    fi
    ENV_FILES_MISSING=1
fi

if [ ! -f "client/.env.local" ]; then
    echo -e "${YELLOW}⚠️  client/.env.local not found${NC}"
    if [ -f "client/env.example" ]; then
        echo "   Copying env.example to .env.local..."
        cp client/env.example client/.env.local
        echo -e "${YELLOW}   ⚠️  Please configure client/.env.local with production values${NC}"
    fi
    ENV_FILES_MISSING=1
fi

if [ ! -f "adminui/.env.local" ]; then
    echo -e "${YELLOW}⚠️  adminui/.env.local not found${NC}"
    if [ -f "adminui/env.example" ]; then
        echo "   Copying env.example to .env.local..."
        cp adminui/env.example adminui/.env.local
        echo -e "${YELLOW}   ⚠️  Please configure adminui/.env.local with production values${NC}"
    fi
    ENV_FILES_MISSING=1
fi

if [ $ENV_FILES_MISSING -eq 1 ]; then
    echo -e "${YELLOW}⚠️  Warning: Environment files may need configuration!${NC}"
    echo "   Continuing with deployment, but please verify environment variables."
    echo ""
fi

echo "📦 Pulling latest Docker images..."
docker compose -f docker-compose.prod.yml pull || true

echo ""
echo "🔨 Building and starting containers..."
echo ""

# Stop existing containers gracefully
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.prod.yml down --timeout 30 || true

# Remove old images to save space (optional, uncomment if needed)
# echo "🧹 Cleaning up old images..."
# docker image prune -f

# Build and start with production config
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
echo ""
echo "📊 Container Status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "🔍 Checking service health..."

# Health check with retries
MAX_RETRIES=5
RETRY_COUNT=0

check_health() {
    local service=$1
    local url=$2
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo -e "  ${GREEN}✅ $service is healthy${NC}"
            return 0
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "  ⏳ Waiting for $service... (attempt $RETRY_COUNT/$MAX_RETRIES)"
            sleep 5
        fi
    done
    
    echo -e "  ${YELLOW}⚠️  $service health check failed (may still be starting)${NC}"
    return 1
}

RETRY_COUNT=0
check_health "Backend" "http://localhost:5001/health" || true

RETRY_COUNT=0
check_health "Frontend" "http://localhost:3000" || true

RETRY_COUNT=0
check_health "Admin UI" "http://localhost:3001" || true

echo ""
echo "📋 Useful commands:"
echo "  View logs:    docker compose -f docker-compose.prod.yml logs -f"
echo "  Stop:         docker compose -f docker-compose.prod.yml down"
echo "  Restart:      docker compose -f docker-compose.prod.yml restart"
echo "  Status:       docker compose -f docker-compose.prod.yml ps"
echo ""

# Show recent logs
echo "📝 Recent logs (last 20 lines):"
docker compose -f docker-compose.prod.yml logs --tail=20

echo ""
echo -e "${GREEN}🎉 Deployment successful!${NC}"

