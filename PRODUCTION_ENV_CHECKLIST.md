# Production Environment Variables Checklist for DigitalOcean

## ⚠️ Critical Changes Needed for Admin Panel

### 1. Admin UI Environment (`adminui/.env.local`)

**MUST ADD/UPDATE:**

```bash
# Backend API Base URL (CRITICAL - Must be production URL)
NEXT_PUBLIC_API_BASE=https://api.wildnroot.com

# Admin Panel Site URL (ADD THIS - if you need canonical URLs or redirects)
NEXT_PUBLIC_ADMIN_URL=https://admin.wildnroot.com

# Firebase Configuration (if admin uses Firebase auth)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

**Current Status:** ❌ Missing `NEXT_PUBLIC_API_BASE` production URL

---

### 2. Backend Environment (`backend/.env`)

**MUST UPDATE:**

```bash
# CORS Configuration - ADD admin subdomain
CORS_ORIGINS=^https://wildnroot\.com$,^https://www\.wildnroot\.com$,^https://admin\.wildnroot\.com$,^https://wnrclient-zgyo\.vercel\.app$

# API Base URL (for internal API calls)
API_BASE_URL=https://api.wildnroot.com
```

**Current Status:** ⚠️ CORS_ORIGINS needs admin subdomain added

---

### 3. Frontend/Client Environment (`client/.env.local`)

**CHECK/CONFIRM:**

```bash
# Site Configuration
NEXT_PUBLIC_SITE_URL=https://www.wildnroot.com

# API Configuration
NEXT_PUBLIC_API_BASE=https://api.wildnroot.com
```

**Current Status:** ✅ Already configured correctly

---

## Complete Environment File Checklist

### ✅ Backend (`backend/.env`)

```bash
NODE_ENV=production
PORT=5001

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/wnr?retryWrites=true&w=majority

# Security
JWT_SECRET=<generate-strong-secret-32-chars-min>
JWT_EXPIRES_IN=7d

# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@project.iam.gserviceaccount.com

# Payment Gateway
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

# CORS - ⚠️ MUST INCLUDE ADMIN SUBDOMAIN
CORS_ORIGINS=^https://wildnroot\.com$,^https://www\.wildnroot\.com$,^https://admin\.wildnroot\.com$

# API Base
API_BASE_URL=https://api.wildnroot.com
```

### ✅ Admin UI (`adminui/.env.local`)

```bash
# ⚠️ CRITICAL - Must point to production API
NEXT_PUBLIC_API_BASE=https://api.wildnroot.com

# Optional - Admin panel URL (for redirects/canonical URLs)
NEXT_PUBLIC_ADMIN_URL=https://admin.wildnroot.com

# Firebase (if using Firebase auth in admin)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### ✅ Client/Frontend (`client/.env.local`)

```bash
NEXT_PUBLIC_SITE_URL=https://www.wildnroot.com
NEXT_PUBLIC_API_BASE=https://api.wildnroot.com

# Firebase (for client auth)
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

---

## Docker-Specific Notes

If using Docker Compose on DigitalOcean:

### For Internal Docker Communication:
- Use `http://backend:5001` for inter-container communication
- Use `https://api.wildnroot.com` for external/public API calls

### Admin UI in Docker:
- Admin UI container can use `http://backend:5001` internally
- But `NEXT_PUBLIC_API_BASE` should still be `https://api.wildnroot.com` (public URL) because it's used by the browser, not server

---

## Quick Update Commands

### On Your DigitalOcean Server:

```bash
# 1. Update backend CORS
cd /var/www/wnr/backend
nano .env
# Add ^https://admin\.wildnroot\.com$ to CORS_ORIGINS

# 2. Update admin UI API base
cd /var/www/wnr/adminui
nano .env.local
# Set NEXT_PUBLIC_API_BASE=https://api.wildnroot.com

# 3. Restart services
cd /var/www/wnr
# If using Docker:
docker-compose -f docker-compose.prod.yml restart backend adminui

# OR if using PM2:
pm2 restart wnr-backend
pm2 restart wnr-adminui
```

---

## Verification Checklist

After updating, verify:

- [ ] Backend CORS includes `admin.wildnroot.com`
- [ ] Admin UI `NEXT_PUBLIC_API_BASE` points to `https://api.wildnroot.com`
- [ ] Admin UI accessible at `https://admin.wildnroot.com`
- [ ] Admin UI can make API calls to backend
- [ ] SSL certificates installed for all subdomains (www, api, admin)
- [ ] DNS records configured correctly
- [ ] All services restart successfully after env changes

---

## Nginx SSL Configuration

After DNS is configured, get SSL certificates:

```bash
certbot --nginx -d admin.wildnroot.com
certbot --nginx -d api.wildnroot.com
certbot --nginx -d www.wildnroot.com -d wildnroot.com
```

Make sure nginx config includes admin subdomain (already configured in `nginx/conf.d/default.conf`).

