# MongoDB Atlas Migration Guide

This guide will help you migrate your local MongoDB database to MongoDB Atlas with optimized performance settings.

## Prerequisites

1. MongoDB Atlas account (free tier available)
2. Database connection string from Atlas
3. Node.js and npm installed

## Step 1: Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (M0 free tier is sufficient for development)
3. Create a database user with read/write permissions
4. Whitelist your IP address (or use `0.0.0.0/0` for all IPs - **not recommended for production**)
5. Get your connection string from "Connect" → "Connect your application"

## Step 2: Update Environment Variables

Update your `.env` file with the Atlas connection string:

```env
# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/wnr?retryWrites=true&w=majority

# Or use MONGO_URI (fallback)
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/wnr?retryWrites=true&w=majority
```

**Important Notes:**
- Replace `<username>` and `<password>` with your database user credentials
- Replace `cluster0.xxxxx` with your actual cluster URL
- The connection string already includes `retryWrites=true&w=majority` for Atlas compatibility

## Step 3: Export Local Database (Optional)

If you have existing data in your local MongoDB:

```bash
# Export all collections
mongodump --uri="mongodb://127.0.0.1:27017/wnr" --out=./backup

# Or export specific collections
mongodump --uri="mongodb://127.0.0.1:27017/wnr" --collection=products --out=./backup
```

## Step 4: Import to Atlas

```bash
# Import all collections to Atlas
mongorestore --uri="mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/wnr" ./backup/wnr

# Or use Atlas Data Import tool in the web interface
```

## Step 5: Create Indexes

Run the index migration script to ensure all indexes are created:

```bash
npm run migrate-indexes
```

This script will:
- Connect to your MongoDB Atlas database
- Create all necessary indexes for optimal performance
- Display a summary of all created indexes

## Step 6: Verify Connection

Test the connection by starting your server:

```bash
npm run dev
```

You should see:
```
✅ MongoDB connected successfully
```

## Step 7: Monitor Performance

### Atlas Performance Advisor

MongoDB Atlas provides a Performance Advisor that suggests missing indexes:
1. Go to your Atlas cluster
2. Click "Performance Advisor"
3. Review and apply suggested indexes

### Query Performance

Monitor slow queries in Atlas:
1. Go to "Performance" tab
2. Review slow operations
3. Optimize queries using the query utilities in `src/lib/query-utils.ts`

## Optimization Features

### Connection Pooling

The optimized connection handler includes:
- **Max Pool Size**: 10 connections (adjust based on your needs)
- **Min Pool Size**: 2 connections (maintains minimum connections)
- **Connection Timeout**: 5 seconds
- **Socket Timeout**: 45 seconds

### Retry Logic

- Automatic retry on connection failure (up to 3 attempts)
- 2-second delay between retries
- Graceful error handling

### Indexes

All models have been optimized with:
- **Single field indexes** for common queries
- **Compound indexes** for multi-field queries
- **Unique indexes** for data integrity
- **Text indexes** for search functionality

### Query Optimization

Use the query utilities in `src/lib/query-utils.ts`:
- `paginateQuery()` - Efficient pagination with lean queries
- `leanQuery()` - Fast queries without Mongoose overhead
- `leanQueryWithSelect()` - Fetch only required fields
- `bulkWriteOptimized()` - Efficient bulk operations

## Environment Variables Reference

```env
# Primary connection string (Atlas-compatible)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority

# Fallback connection string (local development)
MONGO_URI=mongodb://127.0.0.1:27017/wnr
```

## Troubleshooting

### Connection Timeout

If you see connection timeout errors:
1. Check your IP whitelist in Atlas
2. Verify your connection string
3. Check network connectivity
4. Increase `serverSelectionTimeoutMS` in `src/lib/db.ts`

### Authentication Failed

If authentication fails:
1. Verify username and password
2. Check database user permissions
3. Ensure special characters in password are URL-encoded

### Index Creation Failed

If index creation fails:
1. Check user permissions (needs `createIndex` permission)
2. Verify connection to Atlas
3. Check for duplicate index names
4. Review index definitions in models

## Best Practices

1. **Always use connection pooling** - Already configured in `src/lib/db.ts`
2. **Use lean queries** - For read-only operations, use `lean()` for better performance
3. **Select only needed fields** - Use `.select()` to limit data transfer
4. **Use indexes** - Ensure all common queries use indexes
5. **Monitor performance** - Regularly check Atlas Performance Advisor
6. **Backup regularly** - Use Atlas automated backups
7. **Use transactions** - For multi-document operations requiring consistency

## Migration Checklist

- [ ] Created MongoDB Atlas cluster
- [ ] Created database user
- [ ] Whitelisted IP addresses
- [ ] Updated `.env` with `MONGODB_URI`
- [ ] Exported local database (if needed)
- [ ] Imported data to Atlas
- [ ] Ran `npm run migrate-indexes`
- [ ] Verified connection in development
- [ ] Tested all API endpoints
- [ ] Monitored performance in Atlas
- [ ] Updated production environment variables

## Support

For issues or questions:
1. Check MongoDB Atlas documentation
2. Review connection logs in `src/lib/db.ts`
3. Check Atlas cluster status
4. Verify network connectivity
