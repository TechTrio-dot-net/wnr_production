import { Router } from "express";
import { isDBConnected } from "../lib/db";

const router = Router();

/**
 * Health check endpoint for monitoring and load balancers
 * GET /health
 */
router.get("/", async (_req, res) => {
  const dbConnected = isDBConnected();
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  const health = {
    status: dbConnected ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    database: dbConnected ? "connected" : "disconnected",
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    },
    node: process.version,
  };

  // Return 503 if database is not connected (service degraded)
  const statusCode = dbConnected ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Readiness probe - checks if service is ready to accept traffic
 * GET /health/ready
 */
router.get("/ready", async (_req, res) => {
  const dbConnected = isDBConnected();
  if (dbConnected) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false, reason: "Database not connected" });
  }
});

/**
 * Liveness probe - checks if service is alive
 * GET /health/live
 */
router.get("/live", (_req, res) => {
  res.status(200).json({ alive: true, uptime: process.uptime() });
});

export default router;
