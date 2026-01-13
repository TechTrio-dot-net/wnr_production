# Quick Migration Checklist

Use this checklist to ensure a smooth migration from Railway/Vercel to Digital Ocean + MongoDB Atlas.

## Pre-Migration

- [ ] Create MongoDB Atlas account
- [ ] Create MongoDB Atlas cluster (M0 free or M10 for production)
- [ ] Configure MongoDB Atlas network access (whitelist IPs)
- [ ] Create MongoDB Atlas database user
- [ ] Get MongoDB Atlas connection string
- [ ] Create Digital Ocean account
- [ ] Create Digital Ocean Droplet (4GB RAM recommended)
- [ ] Set up SSH access to Digital Ocean droplet

## Data Migration

- [ ] Export data from current database (Railway/local)
- [ ] Import data to MongoDB Atlas
- [ ] Verify data integrity (check record counts)
- [ ] Test database queries in MongoDB Atlas

## Configuration Updates

### Backend
- [ ] Update `backend/.env` with MongoDB Atlas connection string
- [ ] Update `backend/.env` CORS_ORIGINS with your domains
- [ ] Update `backend/.env` API_BASE_URL
- [ ] Verify all API keys (Firebase, Razorpay, Cloudinary, Eshopbox)

### Frontend
- [ ] Update `client/.env.local` with NEXT_PUBLIC_API_BASE
- [ ] Update `client/.env.local` with NEXT_PUBLIC_SITE_URL
- [ ] Verify Firebase configuration
- [ ] Verify analytics IDs (GA4, GTM, Meta Pixel)

### Admin UI
- [ ] Update `adminui/.env.local` with NEXT_PUBLIC_API_BASE
- [ ] Verify all admin panel configurations

## Digital Ocean Setup

- [ ] Install Docker on Digital Ocean droplet
- [ ] Install Docker Compose on Digital Ocean droplet
- [ ] Clone repository to Digital Ocean droplet
- [ ] Configure all environment files on server
- [ ] Set up domain DNS records (A records for @, api, admin)
- [ ] Configure Nginx (update server_name directives)
- [ ] Set up SSL certificates with Let's Encrypt
- [ ] Configure firewall (UFW) - allow ports 22, 80, 443

## Deployment

- [ ] Run initial deployment: `./scripts/deploy-server.sh`
- [ ] Verify all containers are running: `docker compose -f docker-compose.prod.yml ps`
- [ ] Check backend health: `curl http://localhost:5001/health`
- [ ] Check frontend: `curl http://localhost:3000`
- [ ] Check admin UI: `curl http://localhost:3001`
- [ ] Test API endpoints from browser/Postman
- [ ] Test cart operations (add to cart, update, remove)
- [ ] Verify database connections in MongoDB Atlas dashboard

## Testing

- [ ] Test user authentication (login, logout)
- [ ] Test cart operations (should be fast now!)
- [ ] Test checkout flow
- [ ] Test admin panel access
- [ ] Test product browsing
- [ ] Test blog functionality
- [ ] Test payment integration (test mode)
- [ ] Monitor MongoDB Atlas metrics for connection issues
- [ ] Check application logs for errors

## DNS Cutover

- [ ] Update DNS records to point to Digital Ocean
- [ ] Wait for DNS propagation (check with `dig` or `nslookup`)
- [ ] Test production URLs:
  - [ ] https://wildnroot.com
  - [ ] https://api.wildnroot.com
  - [ ] https://admin.wildnroot.com
- [ ] Verify SSL certificates are working
- [ ] Test from different locations/devices

## Post-Migration

- [ ] Set up MongoDB Atlas automated backups
- [ ] Configure monitoring alerts (Digital Ocean + MongoDB Atlas)
- [ ] Set up database indexes for optimal performance
- [ ] Review MongoDB Atlas Performance Advisor
- [ ] Document any custom configurations
- [ ] Update team on new infrastructure
- [ ] Cancel Railway/Vercel subscriptions (after verification period)

## Performance Verification

- [ ] Test cart add operation (should be < 2 seconds)
- [ ] Test cart update operation
- [ ] Test cart remove operation
- [ ] Monitor MongoDB Atlas connection pool usage
- [ ] Check API response times
- [ ] Verify no connection timeouts
- [ ] Check Digital Ocean droplet resource usage

## Rollback Plan (if needed)

- [ ] Keep Railway/Vercel running during migration
- [ ] Document rollback steps
- [ ] Test rollback procedure
- [ ] Have MongoDB Atlas backup ready

---

## Key Environment Variables Reference

### Backend (.env)
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/wnr?retryWrites=true&w=majority
CORS_ORIGINS=^https://wildnroot\.com$,^https://www\.wildnroot\.com$,^https://admin\.wildnroot\.com$
API_BASE_URL=https://api.wildnroot.com
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_BASE=https://api.wildnroot.com
NEXT_PUBLIC_SITE_URL=https://www.wildnroot.com
```

### Admin UI (.env.local)
```env
NEXT_PUBLIC_API_BASE=https://api.wildnroot.com
```

---

**Migration Date**: _______________
**Completed By**: _______________
**Notes**: _______________

