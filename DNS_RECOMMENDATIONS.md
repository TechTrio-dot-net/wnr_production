# DNS Configuration Recommendations for Wild n' Root

## Required DNS Records

### 1. Main Frontend (Vercel)
```
Type: CNAME
Name: www
Value: 7de8214934e8864b.vercel-dns-017.com
Proxy: Proxied ✅
Status: KEEP (Already correct)
```

### 2. Backend API (Railway)
```
Type: CNAME
Name: api
Value: zb5g4xka.up.railway.app
Proxy: Proxied ✅
Status: KEEP (Already correct)
```

### 3. Admin Panel ⚠️ NEEDS TO BE ADDED
```
Type: A or CNAME
Name: admin
Value: [Your server IP] (if A record) OR [your-deployment-url] (if CNAME)
Proxy: Proxied
Status: ADD THIS RECORD
```

**If admin panel is on your Docker server:**
- Use **A record** pointing to your server's public IP address
- OR use **CNAME** if you have a domain pointing to that server

**If admin panel is deployed separately (Vercel/Railway):**
- Use **CNAME** pointing to your deployment URL

### 4. Root Domain (wildnroot.com)
```
Type: A or CNAME
Name: @ (or blank/root)
Value: [Your main server IP] OR CNAME to www
Proxy: Proxied
Status: REVIEW - Currently points to 216.150.1.1
```

**Recommendation:** Use CNAME to point root to `www`:
```
Type: CNAME
Name: @
Value: www.wildnroot.com
Proxy: Proxied
```

OR keep A record if you have a specific server for root domain.

## Records to REMOVE/REVIEW

### Conflicting A Records
These appear to be test/old records. Remove if not in use:
```
❌ A  admin  3.33.251.168  (Remove if not needed)
❌ A  admin  15.197.225.128 (Remove if not needed)
```

## Email & Other Services (Keep as-is)

These are correctly configured:
- ✅ MX records (email)
- ✅ TXT records (SPF, Firebase, Google verification)
- ✅ SRV records (autodiscover)
- ✅ NS records
- ✅ CNAME for media (Cloudinary)
- ✅ CNAME for email services

## Summary Action Items

1. **ADD** `admin.wildnroot.com` CNAME/A record
2. **REMOVE** conflicting A records for `admin` (3.33.251.168, 15.197.225.128)
3. **REVIEW** root domain A record (216.150.1.1) - consider CNAME to www instead

## After Adding Admin DNS Record

Once you add the admin subdomain, ensure:

1. **SSL Certificate**: Get SSL for `admin.wildnroot.com`
   ```bash
   certbot --nginx -d admin.wildnroot.com
   ```

2. **Nginx SSL Config**: Update nginx to handle HTTPS for admin subdomain

3. **Environment Variables**: In `adminui/.env.local`, set:
   ```bash
   NEXT_PUBLIC_API_BASE=https://api.wildnroot.com
   ```

## Testing After Changes

1. Test DNS propagation:
   ```bash
   nslookup admin.wildnroot.com
   dig admin.wildnroot.com
   ```

2. Test admin panel access:
   ```bash
   curl -I https://admin.wildnroot.com
   ```

3. Verify SSL certificate:
   ```bash
   openssl s_client -connect admin.wildnroot.com:443 -servername admin.wildnroot.com
   ```

