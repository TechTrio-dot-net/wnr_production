# Quick Start: Deploy to DigitalOcean 🚀

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] DigitalOcean account
- [ ] Domain name (optional but recommended)
- [ ] MongoDB Atlas account (recommended)
- [ ] GitHub repository with your code

## Step 1: Create DigitalOcean Droplet (5 minutes)

1. Log in to DigitalOcean
2. Create → Droplets
3. Choose:
   - Ubuntu 22.04 LTS
   - Basic Plan, 2GB RAM minimum
   - Your preferred datacenter
   - SSH keys or password
4. Create Droplet

## Step 2: Initial Server Setup (10 minutes)

SSH into your droplet:
```bash
ssh root@your-droplet-ip
```

Run these commands:
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 and other tools
npm install -g pm2
apt install -y nginx git certbot python3-certbot-nginx

# Clone your repository
cd /var/www
git clone https://github.com/yourusername/wnr.git
cd wnr
```

## Step 3: Setup Backend (5 minutes)

```bash
cd backend

# Install dependencies
npm install --production

# Configure environment
cp env.example .env
nano .env  # Edit with your production values

# Build and start
npm run build
npm run migrate-indexes
npm run start:pm2
pm2 save
pm2 startup  # Follow the instructions
```

**Critical .env variables:**
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `JWT_SECRET` - Generate: `openssl rand -base64 32`
- Firebase, Razorpay, Cloudinary, Eshopbox credentials
- `CORS_ORIGINS` - Your frontend domain

## Step 4: Setup Frontend (5 minutes)

```bash
cd ../client

# Install and build
npm install
cp env.example .env.local
nano .env.local  # Edit with your production values
npm run build

# Start
pm2 start npm --name "wnr-frontend" -- start
pm2 save
```

**Critical .env.local variables:**
- `NEXT_PUBLIC_SITE_URL` - Your frontend URL (e.g., https://www.wildnroot.com)
- `NEXT_PUBLIC_API_BASE` - Your backend URL (e.g., https://api.wildnroot.com)
- Firebase public config

## Step 5: Configure Nginx (10 minutes)

Create frontend config `/etc/nginx/sites-available/wildnroot`:
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

Create backend config `/etc/nginx/sites-available/wildnroot-api`:
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

Enable sites:
```bash
ln -s /etc/nginx/sites-available/wildnroot /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/wildnroot-api /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl reload nginx
```

## Step 6: Setup SSL (5 minutes)

```bash
# Frontend
certbot --nginx -d wildnroot.com -d www.wildnroot.com

# Backend
certbot --nginx -d api.wildnroot.com
```

## Step 7: Configure DNS (5 minutes)

In your domain registrar, point domains to your droplet IP:

**A Records:**
- `@` or `www` → Your droplet IP (for frontend)
- `api` → Your droplet IP (for backend)

Wait for DNS propagation (usually 5-60 minutes).

## Step 8: Configure Firewall (2 minutes)

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Step 9: Verify Deployment (5 minutes)

1. Check backend: `curl https://api.wildnroot.com/health`
2. Visit frontend: `https://www.wildnroot.com`
3. Check PM2: `pm2 status`
4. Check Nginx: `systemctl status nginx`

## Common Commands

```bash
# View logs
pm2 logs
pm2 logs wnr-backend
pm2 logs wnr-frontend

# Restart services
pm2 restart wnr-backend
pm2 restart wnr-frontend

# Update application
cd /var/www/wnr
git pull
cd backend && npm install --production && npm run build && pm2 restart wnr-backend
cd ../client && npm install && npm run build && pm2 restart wnr-frontend

# Check status
pm2 status
systemctl status nginx
```

## Troubleshooting

**502 Bad Gateway:**
- Check if services are running: `pm2 status`
- Check logs: `pm2 logs`

**SSL errors:**
- Verify DNS points to server
- Re-run certbot if needed

**Database connection fails:**
- Verify MONGODB_URI in .env
- Check MongoDB Atlas IP whitelist

## That's It! 🎉

Your application should now be live!

For detailed information, see:
- `DEPLOYMENT_GUIDE.md` - Complete guide
- `PRODUCTION_SETUP.md` - Checklist
- `PRODUCTION_READY_SUMMARY.md` - Overview
