# Migration Guide: Railway/Vercel → Digital Ocean + MongoDB Atlas

This guide will help you migrate your Wild n' Root application from Railway/Vercel to Digital Ocean and switch to MongoDB Atlas for better performance.

## Why Migrate?

- **Performance**: MongoDB Atlas provides better connection pooling and global distribution
- **Cost**: Digital Ocean Droplets are more cost-effective than Railway/Vercel for consistent workloads
- **Control**: Full control over your infrastructure
- **Speed**: Eliminates slow database connections causing 1+ minute cart operations

## Prerequisites

1. MongoDB Atlas account ([Sign up here](https://www.mongodb.com/cloud/atlas/register))
2. Digital Ocean account ([Sign up here](https://m.do.co/c/your-referral))
3. Domain name (optional but recommended)
4. SSH access to your current server (for data migration)

## Step 1: Set Up MongoDB Atlas

### 1.1 Create a Cluster

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Click **Create** → **Build a Database**
3. Choose **FREE** tier (M0) for testing, or **M10** ($57/month) for production
4. Select a cloud provider and region closest to your users
5. Click **Create**

### 1.2 Configure Network Access

1. Go to **Network Access** → **Add IP Address**
2. For Digital Ocean deployment, add:
   - `0.0.0.0/0` (allows all IPs - for development/testing)
   - Or your specific Digital Ocean Droplet IP (more secure)
3. Click **Confirm**

### 1.3 Create Database User

1. Go to **Database Access** → **Add New Database User**
2. Choose **Password** authentication
3. Create a username and strong password (save these!)
4. Set user privileges to **Read and write to any database**
5. Click **Add User**

### 1.4 Get Connection String

1. Go to **Database** → Click **Connect** on your cluster
2. Choose **Connect your application**
3. Copy the connection string (looks like):
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password
5. Add database name: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/wnr?retryWrites=true&w=majority`

## Step 2: Migrate Data to MongoDB Atlas

### Option A: Using MongoDB Compass (Recommended)

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect to your current database (Railway/local)
3. Export collections or use the migration tool
4. Connect to MongoDB Atlas using your connection string
5. Import the data

### Option B: Using mongodump/mongorestore

```bash
# On your current server (Railway or local)
mongodump --uri="mongodb://current-db-uri" --out=/tmp/backup

# Upload to Atlas
mongorestore --uri="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/wnr" /tmp/backup/wnr
```

### Option C: Using Atlas Data Import (if data is small)

1. Export data from current database as JSON/CSV
2. Use Atlas **Data Import** feature in the UI

## Step 3: Set Up Digital Ocean Droplet

### 3.1 Create Droplet

1. Log in to [Digital Ocean](https://cloud.digitalocean.com/)
2. Click **Create** → **Droplets**
3. Configuration:
   - **Image**: Ubuntu 22.04 (LTS)
   - **Plan**: 
     - **Basic** (2GB RAM, 1 vCPU) - $12/month (minimum)
     - **Regular** (4GB RAM, 2 vCPU) - $24/month (recommended for production)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH keys (recommended)
4. Click **Create Droplet**

### 3.2 Initial Server Setup

SSH into your droplet:

```bash
ssh root@64.227.184.2
```

Install Docker and Docker Compose:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 3.3 Clone Repository

```bash
cd ~
git clone https://github.com/TechTrio-dot-net/wnr_production.git wnr
cd wnr
chmod +x scripts/deploy-server.sh
```

## Step 4: Configure Environment Variables

### 4.1 Backend Environment

```bash
cd ~/wnr
cp backend/env.example backend/.env
nano backend/.env
```

Update these critical variables:

```env
# MongoDB Atlas Connection
MONGODB_URI=mongodb://mongo:RIamTVpXDShlwlniOcQBJvhrKYXSQqzK@switchback.proxy.rlwy.net:32882

# Server Configuration
NODE_ENV=production
PORT=5001

# CORS - Update with your domains
CORS_ORIGINS=^https://wildnroot\.com$,^https://www\.wildnroot\.com$,^https://admin\.wildnroot\.com$,^https://api\.wildnroot\.com$

# API Base URL
API_BASE_URL=https://api.wildnroot.com

# Keep all your existing keys (JWT, Firebase, Razorpay, Cloudinary, etc.)
```

### 4.2 Frontend Environment

```bash
cp client/env.example client/.env.local
nano client/.env.local
```

Update:

```env
NEXT_PUBLIC_SITE_URL=https://www.wildnroot.com
NEXT_PUBLIC_API_BASE=https://api.wildnroot.com
# ... rest of your Firebase, analytics keys
```

### 4.3 Admin UI Environment

```bash
cp adminui/env.example adminui/.env.local
nano adminui/.env.local
```

Update:

```env
NEXT_PUBLIC_API_BASE=https://api.wildnroot.com
# ... rest of your configuration
```

## Step 5: Configure Domain and DNS

### 5.1 Add DNS Records

In your domain provider (or Digital Ocean DNS):

- **A Record**: `@` → Your Droplet IP
- **A Record**: `api` → Your Droplet IP  
- **A Record**: `admin` → Your Droplet IP

### 5.2 Update Nginx Configuration

Edit `nginx/conf.d/default.conf`:

```nginx
# Update server_name directives
server_name wildnroot.com www.wildnroot.com;
server_name api.wildnroot.com;
server_name admin.wildnroot.com;
```

## Step 6: Set Up SSL with Let's Encrypt

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificates
certbot --nginx -d wildnroot.com -d www.wildnroot.com -d api.wildnroot.com -d admin.wildnroot.com

# Certificates auto-renew via cron
```

## Step 7: Deploy to Digital Ocean

### 7.1 Initial Deployment

```bash
cd ~/wnr
./scripts/deploy-server.sh
```

### 7.2 Verify Deployment

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Test endpoints
curl http://localhost:5001/health
curl http://localhost:3000
```

## Step 8: Performance Optimizations

### 8.1 Database Connection Pooling

The code is already optimized with connection pooling. MongoDB Atlas connection string includes:
- `retryWrites=true` - Automatic retry on write failures
- `w=majority` - Write concern for data durability
- Connection pool settings in `backend/src/lib/db.ts`:
  - `maxPoolSize: 10` - Maximum connections
  - `minPoolSize: 2` - Minimum connections
  - `serverSelectionTimeoutMS: 5000` - Fast server selection

### 8.2 Verify Performance

Test your cart operations:

```bash
# Monitor database connections
# In MongoDB Atlas dashboard, check "Metrics" → "Connections"

# Test API response times
curl -w "@-" -o /dev/null -s "https://api.wildnroot.com/api/cart" <<'EOF'
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
EOF
```

## Step 9: Update DNS and Test

1. Update your domain's DNS records to point to Digital Ocean
2. Wait for DNS propagation (can take up to 48 hours, usually < 1 hour)
3. Test your site:
   - Frontend: `https://wildnroot.com`
   - API: `https://api.wildnroot.com/health`
   - Admin: `https://admin.wildnroot.com`

## Step 10: Monitor and Maintain

### 10.1 Set Up Monitoring

```bash
# Monitor resource usage
docker stats

# Check logs regularly
docker compose -f docker-compose.prod.yml logs -f backend
```

### 10.2 Regular Maintenance

```bash
# Update application
cd ~/wnr
git pull
./scripts/deploy-server.sh

# Clean up Docker (free space)
docker image prune -a -f
docker volume prune -f
```

## Troubleshooting

### Slow Cart Operations

If cart operations are still slow:

1. **Check MongoDB Atlas Metrics**:
   - Go to Atlas dashboard → Metrics
   - Check connection count, query performance
   - Verify you're not hitting connection limits

2. **Check Database Indexes**:
   ```bash
   # Connect to MongoDB Atlas
   # Verify indexes exist on:
   # - Cart.user
   # - Product._id
   # - Cart.items.product
   ```

3. **Check Network Latency**:
   - Ensure Digital Ocean droplet and MongoDB Atlas are in the same region
   - Use Atlas Performance Advisor to optimize queries

4. **Check Application Logs**:
   ```bash
   docker compose -f docker-compose.prod.yml logs -f backend | grep -i "cart\|error\|slow"
   ```

### Connection Issues

If you see connection errors:

1. **Verify MongoDB Atlas Network Access**:
   - Ensure your Digital Ocean IP is whitelisted
   - Or use `0.0.0.0/0` for testing

2. **Verify Connection String**:
   - Check password is correct
   - Ensure database name is included
   - Verify connection string format

3. **Check Firewall**:
   ```bash
   # Allow MongoDB Atlas ports
   ufw allow out 27017/tcp
   ```

### Deployment Issues

If deployment fails:

1. **Check Environment Variables**:
   ```bash
   # Verify .env files exist and are configured
   cat backend/.env | grep MONGODB_URI
   ```

2. **Check Docker Logs**:
   ```bash
   docker compose -f docker-compose.prod.yml logs
   ```

3. **Verify Disk Space**:
   ```bash
   df -h
   ```

## Cost Comparison

### Current (Railway/Vercel)
- Railway (Backend): ~$20-50/month
- Vercel (Frontend): ~$20/month (Pro plan)
- **Total: ~$40-70/month**

### New (Digital Ocean + MongoDB Atlas)
- Digital Ocean Droplet (4GB): $24/month
- MongoDB Atlas M10: $57/month (or FREE M0 for testing)
- **Total: $24-81/month** (or $24/month with M0)

**Savings**: Similar cost with better performance and control!

## Next Steps

1. ✅ Set up automated backups for MongoDB Atlas
2. ✅ Configure monitoring alerts
3. ✅ Set up CI/CD with GitHub Actions (see `DEPLOYMENT.md`)
4. ✅ Enable MongoDB Atlas Performance Advisor
5. ✅ Set up database indexes for optimal performance

## Support

If you encounter issues:
1. Check MongoDB Atlas dashboard for connection metrics
2. Review Digital Ocean droplet metrics
3. Check application logs: `docker compose -f docker-compose.prod.yml logs`
4. Verify all environment variables are set correctly

---

**Happy Migrating! 🚀**

