# Production Deployment Guide for DigitalOcean 🚀

This guide will help you deploy your Wild n' Root application to DigitalOcean.

## Prerequisites

1. DigitalOcean account
2. Domain name (optional but recommended)
3. MongoDB Atlas account (recommended) or MongoDB installed on server
4. GitHub repository set up

## Step 1: Prepare Your DigitalOcean Droplet

### 1.1 Create a Droplet

1. Log in to DigitalOcean
2. Click "Create" → "Droplets"
3. Choose:
   - **Image**: Ubuntu 22.04 LTS (or latest LTS)
   - **Plan**: Basic Plan, Regular Intel (at least 2GB RAM recommended)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH keys (recommended) or Password
   - **Hostname**: `wnr-production` (or your preferred name)

4. Click "Create Droplet"

### 1.2 Initial Server Setup

SSH into your droplet:
```bash
ssh root@your-droplet-ip
```

Update system packages:
```bash
apt update && apt upgrade -y
```

Install Node.js (using NodeSource):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version  # Should show v20.x.x
npm --version
```

Install PM2 globally (process manager):
```bash
npm install -g pm2
```

Install Git:
```bash
apt install -y git
```

Install Nginx (for reverse proxy):
```bash
apt install -y nginx
```

Install Certbot (for SSL certificates):
```bash
apt install -y certbot python3-certbot-nginx
```

## Step 2: Deploy Backend

### 2.1 Clone Repository

```bash
cd /var/www
git clone https://github.com/yourusername/wnr.git
cd wnr/backend
```

### 2.2 Install Dependencies

```bash
npm install --production
```

### 2.3 Configure Environment Variables

```bash
cp env.example .env
nano .env  # Edit with your production values
```

**Required variables:**
- `NODE_ENV=production`
- `PORT=5001`
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `JWT_SECRET` - Generate a strong secret: `openssl rand -base64 32`
- Firebase credentials
- Razorpay credentials
- Cloudinary credentials
- Eshopbox credentials
- `CORS_ORIGINS` - Your frontend domain(s)

### 2.4 Build Backend

```bash
npm run build
```

### 2.5 Run Database Migrations

```bash
npm run migrate-indexes
```

### 2.6 Start with PM2

```bash
# Create logs directory
mkdir -p logs

# Start with PM2
npm run start:pm2

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions it gives you

# View logs
pm2 logs wnr-backend

# Check status
pm2 status
```

## Step 3: Deploy Frontend

### 3.1 Build Frontend

```bash
cd /var/www/wnr/client
npm install
npm run build
```

### 3.2 Configure Environment Variables

```bash
cp env.example .env.local
nano .env.local
```

**Required variables:**
- `NEXT_PUBLIC_SITE_URL` - Your frontend URL (e.g., https://www.wildnroot.com)
- `NEXT_PUBLIC_API_BASE` - Your backend URL (e.g., https://api.wildnroot.com)
- Firebase public config
- Analytics IDs

### 3.3 Start Frontend with PM2

Create a PM2 config for frontend or use node directly:

```bash
# Option 1: Using PM2
pm2 start npm --name "wnr-frontend" -- start

# Option 2: Using systemd (see Step 5 for better approach)
```

**Better approach**: Use Nginx to serve the Next.js app (see Step 4)

## Step 4: Configure Nginx

### 4.1 Frontend Nginx Configuration

Create `/etc/nginx/sites-available/wildnroot`:

```nginx
server {
    listen 80;
    server_name www.wildnroot.com wildnroot.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.wildnroot.com wildnroot.com;

    ssl_certificate /etc/letsencrypt/live/wildnroot.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wildnroot.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend (Next.js)
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

    # Cache static assets
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4.2 Backend Nginx Configuration

Create `/etc/nginx/sites-available/wildnroot-api`:

```nginx
server {
    listen 80;
    server_name api.wildnroot.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.wildnroot.com;

    ssl_certificate /etc/letsencrypt/live/api.wildnroot.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.wildnroot.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Increase body size for file uploads
    client_max_body_size 10M;

    # Backend API
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

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5001/health;
        access_log off;
    }
}
```

### 4.3 Enable Sites

```bash
# Enable sites
ln -s /etc/nginx/sites-available/wildnroot /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/wildnroot-api /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# If test passes, reload nginx
systemctl reload nginx
```

## Step 5: Setup SSL Certificates

```bash
# Frontend domain
certbot --nginx -d wildnroot.com -d www.wildnroot.com

# Backend domain
certbot --nginx -d api.wildnroot.com

# Auto-renewal (should be enabled by default)
certbot renew --dry-run
```

## Step 6: Configure Domain DNS

### 6.1 Point Domains to Your Droplet

In your domain registrar's DNS settings, add:

**For Frontend (www.wildnroot.com):**
- Type: A
- Name: @ or www
- Value: Your Droplet IP

**For Backend (api.wildnroot.com):**
- Type: A
- Name: api
- Value: Your Droplet IP

Wait for DNS propagation (can take up to 48 hours, usually much faster).

## Step 7: Setup Systemd Service (Optional - Better than PM2 for Next.js)

### 7.1 Frontend Service

Create `/etc/systemd/system/wnr-frontend.service`:

```ini
[Unit]
Description=Wild n Root Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/wnr/client
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
systemctl daemon-reload
systemctl enable wnr-frontend
systemctl start wnr-frontend
systemctl status wnr-frontend
```

## Step 8: Firewall Configuration

```bash
# Allow SSH
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

## Step 9: Monitoring and Maintenance

### 9.1 View Logs

**Backend (PM2):**
```bash
pm2 logs wnr-backend
pm2 monit  # Real-time monitoring
```

**Frontend (systemd):**
```bash
journalctl -u wnr-frontend -f
```

**Nginx:**
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 9.2 Update Application

```bash
cd /var/www/wnr
git pull origin main

# Backend
cd backend
npm install --production
npm run build
pm2 restart wnr-backend

# Frontend
cd ../client
npm install
npm run build
systemctl restart wnr-frontend  # or pm2 restart wnr-frontend
```

### 9.3 Backup Strategy

**Database (MongoDB Atlas):**
- Automatic backups enabled in Atlas dashboard
- Manual backup: Use MongoDB Atlas UI or `mongodump`

**Application Files:**
```bash
# Backup script (create /root/backup.sh)
#!/bin/bash
tar -czf /root/wnr-backup-$(date +%Y%m%d).tar.gz /var/www/wnr
# Upload to DigitalOcean Spaces or other storage
```

## Step 10: Performance Optimization

### 10.1 Enable Gzip Compression (Nginx)

Already included in configurations above, but verify:
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
```

### 10.2 Setup Log Rotation

Create `/etc/logrotate.d/wnr`:
```
/var/www/wnr/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
}
```

## Quick Start Commands

### Start Services
```bash
# Backend
cd /var/www/wnr/backend && pm2 start ecosystem.config.js

# Frontend
systemctl start wnr-frontend
# OR
cd /var/www/wnr/client && pm2 start npm --name "wnr-frontend" -- start
```

### Stop Services
```bash
pm2 stop wnr-backend
systemctl stop wnr-frontend
```

### Restart Services
```bash
pm2 restart wnr-backend
systemctl restart wnr-frontend
```

### View Status
```bash
pm2 status
systemctl status wnr-frontend
nginx -t && systemctl status nginx
```

## Troubleshooting

### Backend won't start
1. Check logs: `pm2 logs wnr-backend`
2. Verify .env file exists and is configured
3. Check MongoDB connection
4. Verify port 5001 is not in use: `netstat -tulpn | grep 5001`

### Frontend won't start
1. Check logs: `journalctl -u wnr-frontend -n 50`
2. Verify .env.local exists
3. Check port 3000: `netstat -tulpn | grep 3000`
4. Verify build succeeded: `ls -la .next/`

### Nginx errors
1. Check configuration: `nginx -t`
2. Check error log: `tail -f /var/log/nginx/error.log`
3. Verify domains point to server: `nslookup wildnroot.com`

### SSL certificate issues
1. Verify DNS is pointing to server
2. Check firewall allows port 80 and 443
3. Re-run certbot: `certbot --nginx -d your-domain.com`

## Security Checklist

- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] SSL certificates installed and auto-renewal enabled
- [ ] Strong JWT_SECRET set
- [ ] Database credentials secure (use MongoDB Atlas)
- [ ] Environment variables not committed to git
- [ ] Regular system updates: `apt update && apt upgrade`
- [ ] PM2/systemd services running as non-root user
- [ ] File permissions set correctly
- [ ] Backups configured

## Additional Resources

- [DigitalOcean Documentation](https://docs.digitalocean.com/)
- [MongoDB Atlas Setup](https://www.mongodb.com/docs/atlas/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

**Need Help?** Check the logs first, then refer to troubleshooting section above.
