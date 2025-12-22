# Production Setup Checklist ✅

Use this checklist to ensure your application is production-ready before deploying to DigitalOcean.

## Pre-Deployment Checklist

### Backend Preparation

- [ ] **Environment Variables**
  - [ ] Copy `backend/env.example` to `backend/.env`
  - [ ] Set `NODE_ENV=production`
  - [ ] Configure `MONGODB_URI` (MongoDB Atlas connection string)
  - [ ] Set strong `JWT_SECRET` (generate with: `openssl rand -base64 32`)
  - [ ] Configure Firebase Admin credentials
  - [ ] Configure Razorpay keys
  - [ ] Configure Cloudinary credentials
  - [ ] Configure Eshopbox credentials
  - [ ] Set `CORS_ORIGINS` with your frontend domain(s)
  - [ ] Set `API_BASE_URL` to your backend URL

- [ ] **Database**
  - [ ] MongoDB Atlas cluster created (or local MongoDB configured)
  - [ ] Database connection string obtained
  - [ ] Indexes migrated: `npm run migrate-indexes`

- [ ] **Build**
  - [ ] TypeScript compiles: `npm run build`
  - [ ] All tests pass (if any)
  - [ ] No TypeScript errors

### Frontend Preparation

- [ ] **Environment Variables**
  - [ ] Copy `client/env.example` to `client/.env.local`
  - [ ] Set `NEXT_PUBLIC_SITE_URL` to your frontend URL
  - [ ] Set `NEXT_PUBLIC_API_BASE` to your backend URL
  - [ ] Configure Firebase public config
  - [ ] Set analytics IDs (GA4, GTM, Meta Pixel)
  - [ ] Configure Instagram API (if needed)

- [ ] **Build**
  - [ ] Next.js builds successfully: `npm run build`
  - [ ] No build errors or warnings
  - [ ] Check bundle sizes (should be optimized)

### Server Preparation

- [ ] **DigitalOcean Droplet**
  - [ ] Droplet created (Ubuntu 22.04 LTS recommended)
  - [ ] At least 2GB RAM
  - [ ] SSH access configured
  - [ ] IP address noted

- [ ] **Domain Configuration**
  - [ ] Frontend domain (e.g., www.wildnroot.com)
  - [ ] Backend domain (e.g., api.wildnroot.com)
  - [ ] DNS records ready to point to droplet IP

- [ ] **SSL Certificates**
  - [ ] Domain DNS pointing to server (required for SSL)
  - [ ] Certbot installed on server
  - [ ] SSL certificates will be obtained during deployment

## Deployment Steps Summary

1. **Server Setup** (One-time)
   ```bash
   # Install Node.js, PM2, Nginx
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs nginx git certbot python3-certbot-nginx
   npm install -g pm2
   ```

2. **Clone & Setup Backend**
   ```bash
   cd /var/www
   git clone https://github.com/yourusername/wnr.git
   cd wnr/backend
   npm install --production
   cp env.example .env
   # Edit .env with production values
   npm run build
   npm run migrate-indexes
   npm run start:pm2
   pm2 save
   pm2 startup
   ```

3. **Setup Frontend**
   ```bash
   cd /var/www/wnr/client
   npm install
   cp env.example .env.local
   # Edit .env.local with production values
   npm run build
   pm2 start npm --name "wnr-frontend" -- start
   ```

4. **Configure Nginx** (See DEPLOYMENT_GUIDE.md for full config)
   - Frontend: www.wildnroot.com → localhost:3000
   - Backend: api.wildnroot.com → localhost:5001

5. **Setup SSL**
   ```bash
   certbot --nginx -d wildnroot.com -d www.wildnroot.com
   certbot --nginx -d api.wildnroot.com
   ```

6. **Configure Firewall**
   ```bash
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

## Quick Start Script

For faster deployment, you can use the startup script:

```bash
cd /var/www/wnr/backend
./start.sh
```

This will:
- Check for .env file
- Build if needed
- Start with PM2 if available

## Post-Deployment Verification

After deployment, verify:

- [ ] Backend health check: `curl https://api.wildnroot.com/health`
- [ ] Frontend loads: Visit `https://www.wildnroot.com`
- [ ] API endpoints work: Test a few API calls
- [ ] SSL certificates working (no browser warnings)
- [ ] Logs are being written
- [ ] PM2 shows services running: `pm2 status`
- [ ] Database connection working (check backend logs)

## Monitoring Commands

```bash
# Backend status
pm2 status
pm2 logs wnr-backend
pm2 monit

# Frontend status  
pm2 logs wnr-frontend
# OR if using systemd
systemctl status wnr-frontend

# Nginx status
systemctl status nginx
nginx -t

# Server resources
htop
df -h
free -h
```

## Update Process

When you need to update the application:

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
pm2 restart wnr-frontend
# OR
systemctl restart wnr-frontend
```

## Important Notes

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use strong secrets** - Especially JWT_SECRET
3. **Keep dependencies updated** - Run `npm audit` regularly
4. **Monitor logs** - Check PM2 and Nginx logs regularly
5. **Backup regularly** - Database and important files
6. **Use MongoDB Atlas** - More reliable than self-hosted MongoDB
7. **Enable auto-renewal** - SSL certificates renew automatically with Certbot

## Troubleshooting

See `DEPLOYMENT_GUIDE.md` for detailed troubleshooting steps.

Common issues:
- **502 Bad Gateway**: Check if backend/frontend services are running
- **SSL errors**: Verify DNS is pointing to server, check Certbot logs
- **Connection refused**: Check firewall, verify services are running
- **Database connection fails**: Verify MONGODB_URI is correct

## Security Reminders

- [ ] Strong passwords for all services
- [ ] SSH keys instead of passwords (recommended)
- [ ] Firewall configured correctly
- [ ] Only necessary ports open (22, 80, 443)
- [ ] Regular system updates: `apt update && apt upgrade`
- [ ] Environment variables not exposed in code
- [ ] JWT secret is strong and unique
- [ ] MongoDB credentials secure (use Atlas)
- [ ] API keys rotated periodically

## Need Help?

1. Check the logs first
2. Review DEPLOYMENT_GUIDE.md
3. Verify environment variables
4. Check service status
5. Review troubleshooting section

---

**Your application is now ready for production deployment!** 🚀
