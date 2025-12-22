# Wild n' Root - E-Commerce Platform

Modern e-commerce platform built with Next.js, Express, and MongoDB.

## 🚀 Quick Start

### With Docker (Recommended - Single Command!)

```bash
# 1. Configure environment
cp backend/env.example backend/.env
cp client/env.example client/.env.local
cp adminui/env.example adminui/.env.local
# Edit .env files with your values

# 2. Deploy everything!
./deploy.sh
```

That's it! Your entire application (Frontend + Admin UI + Backend) is now running! 🎉

**Access:**
- Frontend: http://localhost:3000
- Admin UI: http://localhost:3001
- Backend: http://localhost:5001

### Without Docker

See individual README files:
- Backend: `backend/README_PRODUCTION.md`
- Frontend: `client/README_PRODUCTION.md`

## 📚 Documentation

- **Docker Quick Start**: `DOCKER_QUICK_START.md` - Single command deployment
- **Complete Docker Guide**: `DOCKER_COMPLETE_GUIDE.md` - Detailed Docker guide
- **Droplet Optimization**: `DOCKER_DROPLET_OPTIMIZATION.md` - Optimized for DigitalOcean ⭐
- **Admin UI Added**: `DOCKER_ADMINUI_ADDED.md` - Admin UI integration
- **Complete Summary**: `DOCKER_COMPLETE_SUMMARY.md` - Full overview
- **Deployment Guide**: `DEPLOYMENT_GUIDE.md` - Step-by-step deployment
- **Production Setup**: `PRODUCTION_SETUP.md` - Production checklist
- **Performance**: `COMPLETE_PERFORMANCE_OPTIMIZATIONS.md` - Performance guide

## 🏗️ Project Structure

```
wnr/
├── backend/          # Express.js API server
├── client/           # Next.js frontend
├── adminui/          # Admin panel (Next.js) - Dockerized!
├── docker-compose.yml        # Docker orchestration
├── docker-compose.prod.yml   # Production Docker config
└── deploy.sh         # One-command deployment script
```

## 🛠️ Tech Stack

**Frontend:**
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- React Query (TanStack Query)

**Backend:**
- Express.js 5
- TypeScript
- MongoDB (Mongoose)
- Firebase Admin
- Razorpay
- Cloudinary

## ✨ Features

- ✅ Complete e-commerce functionality
- ✅ User authentication (Firebase)
- ✅ Payment integration (Razorpay)
- ✅ Product management
- ✅ Order management
- ✅ Shipping integration (Eshopbox)
- ✅ Admin panel
- ✅ Blog/CMS
- ✅ Reviews & Ratings
- ✅ Wishlist
- ✅ Performance optimized
- ✅ Dockerized for easy deployment

## 📦 Docker Deployment (All Services Included!)

### Quick Start

```bash
./deploy.sh          # Development (Frontend + Admin UI + Backend)
./deploy.sh prod     # Production (Optimized for Droplets)
```

**All three services** (Frontend, Admin UI, Backend) are included and optimized!

### Manual Docker Commands

```bash
# Start services
docker compose up -d --build

# View logs
docker compose logs -f

# Stop services
docker compose down

# Check status
docker compose ps
```

### Using Make (if installed)

```bash
make prod-deploy     # Production deployment
make logs            # View logs
make ps              # Check status
make health          # Health check
```

See `DOCKER_QUICK_START.md` for more details.

## 🔧 Development

### Backend

```bash
cd backend
npm install
cp env.example .env
# Edit .env
npm run dev
```

### Frontend

```bash
cd client
npm install
cp env.example .env.local
# Edit .env.local
npm run dev
```

## 🚀 Production Deployment

### Option 1: Docker (Recommended)

```bash
# On your server
git clone https://github.com/yourusername/wnr.git
cd wnr
cp backend/env.example backend/.env
cp client/env.example client/.env.local
# Edit .env files
./deploy.sh prod
```

### Option 2: Traditional Deployment

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

## 📝 Environment Variables

See:
- `backend/env.example` - Backend environment variables
- `client/env.example` - Frontend environment variables

## 🔒 Security

- Environment variables excluded from git
- Non-root Docker containers
- Production error handling
- CORS properly configured
- SSL/TLS ready

## 📊 Performance

All performance optimizations are included:
- Response compression
- API caching
- Database query optimization
- React Query caching
- Image optimization
- Component memoization
- Lazy loading

See `COMPLETE_PERFORMANCE_OPTIMIZATIONS.md` for details.

## 📖 Additional Documentation

- `DOCKER_DEPLOYMENT.md` - Complete Docker guide
- `DOCKER_QUICK_START.md` - Quick Docker start
- `DEPLOYMENT_GUIDE.md` - Full deployment guide
- `PRODUCTION_SETUP.md` - Production checklist
- `backend/README_PRODUCTION.md` - Backend docs
- `client/README_PRODUCTION.md` - Frontend docs

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

Private - All rights reserved

## 🆘 Support

For deployment help:
1. Check `DOCKER_QUICK_START.md`
2. Review `DOCKER_DEPLOYMENT.md`
3. Check logs: `docker compose logs -f`
4. Verify environment variables

---

**Made with ❤️ for Wild n' Root**
