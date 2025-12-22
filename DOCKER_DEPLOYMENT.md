# Docker Deployment Guide 🐳

Deploy your entire Wild n' Root application with a single command!

## Prerequisites

1. Docker installed ([Install Docker](https://docs.docker.com/get-docker/))
2. Docker Compose installed (comes with Docker Desktop)
3. Environment variables configured

## Quick Start (Single Command!)

### 1. Configure Environment Variables

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

### 2. Build and Start Everything

```bash
# From project root directory
docker-compose up -d --build
```

That's it! Your entire application is now running! 🎉

## What This Does

The `docker-compose up -d --build` command:
1. ✅ Builds backend Docker image
2. ✅ Builds frontend Docker image
3. ✅ Starts backend container (port 5001)
4. ✅ Starts frontend container (port 3000)
5. ✅ Sets up networking between services
6. ✅ Configures health checks
7. ✅ Enables auto-restart on failure

## Service URLs

Once running:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **Health Check**: http://localhost:5001/health

## Common Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services
```bash
docker-compose restart
# Or restart specific service
docker-compose restart backend
```

### Rebuild and Restart
```bash
docker-compose up -d --build
```

### Stop and Remove Everything
```bash
docker-compose down -v  # Also removes volumes
```

### Check Status
```bash
docker-compose ps
```

### Execute Commands in Container
```bash
# Run migration in backend
docker-compose exec backend npm run migrate-indexes

# Access backend shell
docker-compose exec backend sh

# Access frontend shell
docker-compose exec frontend sh
```

## Production Deployment on DigitalOcean

### Step 1: Install Docker on Droplet

```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
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
nano .env  # Edit with production values

# Frontend
cd ../client
cp env.example .env.local
nano .env.local  # Edit with production values
```

### Step 4: Start with Docker Compose

```bash
# From project root
cd /var/www/wnr

# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose logs -f
```

### Step 5: Setup Nginx Reverse Proxy

Create `/etc/nginx/sites-available/wildnroot`:

```nginx
server {
    listen 80;
    server_name www.wildnroot.com wildnroot.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.wildnroot.com wildnroot.com;

    ssl_certificate /etc/letsencrypt/live/wildnroot.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wildnroot.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Create `/etc/nginx/sites-available/wildnroot-api`:

```nginx
server {
    listen 80;
    server_name api.wildnroot.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.wildnroot.com;

    ssl_certificate /etc/letsencrypt/live/api.wildnroot.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.wildnroot.com/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and reload:
```bash
ln -s /etc/nginx/sites-available/wildnroot /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/wildnroot-api /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Step 6: Setup SSL

```bash
certbot --nginx -d wildnroot.com -d www.wildnroot.com
certbot --nginx -d api.wildnroot.com
```

## Updating Application

To update your application:

```bash
cd /var/www/wnr

# Pull latest code
git pull

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose logs -f
```

## Database Migrations

Run migrations inside the backend container:

```bash
docker compose exec backend npm run migrate-indexes
```

## Monitoring

### View Container Status
```bash
docker compose ps
```

### View Resource Usage
```bash
docker stats
```

### View Logs
```bash
# All services
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100

# Specific service
docker compose logs -f backend
```

### Health Checks

Backend health:
```bash
curl http://localhost:5001/health
```

Frontend health:
```bash
curl http://localhost:3000
```

## Troubleshooting

### Containers won't start

1. **Check logs:**
   ```bash
   docker compose logs
   ```

2. **Check if ports are in use:**
   ```bash
   netstat -tulpn | grep -E '3000|5001'
   ```

3. **Verify environment files exist:**
   ```bash
   ls -la backend/.env client/.env.local
   ```

### Build fails

1. **Clear Docker cache:**
   ```bash
   docker compose build --no-cache
   ```

2. **Check Dockerfile syntax:**
   ```bash
   docker build -t test-backend ./backend
   ```

### Database connection fails

1. **Verify MONGODB_URI in .env:**
   ```bash
   docker compose exec backend env | grep MONGODB
   ```

2. **Test connection:**
   ```bash
   docker compose exec backend node -e "require('dotenv').config(); console.log(process.env.MONGODB_URI)"
   ```

### Out of memory

1. **Check container memory:**
   ```bash
   docker stats
   ```

2. **Increase memory limits in docker-compose.prod.yml**

## Production Optimizations

The `docker-compose.prod.yml` includes:
- ✅ Resource limits (prevents resource exhaustion)
- ✅ Restart policies (always restart on failure)
- ✅ Health checks (automatic container health monitoring)
- ✅ Proper networking (isolated network for services)

## Security Best Practices

1. ✅ Containers run as non-root users
2. ✅ Environment variables not in images
3. ✅ Only necessary ports exposed
4. ✅ Health checks enabled
5. ✅ Resource limits set

## Backup Strategy

### Backup Database (MongoDB Atlas)
- Use MongoDB Atlas automated backups
- Or backup manually from Atlas dashboard

### Backup Application Files
```bash
# Backup environment files
tar -czf backup-$(date +%Y%m%d).tar.gz backend/.env client/.env.local
```

### Backup Docker Volumes (if any)
```bash
docker compose exec backend tar -czf /app/logs-backup.tar.gz /app/logs
```

## Environment Variables Reference

### Backend (.env)
See `backend/env.example` for all variables.

### Frontend (.env.local)
See `client/env.example` for all variables.

**Important**: Never commit `.env` or `.env.local` files!

## Single Command Deployment Script

Create a deployment script `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying Wild n' Root Application..."

# Pull latest code
echo "📥 Pulling latest code..."
git pull

# Build and start
echo "🔨 Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
echo "✅ Deployment complete!"
docker compose ps

echo "📋 View logs with: docker compose logs -f"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Then deploy with:
```bash
./deploy.sh
```

## That's It!

With Docker, deployment is now:
1. Configure `.env` files
2. Run `docker compose up -d --build`
3. Done! 🎉

No need to install Node.js, PM2, or manage processes manually. Docker handles everything!
