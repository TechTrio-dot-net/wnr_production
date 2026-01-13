#!/bin/bash
# One-Command Deployment Script for Wild n' Root

set -e

echo "🚀 Wild n' Root - Docker Deployment Script"
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
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed!${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
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
        echo -e "${YELLOW}   Please edit backend/.env with your production values${NC}"
    fi
    ENV_FILES_MISSING=1
fi

if [ ! -f "client/.env.local" ]; then
    echo -e "${YELLOW}⚠️  client/.env.local not found${NC}"
    if [ -f "client/env.example" ]; then
        echo "   Copying env.example to .env.local..."
        cp client/env.example client/.env.local
        echo -e "${YELLOW}   Please edit client/.env.local with your production values${NC}"
    fi
    ENV_FILES_MISSING=1
fi

if [ ! -f "adminui/.env.local" ]; then
    echo -e "${YELLOW}⚠️  adminui/.env.local not found${NC}"
    if [ -f "adminui/env.example" ]; then
        echo "   Copying env.example to .env.local..."
        cp adminui/env.example adminui/.env.local
        echo -e "${YELLOW}   Please edit adminui/.env.local with your production values${NC}"
    else
        echo "   Creating adminui/.env.local from template..."
        echo "NEXT_PUBLIC_API_BASE=http://localhost:5001" > adminui/.env.local
        echo -e "${YELLOW}   Please edit adminui/.env.local with your production values${NC}"
    fi
    ENV_FILES_MISSING=1
fi

if [ $ENV_FILES_MISSING -eq 1 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Environment files need to be configured!${NC}"
    echo "Please edit the .env files before continuing."
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "📦 Building and starting containers..."
echo ""

# Determine which compose file to use
COMPOSE_FILE="docker-compose.yml"
if [ "$1" == "prod" ] || [ "$1" == "production" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "Using production configuration..."
fi

# Build and start
docker compose -f "$COMPOSE_FILE" up -d --build

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Wait a moment for services to start
echo "⏳ Waiting for services to start..."
sleep 5

# Check status
echo ""
echo "📊 Container Status:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "🔍 Service URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Admin UI: http://localhost:3001"
echo "  Backend:  http://localhost:5001"
echo "  Health:   http://localhost:5001/health"
echo ""

# Health check
echo "🏥 Health Check:"
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "  ${YELLOW}⚠️  Backend health check failed (may still be starting)${NC}"
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "  ${YELLOW}⚠️  Frontend health check failed (may still be starting)${NC}"
fi

if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Admin UI is healthy${NC}"
else
    echo -e "  ${YELLOW}⚠️  Admin UI health check failed (may still be starting)${NC}"
fi

echo ""
echo "📋 Useful commands:"
echo "  View logs:    docker compose logs -f"
echo "  Stop:         docker compose down"
echo "  Restart:      docker compose restart"
echo "  Status:       docker compose ps"
echo ""
echo -e "${GREEN}🎉 Deployment successful!${NC}"
