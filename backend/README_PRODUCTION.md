# Backend Production Setup

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install --production
   ```

2. **Configure environment:**
   ```bash
   cp env.example .env
   # Edit .env with your production values
   ```

3. **Build:**
   ```bash
   npm run build
   ```

4. **Setup database indexes:**
   ```bash
   npm run migrate-indexes
   ```

5. **Start with PM2:**
   ```bash
   npm run start:pm2
   pm2 save
   pm2 startup
   ```

## Available Scripts

- `npm run dev` - Development mode with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run start:pm2` - Start with PM2 process manager
- `npm run migrate-indexes` - Create database indexes

## Environment Variables

See `env.example` for all required environment variables.

**Critical variables:**
- `NODE_ENV=production`
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Strong secret for JWT signing
- Firebase Admin credentials
- Razorpay credentials
- Cloudinary credentials
- Eshopbox credentials

## Health Checks

- `/health` - Full health check (database, memory, uptime)
- `/health/ready` - Readiness probe (checks database connection)
- `/health/live` - Liveness probe (checks if service is alive)

Use these endpoints for load balancer health checks.

## Logging

Logs are written to:
- PM2 logs: `pm2 logs wnr-backend`
- File logs: `./logs/pm2-error.log` and `./logs/pm2-out.log`

In production, logs are in JSON format for easy parsing.

## Process Management

This backend is designed to run with PM2 for:
- Process clustering (multiple instances)
- Automatic restarts on crashes
- Zero-downtime deployments
- Memory management

Configuration: `ecosystem.config.js`

## Production Best Practices

1. Always set `NODE_ENV=production`
2. Use MongoDB Atlas (not local MongoDB)
3. Use strong, unique JWT_SECRET
4. Keep dependencies updated: `npm audit`
5. Monitor logs regularly
6. Setup automatic backups
7. Use SSL/TLS for all connections
8. Configure proper CORS origins

## Troubleshooting

**Service won't start:**
- Check .env file exists and is configured
- Verify MongoDB connection
- Check port 5001 is available
- View logs: `pm2 logs wnr-backend`

**Database connection fails:**
- Verify MONGODB_URI is correct
- Check MongoDB Atlas network access (IP whitelist)
- Verify credentials are correct
- Check firewall rules

**High memory usage:**
- PM2 will auto-restart if memory exceeds 500MB
- Check for memory leaks in code
- Monitor with: `pm2 monit`

## Updates

To update the backend:

```bash
git pull
npm install --production
npm run build
pm2 restart wnr-backend
```
