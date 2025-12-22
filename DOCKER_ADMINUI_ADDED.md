# Admin UI Added to Docker! ✅

The Admin UI has been successfully integrated into the Docker deployment!

## What's New

### Admin UI Container

- **Port**: 3001
- **Container Name**: `wnr-adminui`
- **Health Checks**: Enabled
- **Resource Limits**: Optimized for production
- **Auto-restart**: Enabled

### Updated Files

1. **`adminui/Dockerfile`** - New Dockerfile for Admin UI
2. **`adminui/.dockerignore`** - Optimized build exclusions
3. **`adminui/next.config.ts`** - Added `output: 'standalone'` for Docker
4. **`adminui/env.example`** - Environment variable template
5. **`docker-compose.yml`** - Added adminui service
6. **`docker-compose.prod.yml`** - Added adminui with resource limits
7. **`deploy.sh`** - Updated to check/adminui env file
8. **`Makefile`** - Added adminui commands
9. **`nginx/conf.d/default.conf`** - Added admin UI reverse proxy config

## Service URLs

After deployment:
- **Frontend**: http://localhost:3000
- **Admin UI**: http://localhost:3001
- **Backend API**: http://localhost:5001
- **Health Check**: http://localhost:5001/health

## Quick Start

### 1. Configure Environment

```bash
# Admin UI environment
cd adminui
cp env.example .env.local
# Edit .env.local with your values
```

### 2. Deploy

```bash
# From project root
./deploy.sh prod
```

That's it! Admin UI is now running!

## Configuration

### Environment Variables

**`adminui/.env.local`:**
```bash
NEXT_PUBLIC_API_BASE=http://localhost:5001
# Or in Docker: http://backend:5001 (internal)
# Or production: https://api.wildnroot.com
```

### Resource Limits (Production)

- **CPU Limit**: 1.0 core
- **Memory Limit**: 512MB
- **CPU Reservation**: 0.5 cores
- **Memory Reservation**: 256MB

### Node.js Optimizations

```bash
NODE_OPTIONS=--max-old-space-size=512
```

## Make Commands

New commands available:

```bash
make logs-adminui    # View adminui logs
make shell-adminui   # Access adminui container shell
make health          # Check all services (including adminui)
```

## Nginx Configuration

If using Nginx reverse proxy, Admin UI is configured at:

```nginx
server {
    server_name admin.*;
    location / {
        proxy_pass http://adminui:3001;
    }
}
```

Access via: `http://admin.yourdomain.com`

## Updates

To update Admin UI:

```bash
git pull
./deploy.sh prod
# Or
docker compose -f docker-compose.prod.yml up -d --build adminui
```

## Troubleshooting

### Check Admin UI Status

```bash
docker compose ps adminui
docker compose logs adminui
```

### Health Check

```bash
curl http://localhost:3001
```

### Access Container

```bash
docker compose exec adminui sh
```

## Performance

The Admin UI is optimized with:
- ✅ Multi-stage Docker build
- ✅ Next.js standalone output
- ✅ Resource limits
- ✅ Health checks
- ✅ Node.js memory optimization
- ✅ Auto-restart on failure

## Summary

✅ Admin UI fully integrated
✅ Production-ready
✅ Optimized for performance
✅ Easy to deploy and maintain

Everything works with a single command: `./deploy.sh prod`! 🎉
