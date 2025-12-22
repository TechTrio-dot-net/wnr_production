# Docker Quick Start - Single Command Deployment! 🚀

Deploy your entire application with **ONE command**!

## Prerequisites

- Docker and Docker Compose installed
- Environment variables configured

## Single Command Deployment

### Step 1: Configure Environment (One-time setup)

**Backend:**
```bash
cd backend
cp env.example .env
# Edit .env with your production values
```

**Frontend:**
```bash
cd client
cp env.example .env.local
# Edit .env.local with your production values
```

**Admin UI:**
```bash
cd adminui
cp env.example .env.local
# Edit .env.local with your production values
```

### Step 2: Deploy Everything!

```bash
# From project root
docker compose up -d --build
```

**That's it!** Your entire application is now running! 🎉

## What Gets Deployed

- ✅ Backend API (port 5001)
- ✅ Frontend (port 3000)
- ✅ Automatic health checks
- ✅ Auto-restart on failure
- ✅ Network isolation
- ✅ Resource limits

## Access Your Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **Health Check**: http://localhost:5001/health

## Using Make Commands (Even Easier!)

If you have `make` installed:

```bash
make prod-deploy    # Build and start everything
make logs           # View all logs
make ps             # Check status
make down           # Stop everything
make restart        # Restart services
make health         # Check health
```

## Common Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart
docker compose restart

# Check status
docker compose ps

# Rebuild and restart
docker compose up -d --build
```

## Production Deployment on DigitalOcean

### 1. Install Docker on Server

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install -y docker-compose-plugin
```

### 2. Clone and Configure

```bash
cd /var/www
git clone https://github.com/yourusername/wnr.git
cd wnr

# Configure .env files
cd backend && cp env.example .env && nano .env
cd ../client && cp env.example .env.local && nano .env.local
cd ..
```

### 3. Deploy!

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Setup Nginx (for SSL and domain routing)

See `DOCKER_DEPLOYMENT.md` for Nginx configuration.

### 5. Setup SSL

```bash
certbot --nginx -d your-domain.com
```

## Updating Application

To update your application:

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

That's it! No need to manually manage processes, PM2, or Node.js installations.

## Benefits of Docker

✅ **One Command Deployment** - `docker compose up -d --build`
✅ **Consistent Environment** - Same everywhere (dev, staging, prod)
✅ **Easy Updates** - Just rebuild and restart
✅ **Isolation** - Services can't interfere with each other
✅ **Resource Limits** - Prevents resource exhaustion
✅ **Health Checks** - Automatic monitoring
✅ **Auto-restart** - Services restart on failure
✅ **No Manual Setup** - No need to install Node.js, PM2, etc.

## Troubleshooting

**View logs:**
```bash
docker compose logs -f
```

**Check status:**
```bash
docker compose ps
```

**Rebuild from scratch:**
```bash
docker compose down -v
docker compose up -d --build
```

**Access container shell:**
```bash
docker compose exec backend sh
docker compose exec frontend sh
```

## That's All!

With Docker, deployment is now **truly one command**! 🎉

No complex setup, no manual configuration - just:
1. Configure `.env` files
2. Run `docker compose up -d --build`
3. Done!
