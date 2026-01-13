#!/usr/bin/env ts-node

/**
 * Index Migration Script for MongoDB Atlas
 * 
 * This script ensures all indexes are created in the database.
 * Run this after deploying to MongoDB Atlas to ensure optimal performance.
 * 
 * Usage:
 *   npm run migrate-indexes
 *   or
 *   ts-node scripts/migrate-indexes.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import all models to register their schemas and indexes
import "../src/modules/catalog/products/product.model";
import "../src/modules/catalog/categories/category.model";
import "../src/modules/orders/Order";
import "../src/modules/coupons/coupon.model";
import "../src/modules/reviews/review.model";
import "../src/modules/logs/log.model";
import "../src/modules/cms/content/content.model";
import "../src/modules/offerStrip/offerStrip.model";
import "../src/modules/rewards/reward.model";
import "../src/modules/rewards/reward-tier.model";
import "../src/modules/testimonials/testimonial.model";
import "../src/modules/settings/settings.model";

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/wnr";

async function migrateIndexes() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ Connected to MongoDB");
    console.log("📊 Creating indexes...\n");

    // Get all registered models
    const models = mongoose.modelNames();
    let totalIndexes = 0;

    for (const modelName of models) {
      const model = mongoose.model(modelName);
      try {
        // Ensure indexes are created
        await model.createIndexes();
        const indexes = await model.collection.indexes();
        totalIndexes += indexes.length;
        console.log(`✅ ${modelName}: ${indexes.length} index(es) created`);
      } catch (error) {
        console.error(`❌ Error creating indexes for ${modelName}:`, (error as Error).message);
      }
    }

    console.log(`\n✅ Migration complete! Total indexes: ${totalIndexes}`);
    console.log("\n📋 Index Summary:");
    
    // List all indexes
    for (const modelName of models) {
      const model = mongoose.model(modelName);
      const indexes = await model.collection.indexes();
      console.log(`\n${modelName}:`);
      indexes.forEach((idx: any) => {
        const keys = Object.keys(idx.key || {}).join(", ");
        const unique = idx.unique ? " (unique)" : "";
        const sparse = idx.sparse ? " (sparse)" : "";
        console.log(`  - ${keys}${unique}${sparse}`);
      });
    }

    await mongoose.connection.close();
    console.log("\n✅ Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateIndexes();
