# Docker Droplet Optimization Guide 🚀

Optimized configuration for fast performance on DigitalOcean Droplets!

## Performance Optimizations Applied

### 1. Resource Limits (docker-compose.prod.yml)

**Backend:**
- CPU Limit: 1.5 cores
- Memory Limit: 768MB
- CPU Reservation: 0.75 cores
- Memory Reservation: 384MB

**Frontend:**
- CPU Limit: 1.0 core
- Memory Limit: 512MB
- CPU Reservation: 0.5 cores
- Memory Reservation: 256MB

**Admin UI:**
- CPU Limit: 1.0 core
- Memory Limit: 512MB
- CPU Reservation: 0.5 cores
- Memory Reservation: 256MB

### 2. Node.js Optimizations

All containers include:
```bash
NODE_OPTIONS=--max-old-space-size=512 --enable-source-maps
```

This optimizes:
- Memory allocation for Node.js
- Better garbage collection
- Source maps for debugging (production)

### 3. Multi-stage Builds

All Dockerfiles use multi-stage builds:
- Smaller final images (~50-70% reduction)
- Faster deployments
- Better security (fewer dependencies in production)

### 4. Health Checks

All services have health checks:
- Interval: 30s
- Timeout: 3s
- Retries: 3
- Start period: 40s

### 5. Restart Policies

- Production: `always` (auto-restart on failure)
- Development: `unless-stopped` (manual control)

## Recommended Droplet Specifications

### Minimum (Small Projects)
- **Size**: 2GB RAM / 1 vCPU
- **Cost**: ~$12/month
- **Best for**: Testing, small deployments

### Recommended (Production)
- **Size**: 4GB RAM / 2 vCPU
- **Cost**: ~$24/month
- **Best for**: Production workloads, moderate traffic

### High Performance (High Traffic)
- **Size**: 8GB RAM / 4 vCPU
- **Cost**: ~$48/month
- **Best for**: High traffic, scaling needs

## Droplet Setup for Maximum Performance

### 1. Initial Server Setup

```bash
# Update system
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git build-essential
```

### 2. Docker Installation

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Add current user to docker group (optional)
usermod -aG docker $USER

# Verify installation
docker --version
docker compose version
```

### 3. System Optimizations

#### Increase File Descriptor Limits

```bash
# Edit limits.conf
nano /etc/security/limits.conf

# Add these lines:
* soft nofile 65535
* hard nofile 65535

# Edit sysctl.conf
nano /etc/sysctl.conf

# Add these optimizations:
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.ip_local_port_range = 10000 65535
vm.swappiness = 10
vm.dirty_ratio = 60
vm.dirty_background_ratio = 2

# Apply changes
sysctl -p
```

#### Configure Swap (Optional, for smaller droplets)

```bash
# Create 2GB swap file
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make it permanent
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
```

### 4. Docker Daemon Optimization

Create/edit `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65535,
      "Soft": 65535
    }
  }
}
```

Restart Docker:
```bash
systemctl restart docker
```

### 5. Firewall Configuration

```bash
# Enable UFW
ufw enable

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Check status
ufw status
```

### 6. Deployment

```bash
# Clone repository
cd /var/www
git clone https://github.com/yourusername/wnr.git
cd wnr

# Configure environment
cp backend/env.example backend/.env
cp client/env.example client/.env.local
cp adminui/env.example adminui/.env.local

# Edit environment files
nano backend/.env
nano client/.env.local
nano adminui/.env.local

# Deploy with optimized production config
./deploy.sh prod
```

## Monitoring & Maintenance

### Check Resource Usage

```bash
# Container stats
docker stats

# System resources
htop
# or
free -h
df -h
```

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f adminui
```

### Health Checks

```bash
# Backend
curl http://localhost:5001/health

# Frontend
curl http://localhost:3000

# Admin UI
curl http://localhost:3001
```

## Performance Tips

### 1. Database Optimization

Use MongoDB Atlas (recommended):
- Better performance
- Managed backups
- Global distribution
- Auto-scaling

### 2. CDN for Static Assets

Use Cloudflare or similar:
- Faster static asset delivery
- Reduced server load
- Global caching

### 3. Image Optimization

All Next.js apps are configured with:
- AVIF and WebP formats
- Lazy loading
- Responsive images
- Blur placeholders

### 4. Caching Strategy

Backend includes:
- API response caching
- Database query optimization
- Compression middleware

Frontend includes:
- React Query caching
- Static asset caching
- Image optimization

### 5. Log Rotation

Docker is configured with log rotation:
- Max size: 10MB per log file
- Max files: 3
- Prevents disk space issues

## Scaling Options

### Vertical Scaling (Increase Droplet Size)

```bash
# On DigitalOcean dashboard:
# 1. Power off droplet
# 2. Resize droplet
# 3. Power on droplet
# 4. Restart containers
docker compose -f docker-compose.prod.yml restart
```

### Horizontal Scaling (Multiple Instances)

For high traffic, consider:
1. Load balancer (Nginx/HAProxy)
2. Multiple backend instances
3. Multiple frontend instances
4. Database replication

Example Nginx load balancer config:
```nginx
upstream backend {
    least_conn;
    server localhost:5001;
    server localhost:5002;  # Additional instance
}

server {
    location /api {
        proxy_pass http://backend;
    }
}
```

## Troubleshooting Performance

### High Memory Usage

```bash
# Check memory usage
docker stats

# Check system memory
free -h

# If needed, increase droplet size or optimize containers
```

### High CPU Usage

```bash
# Check CPU usage
top
htop

# Identify high CPU containers
docker stats

# Check logs for errors
docker compose logs | grep -i error
```

### Slow Response Times

1. Check database connection
2. Verify MongoDB Atlas performance
3. Check network latency
4. Review application logs
5. Consider CDN for static assets

## Cost Optimization

### Right-Sizing

- Monitor actual usage
- Scale down if resources unused
- Scale up only when needed

### Reserved Instances

- 20% discount for annual plans
- Predictable costs

### Droplet Snapshots

- Regular backups
- Easy recovery
- Test changes before applying

## Security Hardening

All containers run as non-root users:
- Backend: `nodejs` user (UID 1001)
- Frontend: `nextjs` user (UID 1001)
- Admin UI: `nextjs` user (UID 1001)

Additional security:
- Firewall configured
- SSL/TLS certificates
- Environment variables secured
- Network isolation

## Summary

Your Docker setup is optimized for:
- ✅ Fast performance
- ✅ Resource efficiency
- ✅ Auto-scaling readiness
- ✅ Production reliability
- ✅ Cost optimization

Just deploy with `./deploy.sh prod` and your application will run optimally on any DigitalOcean droplet! 🚀
