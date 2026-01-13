# Migration Summary: Railway/Vercel → Digital Ocean + MongoDB Atlas

## What Was Changed

### ✅ Database Connection Optimization

**File: `backend/src/lib/db.ts`**
- Optimized `connectDB()` function to return immediately if already connected (no async overhead)
- Added connection timeout protection (10 seconds)
- Connection pooling already configured for MongoDB Atlas:
  - `maxPoolSize: 10` - Maximum connections
  - `minPoolSize: 2` - Minimum connections  
  - `serverSelectionTimeoutMS: 5000` - Fast server selection
  - `retryWrites: true` - Automatic retry on failures

**Impact**: Cart operations should now be much faster (< 2 seconds instead of 1+ minute)

### ✅ Removed Railway/Vercel Hardcoded URLs

**Files Updated:**
1. `backend/src/server.ts` - Removed Vercel URLs from CORS defaults
2. `adminui/next.config.ts` - Removed Railway URL, now uses env var
3. `client/next.config.ts` - Removed Railway reference in comments
4. `client/src/lib/blog.ts` - Removed Railway URL, uses env var
5. `client/src/components/home/IngredientsStrip.tsx` - Removed Railway URL
6. `client/src/components/layout/OfferStrip.tsx` - Removed Railway URL
7. `backend/env.example` - Updated CORS examples

**All URLs now use environment variables:**
- `NEXT_PUBLIC_API_BASE` for frontend/admin
- `CORS_ORIGINS` for backend CORS
- Defaults to `https://api.wildnroot.com` in production

### ✅ Documentation Created

1. **MIGRATION_GUIDE.md** - Complete step-by-step migration guide
2. **QUICK_MIGRATION_CHECKLIST.md** - Quick reference checklist
3. **MIGRATION_SUMMARY.md** - This file

## Next Steps for You

### 1. Set Up MongoDB Atlas (15 minutes)

1. Create account at https://www.mongodb.com/cloud/atlas/register
2. Create a cluster (M0 free tier for testing, M10 for production)
3. Configure network access (add `0.0.0.0/0` for testing or your Digital Ocean IP)
4. Create database user
5. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/wnr?retryWrites=true&w=majority`

### 2. Migrate Your Data

**Option A: Using MongoDB Compass (Easiest)**
- Download MongoDB Compass
- Connect to current database
- Export collections
- Connect to MongoDB Atlas
- Import data

**Option B: Using mongodump/mongorestore**
```bash
# Export from current DB
mongodump --uri="your-current-uri" --out=/tmp/backup

# Import to Atlas
mongorestore --uri="your-atlas-uri" /tmp/backup/wnr
```

### 3. Set Up Digital Ocean (30 minutes)

1. Create Droplet (4GB RAM, 2 vCPU recommended - $24/month)
2. Install Docker:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   apt install docker-compose-plugin -y
   ```
3. Clone your repository
4. Configure environment files (see MIGRATION_GUIDE.md)

### 4. Update Environment Variables

**Backend (`backend/.env`):**
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/wnr?retryWrites=true&w=majority
CORS_ORIGINS=^https://wildnroot\.com$,^https://www\.wildnroot\.com$,^https://admin\.wildnroot\.com$
API_BASE_URL=https://api.wildnroot.com
```

**Frontend (`client/.env.local`):**
```env
NEXT_PUBLIC_API_BASE=https://api.wildnroot.com
NEXT_PUBLIC_SITE_URL=https://www.wildnroot.com
```

**Admin UI (`adminui/.env.local`):**
```env
NEXT_PUBLIC_API_BASE=https://api.wildnroot.com
```

### 5. Deploy

```bash
cd ~/wnr
./scripts/deploy-server.sh
```

### 6. Set Up Domain & SSL

1. Update DNS records:
   - `@` → Your Droplet IP
   - `api` → Your Droplet IP
   - `admin` → Your Droplet IP

2. Install SSL:
   ```bash
   apt install certbot python3-certbot-nginx -y
   certbot --nginx -d wildnroot.com -d www.wildnroot.com -d api.wildnroot.com -d admin.wildnroot.com
   ```

## Performance Improvements Expected

### Before (Railway/Vercel)
- Cart operations: **60+ seconds** ❌
- Database connections: Slow, unreliable
- Cold starts: Frequent on Vercel

### After (Digital Ocean + MongoDB Atlas)
- Cart operations: **< 2 seconds** ✅
- Database connections: Fast, pooled, reliable
- No cold starts: Always-on infrastructure
- Better monitoring: MongoDB Atlas dashboard

## Cost Comparison

| Service | Current | New |
|---------|---------|-----|
| Backend (Railway) | $20-50/mo | - |
| Frontend (Vercel Pro) | $20/mo | - |
| **Total Current** | **$40-70/mo** | - |
| Digital Ocean Droplet | - | $24/mo |
| MongoDB Atlas M10 | - | $57/mo |
| MongoDB Atlas M0 (free) | - | $0/mo |
| **Total New** | - | **$24-81/mo** |

**Recommendation**: Start with M0 (free) for testing, upgrade to M10 when ready for production.

## Troubleshooting

### If cart is still slow:

1. **Check MongoDB Atlas connection**:
   - Go to Atlas dashboard → Metrics
   - Verify connection count is reasonable (< 10)
   - Check for connection errors

2. **Verify connection string**:
   ```bash
   # Test connection
   mongosh "your-connection-string"
   ```

3. **Check application logs**:
   ```bash
   docker compose -f docker-compose.prod.yml logs -f backend | grep -i "cart\|error"
   ```

4. **Verify indexes exist**:
   - Cart.user should be indexed
   - Product._id should be indexed
   - Use MongoDB Atlas Performance Advisor

### If deployment fails:

1. Check environment variables are set correctly
2. Verify MongoDB Atlas network access allows your IP
3. Check Docker logs: `docker compose -f docker-compose.prod.yml logs`
4. Verify disk space: `df -h`

## Support Resources

- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Digital Ocean Docs**: https://docs.digitalocean.com/
- **Migration Guide**: See `MIGRATION_GUIDE.md` for detailed steps
- **Quick Checklist**: See `QUICK_MIGRATION_CHECKLIST.md`

## Important Notes

1. **Keep Railway/Vercel running** during migration for rollback if needed
2. **Test thoroughly** before switching DNS
3. **Monitor MongoDB Atlas** dashboard for connection issues
4. **Set up backups** in MongoDB Atlas after migration
5. **Update team** on new infrastructure and URLs

---

**Ready to migrate?** Follow the step-by-step guide in `MIGRATION_GUIDE.md`!

**Questions?** Check the troubleshooting section or review the detailed migration guide.

