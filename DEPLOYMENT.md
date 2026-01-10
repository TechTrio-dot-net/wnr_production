# Digital Ocean Deployment Guide

This guide will help you deploy your Wild n' Root application to Digital Ocean with automatic CI/CD via GitHub Actions.

## Cost-Effective Setup

This setup uses a **single Digital Ocean Droplet** to host all services (backend, frontend, admin UI, and nginx). This is the most cost-effective approach.

**Estimated Monthly Cost: $12-24/month**
- Basic Droplet (2GB RAM, 1 vCPU): ~$12/month
- Recommended Droplet (4GB RAM, 2 vCPU): ~$24/month

## Prerequisites

1. A Digital Ocean account ([Sign up here](https://m.do.co/c/your-referral))
2. A GitHub repository with your code
3. SSH key pair for server access

## Step 1: Create Digital Ocean Droplet

1. Log in to [Digital Ocean](https://cloud.digitalocean.com/)
2. Click **Create** → **Droplets**
3. Choose configuration:
   - **Image**: Ubuntu 22.04 (LTS)
   - **Plan**: 
     - **Basic** (2GB RAM, 1 vCPU) - $12/month (minimum)
     - **Regular** (4GB RAM, 2 vCPU) - $24/month (recommended)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH keys (recommended) or root password
4. Click **Create Droplet**

## Step 2: Initial Server Setup

Once your droplet is created, SSH into it:

```bash
ssh root@YOUR_DROPLET_IP
```

### Install Docker and Docker Compose

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

### Create a non-root user (recommended)

```bash
# Create user
adduser deploy
usermod -aG docker deploy
usermod -aG sudo deploy

# Switch to deploy user
su - deploy
```

### Set up SSH key for GitHub Actions

```bash
# Generate SSH key pair (if you don't have one)
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""

# Add public key to authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# Display private key (you'll need this for GitHub Secrets)
cat ~/.ssh/github_actions
```

**Copy the private key** - you'll need it for GitHub Secrets.

## Step 3: Clone Repository on Server

```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone YOUR_GITHUB_REPO_URL wnr
cd wnr

# Make deployment script executable
chmod +x scripts/deploy-server.sh
```

## Step 4: Configure Environment Variables

You need to set up environment files on the server:

```bash
# Backend environment
cp backend/env.example backend/.env
nano backend/.env  # Edit with your production values

# Frontend environment
cp client/env.example client/.env.local
nano client/.env.local  # Edit with your production values

# Admin UI environment
cp adminui/env.example adminui/.env.local
nano adminui/.env.local  # Edit with your production values
```

**Important environment variables to set:**
- Database connection strings (MongoDB)
- API keys (Firebase, Razorpay, Cloudinary, etc.)
- JWT secrets
- API base URLs (should point to your domain/IP)

## Step 5: Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:

   - **`DO_SSH_PRIVATE_KEY`**: The private SSH key you generated (from `~/.ssh/github_actions`)
   - **`DO_HOST`**: Your droplet IP address (e.g., `157.230.123.45`)
   - **`DO_USER`**: SSH user (usually `root` or `deploy`)
   - **`GITHUB_REPO_URL`**: Your repository URL (e.g., `https://github.com/username/repo.git` or `git@github.com:username/repo.git`)

## Step 6: Set Up Domain (Optional but Recommended)

### Option A: Using Digital Ocean DNS

1. In Digital Ocean, go to **Networking** → **Domains**
2. Add your domain
3. Add A records:
   - `@` → Your droplet IP
   - `api` → Your droplet IP
   - `admin` → Your droplet IP

### Option B: Using Your Domain Provider

Add A records in your domain provider's DNS settings:
- `@` → Your droplet IP
- `api` → Your droplet IP  
- `admin` → Your droplet IP

### Update Nginx Configuration

Edit `nginx/conf.d/default.conf` to use your domain:

```nginx
# Update server_name directives
server_name yourdomain.com;
server_name api.yourdomain.com;
server_name admin.yourdomain.com;
```

## Step 7: Set Up SSL with Let's Encrypt (Recommended)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificates (replace with your domain)
certbot --nginx -d yourdomain.com -d api.yourdomain.com -d admin.yourdomain.com

# Certbot will automatically configure nginx
# Certificates auto-renew via cron
```

## Step 8: Initial Deployment

### Manual Deployment (First Time)

```bash
# On your server
cd ~/wnr
./scripts/deploy-server.sh
```

Or use the deploy script from your local machine:

```bash
# From your local machine
./deploy.sh prod
```

### Automatic Deployment

Once GitHub Secrets are configured, every push to `main` or `master` branch will automatically trigger deployment via GitHub Actions.

You can also manually trigger deployment:
1. Go to **Actions** tab in GitHub
2. Select **Deploy to Digital Ocean** workflow
3. Click **Run workflow**

## Step 9: Firewall Configuration

Configure UFW firewall on your droplet:

```bash
# Allow SSH
ufw allow 22/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

## Monitoring and Maintenance

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f adminui
```

### Restart Services

```bash
cd ~/wnr
docker compose -f docker-compose.prod.yml restart
```

### Update Application

Simply push to your `main` or `master` branch - GitHub Actions will handle the deployment automatically!

### Check Service Status

```bash
cd ~/wnr
docker compose -f docker-compose.prod.yml ps
```

### Clean Up Docker (Free Space)

```bash
# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Remove unused containers
docker container prune -f
```

## Troubleshooting

### Services not starting

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check container status
docker compose -f docker-compose.prod.yml ps

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
```

### Port conflicts

If ports are already in use:

```bash
# Check what's using the port
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting services
sudo systemctl stop apache2  # if Apache is running
sudo systemctl stop nginx     # if system nginx is running
```

### Out of memory

If you're on a smaller droplet and running out of memory:

```bash
# Check memory usage
free -h
docker stats

# Consider upgrading droplet or optimizing resource limits in docker-compose.prod.yml
```

### GitHub Actions deployment fails

1. Check GitHub Actions logs for error messages
2. Verify SSH key is correct in GitHub Secrets
3. Ensure server has Docker and Docker Compose installed
4. Check that repository URL in `GITHUB_REPO_URL` secret is correct

## Cost Optimization Tips

1. **Use Basic Droplet**: Start with 2GB RAM ($12/month) and upgrade if needed
2. **Monitor Resource Usage**: Use `docker stats` to monitor container resource usage
3. **Clean Up Regularly**: Remove unused Docker images and volumes
4. **Use Digital Ocean Spaces**: For file storage instead of local storage (optional)
5. **Enable Droplet Snapshots**: Before major updates (backup)

## Security Best Practices

1. ✅ Use SSH keys instead of passwords
2. ✅ Keep system updated: `apt update && apt upgrade`
3. ✅ Use firewall (UFW) to restrict access
4. ✅ Use SSL/HTTPS (Let's Encrypt)
5. ✅ Keep environment variables secure (never commit `.env` files)
6. ✅ Use non-root user for deployment
7. ✅ Regularly update Docker images
8. ✅ Monitor logs for suspicious activity

## Next Steps

- Set up monitoring (optional): Consider using Digital Ocean monitoring or external services
- Set up backups: Configure automated backups for your database
- Set up CDN: Use Cloudflare (free) for better performance
- Scale up: If traffic grows, consider load balancing or upgrading droplet

## Support

If you encounter issues:
1. Check the logs: `docker compose -f docker-compose.prod.yml logs`
2. Verify environment variables are set correctly
3. Ensure all services are healthy: `docker compose -f docker-compose.prod.yml ps`
4. Check GitHub Actions logs for deployment errors

---

**Happy Deploying! 🚀**

