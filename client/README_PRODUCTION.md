# Frontend Production Setup

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your production values
   ```

3. **Build:**
   ```bash
   npm run build
   ```

4. **Start:**
   ```bash
   npm start
   ```

## Available Scripts

- `npm run dev` - Development mode with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

See `env.example` for all required environment variables.

**Critical variables:**
- `NEXT_PUBLIC_SITE_URL` - Your frontend URL
- `NEXT_PUBLIC_API_BASE` - Your backend API URL
- Firebase public configuration
- Analytics IDs (GA4, GTM, Meta Pixel)

## Production Build

The build process:
1. Compiles TypeScript
2. Optimizes React components
3. Minimizes JavaScript bundles
4. Optimizes images
5. Generates static pages where possible

Build output is in `.next/` directory.

## Performance Optimizations

This frontend includes:
- ✅ React Query for intelligent caching
- ✅ Image optimization (AVIF/WebP)
- ✅ Code splitting
- ✅ Package import optimization
- ✅ Compression enabled
- ✅ Lazy loading images
- ✅ Component memoization

## Serving with Nginx

Recommended: Use Nginx as reverse proxy instead of direct Node.js.

Benefits:
- Better performance
- SSL termination
- Static file serving
- Load balancing
- Caching

See `DEPLOYMENT_GUIDE.md` for Nginx configuration.

## Process Management

You can use:
- **PM2**: `pm2 start npm --name "wnr-frontend" -- start`
- **systemd**: See deployment guide for service file
- **Nginx**: Serve built files directly (recommended)

## Production Checklist

- [ ] Environment variables configured
- [ ] Build succeeds without errors
- [ ] Bundle sizes are reasonable
- [ ] Images optimized
- [ ] API endpoints working
- [ ] Analytics configured
- [ ] SSL/HTTPS enabled
- [ ] Caching configured
- [ ] Error handling working

## Updates

To update the frontend:

```bash
git pull
npm install
npm run build
# Restart service (PM2, systemd, or Nginx reload)
```

## Troubleshooting

**Build fails:**
- Check for TypeScript errors
- Verify all dependencies installed
- Check environment variables
- Review build output for specific errors

**API calls failing:**
- Verify `NEXT_PUBLIC_API_BASE` is correct
- Check CORS settings on backend
- Verify SSL certificates
- Check network connectivity

**Slow performance:**
- Check if caching is working
- Verify images are optimized
- Check bundle sizes
- Review React Query cache

**Runtime errors:**
- Check browser console
- Review server logs
- Verify environment variables
- Check API responses
