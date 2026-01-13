import mongoose from "mongoose";

/**
 * MongoDB Connection Configuration
 * Supports both local MongoDB and MongoDB Atlas
 * 
 * Environment Variables:
 * - MONGODB_URI (preferred, Atlas-compatible)
 * - MONGO_URI (fallback, local development)
 */
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/wnr";

/**
 * Connection options optimized for MongoDB Atlas
 * These settings ensure:
 * - Connection pooling for better performance
 * - Retry logic for network resilience
 * - TLS/SSL support for Atlas
 * - Server selection timeout
 */
const connectionOptions: mongoose.ConnectOptions = {
  // Connection pool settings
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2, // Minimum number of connections to maintain
  maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
  
  // Server selection and timeout
  serverSelectionTimeoutMS: 5000, // How long to try selecting a server
  socketTimeoutMS: 45000, // How long to wait for a socket operation
  
  // Retry settings
  retryWrites: true, // Enable retryable writes (Atlas requirement)
  retryReads: true, // Enable retryable reads
  
  // Heartbeat settings
  heartbeatFrequencyMS: 10000, // Check server status every 10s
  
  // Compression (Atlas supports this)
  compressors: ["zlib"] as any,
};

let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Connect to MongoDB with retry logic
 * Optimized for performance - returns immediately if already connected
 */
export async function connectDB(): Promise<void> {
  // If already connected, return immediately (no async overhead)
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  // If connection is in progress, wait for it (with timeout)
  if (mongoose.connection.readyState === 2) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout - database connection taking too long"));
      }, 10000); // 10 second timeout
      
      mongoose.connection.once("connected", () => {
        clearTimeout(timeout);
        isConnected = true;
        resolve();
      });
      mongoose.connection.once("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  // Set up connection event handlers (only once)
  if (!mongoose.connection.listeners("connected").length) {
    setupConnectionHandlers();
  }

  // Attempt connection with retry logic
  while (connectionAttempts < MAX_RETRY_ATTEMPTS) {
    try {
      await mongoose.connect(MONGO_URI, connectionOptions);
      isConnected = true;
      connectionAttempts = 0; // Reset on success
      return;
    } catch (error) {
      connectionAttempts++;
      const err = error as Error;
      
      if (connectionAttempts >= MAX_RETRY_ATTEMPTS) {
        console.error(`❌ MongoDB connection failed after ${MAX_RETRY_ATTEMPTS} attempts:`, err.message);
        throw new Error(`Failed to connect to MongoDB after ${MAX_RETRY_ATTEMPTS} attempts: ${err.message}`);
      }
      
      console.warn(`⚠️  MongoDB connection attempt ${connectionAttempts} failed, retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

/**
 * Setup connection event handlers for monitoring and error handling
 */
function setupConnectionHandlers(): void {
  mongoose.connection.once("connected", () => {
    console.log("✅ MongoDB connected successfully");
    isConnected = true;
  });

  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB connection error:", err.message);
    isConnected = false;
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️  MongoDB disconnected");
    isConnected = false;
  });

  mongoose.connection.on("reconnected", () => {
    console.log("✅ MongoDB reconnected");
    isConnected = true;
  });

  // Handle process termination
  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("MongoDB connection closed due to application termination");
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await mongoose.connection.close();
    console.log("MongoDB connection closed due to application termination");
    process.exit(0);
  });
}

/**
 * Gracefully close the database connection
 */
export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState >= 1) {
    await mongoose.connection.close();
    isConnected = false;
    console.log("MongoDB connection closed");
  }
}

/**
 * Check if database is connected
 */
export function isDBConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Get connection status information
 */
export function getConnectionStatus(): {
  connected: boolean;
  readyState: number;
  host: string;
  name: string;
} {
  return {
    connected: isDBConnected(),
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || "unknown",
    name: mongoose.connection.name || "unknown",
  };
}

// Export mongoose for direct access if needed
export { mongoose };
