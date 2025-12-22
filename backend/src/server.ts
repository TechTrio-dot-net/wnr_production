import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import compression from "compression";
import fs from "node:fs";
import path from "node:path";

import routes from "./routes";
import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";
import { initializeTokenRefreshJob, stopTokenRefreshJob } from "./jobs/eshopbox-token-refresh";
import eshopboxWebhookRouter from "./routes/eshopbox-webhook";
import { logger } from "./lib/logger";

dotenv.config();

const app = express();

/* ---------- Trust proxy (for Secure cookies behind Railway/CF) ---------- */
app.set("trust proxy", 1);

/* ---------- Build CORS allowlist (regexes) ---------- */
const DEFAULT_ORIGINS =
  "^https:\\/\\/wnrclient-zgyo\\.vercel\\.app$," +
  "^https:\\/\\/otp-demo-mu\\.vercel\\.app$," +
  "^http:\\/\\/localhost:3000$," +
  "^http:\\/\\/localhost:3001$," +
  "^https:\\/\\/wildnroot\\.com$," +             // ✅ added main domain
  "^https:\\/\\/www\\.wildnroot\\.com$";        // ✅ also added www variant for safety

const originRegexes = (process.env.CORS_ORIGINS || DEFAULT_ORIGINS)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((rx) => new RegExp(rx));

const corsConfig: cors.CorsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // SSR / server-to-server
    const ok = originRegexes.some((rx) => rx.test(origin));
    return cb(null, ok); // never throw here
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

// help caches/CDNs
app.use((_, res, next) => {
  res.header("Vary", "Origin");
  next();
});

// Apply CORS globally
app.use(cors(corsConfig));

// ✅ Express 5 fix: regex instead of "*"
app.options(/.*/, cors(corsConfig));

// Compression middleware - compress all responses
app.use(compression({ level: 6, threshold: 1024 }));

app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

/* ---------- Optional static mounts ---------- */
const PUBLIC_DIR = path.join(process.cwd(), "public");
if (fs.existsSync(PUBLIC_DIR)) app.use(express.static(PUBLIC_DIR));

const LOCAL_UPLOADS_DIR = process.env.LOCAL_UPLOADS_DIR;
if (LOCAL_UPLOADS_DIR) {
  const abs = path.isAbsolute(LOCAL_UPLOADS_DIR)
    ? LOCAL_UPLOADS_DIR
    : path.join(process.cwd(), LOCAL_UPLOADS_DIR);
  if (fs.existsSync(abs)) app.use("/uploads", express.static(abs));
}

/* ---------- Health ---------- */
app.get("/ping", (_req, res) => res.json({ ok: true, ts: Date.now() }));

/* ---------- Routes ---------- */
app.use("/", routes);

/* ---------- Eshopbox Webhook Routes ---------- */
app.use("/api/webhooks/eshopbox", eshopboxWebhookRouter);

/* ---------- 404 + Error handling ---------- */
app.use(notFound);
app.use(errorHandler);

/* ---------- Boot ---------- */
const PORT = Number(process.env.PORT || 5001);

async function boot() {
  console.log("🚀 Booting server…");
  app.listen(PORT, () => {
    console.log(`✅ Server listening on http://localhost:${PORT}`);
  });

  // Connect to database using optimized connection handler
  try {
    const { connectDB } = await import("./lib/db");
    await connectDB();
  } catch (err) {
    console.error("❌ MongoDB connection failed:", (err as Error).message);
    // Don't exit - server can still run without DB for health checks
  }

  /* ---------- Initialize Eshopbox Integration ---------- */
  try {
    logger.info("🚀 Initializing Eshopbox integration...");
    initializeTokenRefreshJob();
    logger.info("✅ Eshopbox token refresh job initialized");
  } catch (err) {
    logger.error("❌ Failed to initialize Eshopbox integration", { error: err });
  }

  /* ---------- Graceful Shutdown ---------- */
  process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM, shutting down gracefully...");
    stopTokenRefreshJob();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    logger.info("Received SIGINT, shutting down gracefully...");
    stopTokenRefreshJob();
    process.exit(0);
  });
}

boot();
export default app;
