import { Router } from "express";
import { createLog, getLogs } from "./log.controller";
import { requireAuth, requireAdmin } from "../../middlewares/auth";

const router = Router();

// POST /api/admin/logs - Create a new log entry
// This endpoint is used by the admin UI to log actions
// It's fire-and-forget, so errors are handled gracefully
// No auth required for POST (fire-and-forget logging)
router.post("/", createLog);

// GET /api/admin/logs - Get logs (admin only)
// Requires admin authentication
router.get("/", requireAuth, requireAdmin, getLogs);

export default router;

