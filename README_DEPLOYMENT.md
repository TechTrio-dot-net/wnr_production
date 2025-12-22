# Wild n' Root - Production Deployment

## Quick Start for DigitalOcean

### 1. Server Setup (One-time)

```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Install Node.js, PM2, Nginx, Git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git certbot python3-certbot-nginx
npm install -g pm2

# Clone repository
cd /var/www
git clone https://github.com/yourusername/wnr.git
```

### 2. Backend Setup

```bash
cd /var/www/wnr/backend

# Install dependencies
npm install --production

# Configure environment
cp env.example .env
nano .env  # Fill in your production values

# Build and start
npm run build
npm run migrate-indexes
npm run start:pm2
pm2 save
pm2 startup  # Follow instructions
```

### 3. Frontend Setup

```bash
cd /var/www/wnr/client

# Install and build
npm install
cp env.example .env.local
nano .env.local  # Fill in your values
npm run build

# Start with PM2 or systemd (see deployment guide)
pm2 start npm --name "wnr-frontend" -- start
```

### 4. Configure Nginx

See `DEPLOYMENT_GUIDE.md` for detailed Nginx configuration.

### 5. Setup SSL

```bash
certbot --nginx -d your-domain.com -d www.your-domain.com
certbot --nginx -d api.your-domain.com
```

## Environment Variables

### Backend (`backend/.env`)
- See `backend/env.example` for required variables
- **Critical**: Set strong `JWT_SECRET` (use `openssl rand -base64 32`)
- Set `MONGODB_URI` (MongoDB Atlas connection string)
- Configure Firebase, Razorpay, Cloudinary, Eshopbox credentials

### Frontend (`client/.env.local`)
- See `client/env.example` for required variables
- Set `NEXT_PUBLIC_API_BASE` to your backend URL
- Configure Firebase public config
- Set analytics IDs

## Important Commands

### Backend
```bash
cd /var/www/wnr/backend
npm run build          # Build TypeScript
npm start             # Start server
npm run start:pm2     # Start with PM2
pm2 logs              # View logs
pm2 restart wnr-backend  # Restart
```

### Frontend
```bash
cd /var/www/wnr/client
npm run build         # Build Next.js
npm start            # Start server
```

### Updates
```bash
cd /var/www/wnr
git pull
cd backend && npm install --production && npm run build && pm2 restart wnr-backend
cd ../client && npm install && npm run build && systemctl restart wnr-frontend
```

## Production Checklist

- [ ] Environment variables configured
- [ ] MongoDB Atlas connection working
- [ ] SSL certificates installed
- [ ] Nginx configured and running
- [ ] PM2 services running
- [ ] Firewall configured (ports 22, 80, 443)
- [ ] Database indexes migrated
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Domain DNS configured

## Documentation

- **Full Deployment Guide**: See `DEPLOYMENT_GUIDE.md`
- **Performance Optimizations**: See `COMPLETE_PERFORMANCE_OPTIMIZATIONS.md`
- **Backend API**: Check backend routes documentation

## Support

For issues, check:
1. PM2 logs: `pm2 logs`
2. Nginx logs: `/var/log/nginx/error.log`
3. System logs: `journalctl -xe`
