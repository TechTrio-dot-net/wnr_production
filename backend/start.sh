#!/bin/bash
# Production startup script for backend

set -e

echo "🚀 Starting Wild n' Root Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
  echo "⚠️  Warning: .env file not found!"
  echo "   Please copy env.example to .env and configure it."
  exit 1
fi

# Check if dist folder exists (build required)
if [ ! -d "dist" ]; then
  echo "📦 Building TypeScript..."
  npm run build
fi

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
  echo "✅ Using PM2 for process management..."
  npm run start:pm2
  echo "✅ Backend started with PM2"
  echo "   View logs: pm2 logs"
  echo "   View status: pm2 status"
  echo "   Stop: pm2 stop ecosystem.config.js"
else
  echo "⚠️  PM2 not found, running directly with node..."
  echo "   Install PM2: npm install -g pm2"
  npm start
fi
