# Quick Start - Digital Ocean Deployment

## 🚀 Fast Setup (5 minutes)

### 1. Create Droplet
- Go to [Digital Ocean](https://cloud.digitalocean.com/)
- Create Droplet: Ubuntu 22.04, 2GB RAM ($12/month) or 4GB RAM ($24/month)
- Note your droplet IP address

### 2. Initial Server Setup
```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Run setup script (copy this to your server)
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/scripts/setup-server.sh | bash

# OR manually:
apt update && apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install docker-compose-plugin -y
```

### 3. Set Up SSH Key for GitHub Actions
```bash
# Switch to deploy user (or stay as root)
su - deploy  # or stay as root

# Generate SSH key
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""

# Add to authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# Display private key (COPY THIS!)
cat ~/.ssh/github_actions
```

### 4. Configure GitHub Secrets
Go to: **GitHub Repo → Settings → Secrets and variables → Actions**

Add these secrets:
- **`DO_SSH_PRIVATE_KEY`**: The private key from step 3
- **`DO_HOST`**: Your droplet IP (e.g., `157.230.123.45`)
- **`DO_USER`**: `root` or `deploy`
- **`GITHUB_REPO_URL`**: Your repo URL (e.g., `https://github.com/username/repo.git`)

### 5. Clone & Configure on Server
```bash
# Clone repository
cd ~
git clone YOUR_GITHUB_REPO_URL wnr
cd wnr

# Set up environment files
cp backend/env.example backend/.env
cp client/env.example client/.env.local
cp adminui/env.example adminui/.env.local

# Edit with your production values
nano backend/.env
nano client/.env.local
nano adminui/.env.local
```

### 6. Deploy!
```bash
# Manual deployment (first time)
cd ~/wnr
chmod +x scripts/deploy-server.sh
./scripts/deploy-server.sh
```

### 7. Automatic Deployments
From now on, just **push to `main` or `master` branch** - GitHub Actions will automatically deploy! 🎉

---

## 📝 Important Environment Variables

Make sure to set these in your `.env` files:

**Backend (`backend/.env`):**
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Secret for JWT tokens
- Firebase credentials
- Razorpay keys
- Cloudinary credentials

**Frontend (`client/.env.local`):**
- `NEXT_PUBLIC_API_BASE` - Your backend URL (e.g., `http://YOUR_IP:5001` or `https://api.yourdomain.com`)

**Admin UI (`adminui/.env.local`):**
- `NEXT_PUBLIC_API_BASE` - Your backend URL

---

## 🔧 Useful Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart services
docker compose -f docker-compose.prod.yml restart

# Check status
docker compose -f docker-compose.prod.yml ps

# Stop services
docker compose -f docker-compose.prod.yml down
```

---

## 🌐 Domain Setup (Optional)

1. Point your domain to droplet IP:
   - `@` → Your IP
   - `api` → Your IP
   - `admin` → Your IP

2. Install SSL:
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com -d api.yourdomain.com -d admin.yourdomain.com
```

---

## 💰 Cost Breakdown

- **Droplet**: $12-24/month
- **Domain**: ~$10-15/year (optional)
- **SSL**: Free (Let's Encrypt)
- **Total**: ~$12-24/month

---

## 🆘 Troubleshooting

**Services not starting?**
```bash
docker compose -f docker-compose.prod.yml logs
```

**GitHub Actions failing?**
- Check SSH key is correct
- Verify `DO_HOST` and `DO_USER` secrets
- Check server has Docker installed

**Out of memory?**
- Upgrade droplet or optimize resource limits

---

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

