# Complete Docker Deployment Guide 🐳

Everything you need to deploy Wild n' Root with Docker!

## Table of Contents

1. [Quick Start](#quick-start)
2. [Docker Files Overview](#docker-files-overview)
3. [Local Development](#local-development)
4. [Production Deployment](#production-deployment)
5. [Using Make Commands](#using-make-commands)
6. [Maintenance & Updates](#maintenance--updates)
7. [Troubleshooting](#troubleshooting)

## Quick Start

### Single Command Deployment

```bash
# Configure environment (one-time)
cp backend/env.example backend/.env
cp client/env.example client/.env.local
# Edit the .env files with your values

# Deploy everything!
./deploy.sh
```

Or manually:
```bash
docker compose up -d --build
```

**That's it!** Your application is running! 🎉

## Docker Files Overview

### Dockerfiles

1. **`backend/Dockerfile`**
   - Multi-stage build (smaller image)
   - Node.js 20 Alpine (lightweight)
   - Runs as non-root user (security)
   - Health checks included
   - Production-optimized

2. **`client/Dockerfile`**
   - Multi-stage build (smaller image)
   - Next.js standalone output
   - Node.js 20 Alpine
   - Runs as non-root user
   - Health checks included

### Docker Compose Files

1. **`docker-compose.yml`**
   - Development/staging configuration
   - All services included
   - No resource limits

2. **`docker-compose.prod.yml`**
   - Production configuration
   - Resource limits set
   - Optimized for production
   - Restart policies: always

3. **`docker-compose.override.yml.example`**
   - Template for custom overrides
   - Copy to `docker-compose.override.yml` to customize

### Configuration Files

- **`.dockerignore`** - Files excluded from Docker build
- **`nginx/`** - Nginx configuration (optional, for reverse proxy)

## Local Development

### Start Development Environment

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Development Workflow

1. Make code changes
2. Rebuild affected service:
   ```bash
   docker compose up -d --build backend
   docker compose up -d --build frontend
   ```

### Hot Reload (Optional)

For hot reload during development, you might want to mount source code:

```yaml
# docker-compose.override.yml
services:
  backend:
    volumes:
      - ./backend/src:/app/src
  frontend:
    volumes:
      - ./client/src:/app/src
```

## Production Deployment

### Step 1: Server Setup

```bash
# SSH into your DigitalOcean droplet
ssh root@your-droplet-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### Step 2: Clone Repository

```bash
cd /var/www
git clone https://github.com/yourusername/wnr.git
cd wnr
```

### Step 3: Configure Environment

```bash
# Backend
cd backend
cp env.example .env
nano .env  # Fill in production values

# Frontend
cd ../client
cp env.example .env.local
nano .env.local  # Fill in production values
```

### Step 4: Deploy

```bash
cd /var/www/wnr

# Option 1: Use deployment script
./deploy.sh prod

# Option 2: Manual deployment
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 5: Verify Deployment

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Health check
curl http://localhost:5001/health
curl http://localhost:3000
```

### Step 6: Setup Nginx & SSL

See `DOCKER_DEPLOYMENT.md` for Nginx configuration and SSL setup.

## Using Make Commands

If you have `make` installed, use these convenient commands:

```bash
# Production deployment
make prod-deploy      # Build and start production
make prod-up          # Start production services
make prod-down        # Stop production services
make prod-logs        # View production logs

# Development
make build            # Build all images
make up               # Start services
make down             # Stop services
make restart          # Restart services
make logs             # View all logs
make logs-backend     # View backend logs
make logs-frontend    # View frontend logs

# Utilities
make ps               # Show container status
make stats            # Show resource usage
make health           # Check service health
make clean            # Remove everything
make migrate          # Run database migrations
make shell-backend    # Access backend shell
make shell-frontend   # Access frontend shell
```

## Maintenance & Updates

### Update Application

```bash
cd /var/www/wnr

# Pull latest code
git pull

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Or use the deployment script
./deploy.sh prod
```

### Run Database Migrations

```bash
docker compose exec backend npm run migrate-indexes

# Or using make
make migrate
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend

# Last 100 lines
docker compose logs --tail=100
```

### Monitor Resources

```bash
# Container stats
docker stats

# Or using make
make stats
```

### Backup

```bash
# Backup environment files
tar -czf backup-$(date +%Y%m%d).tar.gz backend/.env client/.env.local

# Backup logs (if needed)
docker compose exec backend tar -czf /app/logs-backup.tar.gz /app/logs
docker cp wnr-backend:/app/logs-backup.tar.gz .
```

## Troubleshooting

### Containers Won't Start

1. **Check logs:**
   ```bash
   docker compose logs
   ```

2. **Check if ports are available:**
   ```bash
   netstat -tulpn | grep -E '3000|5001'
   ```

3. **Verify environment files:**
   ```bash
   ls -la backend/.env client/.env.local
   ```

4. **Check Docker resources:**
   ```bash
   docker system df
   docker ps -a
   ```

### Build Fails

1. **Clear Docker cache:**
   ```bash
   docker compose build --no-cache
   ```

2. **Check Dockerfile syntax:**
   ```bash
   docker build -t test-backend ./backend
   docker build -t test-frontend ./client
   ```

3. **Check disk space:**
   ```bash
   df -h
   docker system prune -a  # Remove unused images/containers
   ```

### Database Connection Issues

1. **Verify MONGODB_URI:**
   ```bash
   docker compose exec backend env | grep MONGODB
   ```

2. **Test connection:**
   ```bash
   docker compose exec backend node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(e => console.error(e));"
   ```

### Performance Issues

1. **Check resource usage:**
   ```bash
   docker stats
   ```

2. **Adjust resource limits in docker-compose.prod.yml:**
   ```yaml
   deploy:
     resources:
       limits:
         memory: 1G  # Increase if needed
   ```

3. **Check container logs for errors:**
   ```bash
   docker compose logs backend | grep -i error
   ```

### Container Keeps Restarting

1. **Check logs:**
   ```bash
   docker compose logs backend
   ```

2. **Check health status:**
   ```bash
   docker compose ps
   ```

3. **Check environment variables:**
   ```bash
   docker compose exec backend env
   ```

## Docker Best Practices Applied

✅ **Multi-stage builds** - Smaller final images
✅ **Non-root user** - Security best practice
✅ **Health checks** - Automatic monitoring
✅ **Resource limits** - Prevent resource exhaustion
✅ **.dockerignore** - Faster builds
✅ **Alpine Linux** - Smaller images
✅ **Proper signal handling** - Graceful shutdowns
✅ **Layer caching** - Faster rebuilds

## Environment Variables

All environment variables are loaded from:
- Backend: `backend/.env`
- Frontend: `client/.env.local`

**Never commit these files!** They're in `.gitignore`.

See `backend/env.example` and `client/env.example` for required variables.

## Network Architecture

```
Internet
   │
   ├── Frontend (Port 3000)
   │   └── Proxy requests to Backend
   │
   └── Backend (Port 5001)
       ├── MongoDB (External - Atlas)
       ├── Firebase (External)
       ├── Razorpay (External)
       └── Cloudinary (External)
```

Services communicate via Docker network `wnr-network`.

## Security Features

- ✅ Containers run as non-root users
- ✅ Minimal base images (Alpine Linux)
- ✅ Environment variables not in images
- ✅ Only necessary ports exposed
- ✅ Health checks for monitoring
- ✅ Resource limits prevent DoS
- ✅ Network isolation

## Scaling

To scale services:

```bash
# Scale backend to 3 instances
docker compose up -d --scale backend=3

# Scale frontend to 2 instances
docker compose up -d --scale frontend=2
```

Note: You'll need a load balancer (like Nginx) for proper scaling.

## That's Everything!

With Docker, deployment is now:
1. ✅ Configure `.env` files
2. ✅ Run `./deploy.sh` or `docker compose up -d --build`
3. ✅ Done!

No complex setup, no manual process management - Docker handles everything! 🎉

For more details, see `DOCKER_DEPLOYMENT.md` or `DOCKER_QUICK_START.md`.
