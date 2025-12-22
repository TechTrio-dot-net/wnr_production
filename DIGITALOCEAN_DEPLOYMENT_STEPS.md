# Complete DigitalOcean Deployment Guide 🚀

Step-by-step guide to deploy your Wild n' Root application to DigitalOcean.

---

## 📋 Pre-Deployment Checklist

Before starting, ensure you have:
- [ ] DigitalOcean account created
- [ ] Domain name ready (wildnroot.com)
- [ ] GitHub repository with your code (or Git repository)
- [ ] MongoDB Atlas account (or MongoDB setup)
- [ ] All API keys ready (Firebase, Razorpay, Cloudinary, Eshopbox)
- [ ] DNS access to configure records

---

## Step 1: Push Code to Git Repository (5 minutes)

### 1.1 Initialize Git (if not already done)

```bash
# On your local machine, in the project directory
cd /Users/adarshsharma/Downloads/wnr

# Check if git is initialized
git status

# If not initialized, run:
git init
git add .
git commit -m "Initial commit - Production ready"
```

### 1.2 Push to GitHub (or your Git provider)

```bash
# If you haven't added remote yet
git remote add origin https://github.com/yourusername/wnr.git

# Or if using SSH
git remote add origin git@github.com:yourusername/wnr.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Note:** Make sure `.env` files are in `.gitignore` (they should be excluded from git).

---

## Step 2: Create DigitalOcean Droplet (5 minutes)

### 2.1 Create Droplet

1. Log in to [DigitalOcean](https://cloud.digitalocean.com/)
2. Click **"Create"** → **"Droplets"**
3. Configure:
   - **Image**: Ubuntu 22.04 LTS (or latest LTS)
   - **Plan**: 
     - **Basic Plan**: Regular Intel
     - **Size**: 2GB RAM / 1 vCPU minimum (4GB recommended for production)
     - **Storage**: 25GB SSD minimum
   - **Datacenter**: Choose closest to your users (Bangalore/Mumbai for India)
   - **Authentication**: 
     - SSH keys (recommended for security)
     - OR Root password (easier for quick setup)
   - **Hostname**: `wnr-production`
   - **Tags**: Optional (e.g., `production`, `wnr`)
4. Click **"Create Droplet"**
5. **Note your droplet's IP address** (you'll need this)

---

## Step 3: Initial Server Setup (10 minutes)

### 3.1 SSH into Your Droplet

```bash
# From your local machine
ssh root@YOUR_DROPLET_IP

# If using password, you'll be prompted for it
# If using SSH keys, it should connect automatically
```

### 3.2 Update System

```bash
# Update package list and upgrade system
apt update && apt upgrade -y
```

### 3.3 Install Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version

# Add current user to docker group (optional, if not using root)
# usermod -aG docker $USER
```

### 3.4 Install Additional Tools

```bash
# Install Git (if not already installed)
apt install -y git

# Install Nginx (for reverse proxy)
apt install -y nginx

# Install Certbot (for SSL certificates)
apt install -y certbot python3-certbot-nginx

# Install useful tools
apt install -y curl wget nano ufw
```

### 3.5 Configure Firewall (Optional but Recommended)

```bash
# Allow SSH
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status
```

---

## Step 4: Clone Repository (2 minutes)

```bash
# Create directory for applications
mkdir -p /var/www
cd /var/www

# Clone your repository
git clone https://github.com/yourusername/wnr.git

# Or if using private repo with SSH
# git clone git@github.com:yourusername/wnr.git

# Navigate to project
cd wnr

# Verify files
ls -la
```

---

## Step 5: Configure Environment Variables (15 minutes)

### 5.1 Backend Environment

```bash
cd /var/www/wnr/backend

# Copy example file
cp env.example .env

# Edit environment file
nano .env
```

**Required variables to set:**

```bash
NODE_ENV=production
PORT=5001

# MongoDB (use MongoDB Atlas connection string)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wnr?retryWrites=true&w=majority

# Generate JWT secret (run on server: openssl rand -base64 32)
JWT_SECRET=your-generated-jwt-secret-here-min-32-chars
JWT_EXPIRES_IN=7d

# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@project.iam.gserviceaccount.com

# Razorpay
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Eshopbox
ESHOPBOX_CLIENT_ID=your-client-id
ESHOPBOX_SECRET=your-secret
ESHOPBOX_REFRESH_TOKEN=your-refresh-token
ESHOPBOX_BASE_URL=https://wild-n-root.myeshopbox.com

# CORS - IMPORTANT: Include admin subdomain
CORS_ORIGINS=^https://wildnroot\.com$,^https://www\.wildnroot\.com$,^https://admin\.wildnroot\.com$

# API Base URL
API_BASE_URL=https://api.wildnroot.com
```

**Save and exit nano**: Press `Ctrl+X`, then `Y`, then `Enter`

### 5.2 Client/Frontend Environment

```bash
cd /var/www/wnr/client

# Copy example file
cp env.example .env.local

# Edit environment file
nano .env.local
```

**Required variables:**

```bash
NEXT_PUBLIC_SITE_URL=https://www.wildnroot.com
NEXT_PUBLIC_API_BASE=https://api.wildnroot.com

# Firebase (public config)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Analytics (optional)
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

**Save and exit**: `Ctrl+X`, `Y`, `Enter`

### 5.3 Admin UI Environment

```bash
cd /var/www/wnr/adminui

# Copy example file
cp env.example .env.local

# Edit environment file
nano .env.local
```

**Required variables:**

```bash
# CRITICAL: Must use public API URL (not internal Docker URL)
NEXT_PUBLIC_API_BASE=https://api.wildnroot.com

# Optional: Admin panel URL
# NEXT_PUBLIC_ADMIN_URL=https://admin.wildnroot.com

# Firebase (if admin uses Firebase auth)
# NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
# NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

**Save and exit**: `Ctrl+X`, `Y`, `Enter`

---

## Step 6: Deploy with Docker (5 minutes)

### 6.1 Make Deploy Script Executable

```bash
cd /var/www/wnr

# Make deploy script executable
chmod +x deploy.sh
```

### 6.2 Deploy All Services

```bash
# Deploy production configuration
./deploy.sh prod

# OR manually:
docker compose -f docker-compose.prod.yml up -d --build
```

### 6.3 Verify Services are Running

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Test health endpoints
curl http://localhost:5001/health
curl http://localhost:3000
curl http://localhost:3001
```

You should see all containers running:
- `wnr-backend` (port 5001)
- `wnr-frontend` (port 3000)
- `wnr-adminui` (port 3001)

---

## Step 7: Configure Nginx Reverse Proxy (15 minutes)

### 7.1 Remove Default Nginx Config

```bash
# Remove default site
rm /etc/nginx/sites-enabled/default
```

### 7.2 Create Nginx Configuration for Frontend

```bash
nano /etc/nginx/sites-available/wildnroot-frontend
```

Paste this configuration:

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name www.wildnroot.com wildnroot.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server for frontend
server {
    listen 443 ssl http2;
    server_name www.wildnroot.com wildnroot.com;

    # SSL certificates (will be configured by Certbot)
    # ssl_certificate /etc/letsencrypt/live/wildnroot.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/wildnroot.com/privkey.pem;

    # Proxy to frontend container
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Cache static assets
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
        expires 1y;
    }
}
```

**Save and exit**: `Ctrl+X`, `Y`, `Enter`

### 7.3 Create Nginx Configuration for API

```bash
nano /etc/nginx/sites-available/wildnroot-api
```

Paste this configuration:

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name api.wildnroot.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server for API
server {
    listen 443 ssl http2;
    server_name api.wildnroot.com;

    # SSL certificates (will be configured by Certbot)
    # ssl_certificate /etc/letsencrypt/live/api.wildnroot.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/api.wildnroot.com/privkey.pem;

    # Proxy to backend container
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check endpoint (no logging)
    location /health {
        proxy_pass http://localhost:5001/health;
        access_log off;
    }
}
```

**Save and exit**: `Ctrl+X`, `Y`, `Enter`

### 7.4 Create Nginx Configuration for Admin Panel

```bash
nano /etc/nginx/sites-available/wildnroot-admin
```

Paste this configuration:

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name admin.wildnroot.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server for admin panel
server {
    listen 443 ssl http2;
    server_name admin.wildnroot.com;

    # SSL certificates (will be configured by Certbot)
    # ssl_certificate /etc/letsencrypt/live/admin.wildnroot.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/admin.wildnroot.com/privkey.pem;

    # Proxy to admin UI container
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Cache static assets
    location /_next/static {
        proxy_pass http://localhost:3001;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
        expires 1y;
    }
}
```

**Save and exit**: `Ctrl+X`, `Y`, `Enter`

### 7.5 Enable Nginx Sites

```bash
# Enable sites
ln -s /etc/nginx/sites-available/wildnroot-frontend /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/wildnroot-api /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/wildnroot-admin /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# If test passes, reload Nginx
systemctl reload nginx
```

---

## Step 8: Configure DNS Records (5 minutes)

Before setting up SSL, configure your DNS records in Cloudflare (or your DNS provider):

### Required DNS Records:

1. **Frontend (www.wildnroot.com)**
   ```
   Type: CNAME
   Name: www
   Value: [Your Droplet IP] (or use A record)
   Proxy: Proxied (Orange Cloud)
   ```

2. **API (api.wildnroot.com)**
   ```
   Type: A (or CNAME)
   Name: api
   Value: YOUR_DROPLET_IP
   Proxy: Proxied
   ```

3. **Admin Panel (admin.wildnroot.com)** ⚠️ **ADD THIS**
   ```
   Type: A (or CNAME)
   Name: admin
   Value: YOUR_DROPLET_IP
   Proxy: Proxied
   ```

4. **Root Domain (wildnroot.com)**
   ```
   Type: A
   Name: @ (or blank)
   Value: YOUR_DROPLET_IP
   Proxy: Proxied
   ```

**Wait 5-10 minutes** for DNS propagation before proceeding to SSL setup.

---

## Step 9: Setup SSL Certificates (10 minutes)

### 9.1 Get SSL Certificates

```bash
# Frontend (www + root domain)
certbot --nginx -d www.wildnroot.com -d wildnroot.com

# API
certbot --nginx -d api.wildnroot.com

# Admin Panel
certbot --nginx -d admin.wildnroot.com
```

Certbot will:
- Automatically update Nginx config files with SSL certificates
- Set up automatic renewal
- Test the configuration

### 9.2 Test SSL Renewal

```bash
# Test renewal process (dry run)
certbot renew --dry-run
```

---

## Step 10: Verify Deployment (5 minutes)

### 10.1 Test from Browser

1. **Frontend**: Visit `https://www.wildnroot.com`
2. **API Health**: Visit `https://api.wildnroot.com/health`
3. **Admin Panel**: Visit `https://admin.wildnroot.com`

### 10.2 Test API Connection

```bash
# From your local machine or server
curl https://api.wildnroot.com/health
```

### 10.3 Check Container Logs

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f adminui
```

---

## Step 11: Set Up Auto-Start on Boot (2 minutes)

Docker Compose with `restart: always` in `docker-compose.prod.yml` should already handle this, but verify:

```bash
# Check if containers start on boot
docker compose -f docker-compose.prod.yml ps

# Restart server to test (optional - only if you want to verify)
# reboot
```

After reboot, containers should automatically start.

---

## Step 12: Future Updates (5 minutes)

When you need to update your code:

```bash
# SSH into server
ssh root@YOUR_DROPLET_IP

# Navigate to project
cd /var/www/wnr

# Pull latest code
git pull origin main

# Rebuild and restart containers
docker compose -f docker-compose.prod.yml up -d --build

# Check logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## 🎉 Deployment Complete!

Your application should now be live at:
- **Frontend**: https://www.wildnroot.com
- **API**: https://api.wildnroot.com
- **Admin Panel**: https://admin.wildnroot.com

---

## 🔧 Useful Commands

### Docker Commands

```bash
# View running containers
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart a service
docker compose -f docker-compose.prod.yml restart backend

# Stop all services
docker compose -f docker-compose.prod.yml down

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

### Nginx Commands

```bash
# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx

# Restart Nginx
systemctl restart nginx

# View Nginx status
systemctl status nginx
```

### System Commands

```bash
# View disk usage
df -h

# View memory usage
free -h

# View running processes
htop  # or: top

# View system logs
journalctl -u nginx -f
```

---

## 🐛 Troubleshooting

### Containers Not Starting

```bash
# Check logs for errors
docker compose -f docker-compose.prod.yml logs

# Check container status
docker compose -f docker-compose.prod.yml ps -a

# Restart specific container
docker compose -f docker-compose.prod.yml restart backend
```

### SSL Certificate Issues

```bash
# Check certificate status
certbot certificates

# Renew certificate manually
certbot renew

# Check Nginx SSL config
nginx -t
```

### DNS Issues

```bash
# Check DNS resolution
nslookup www.wildnroot.com
nslookup api.wildnroot.com
nslookup admin.wildnroot.com

# Check from server
curl -I http://localhost:3000
curl -I http://localhost:5001/health
curl -I http://localhost:3001
```

### Port Conflicts

```bash
# Check what's using ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :5001
netstat -tulpn | grep :3001

# If ports are in use, stop the conflicting service or change ports in docker-compose.prod.yml
```

---

## 📞 Need Help?

If you encounter issues:
1. Check container logs: `docker compose logs -f`
2. Check Nginx error logs: `tail -f /var/log/nginx/error.log`
3. Verify environment variables are set correctly
4. Ensure DNS records are pointing to your droplet IP
5. Verify SSL certificates are valid: `certbot certificates`

---

## ✅ Deployment Checklist Summary

- [ ] Code pushed to Git repository
- [ ] DigitalOcean droplet created
- [ ] Docker and tools installed
- [ ] Repository cloned to server
- [ ] Environment variables configured (backend, client, adminui)
- [ ] Services deployed with Docker
- [ ] Nginx configured for all subdomains
- [ ] DNS records configured (www, api, admin)
- [ ] SSL certificates obtained
- [ ] All services accessible via HTTPS
- [ ] Auto-start on boot verified

**Congratulations! Your application is now live! 🎉**

