// routes/adminUsers.ts
import { Router } from "express";
import { connectDB } from "../lib/db";
import User from "../modules/users/User";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

// Connect DB first
router.use(async (_req, _res, next) => {
  await connectDB();
  next();
});

// ✅ This reads cookie "tt_session", verifies JWT, sets req.userRole, then enforces admin
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/users
 * Returns a list of all users with name, email, role, lastLoginAt, createdAt
 */
router.get("/", async (req, res) => {
  try {
    const users = await User.find({})
      .select("name email phone role lastLoginAt createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = users.map((u) => ({
      _id: String(u._id),
      name: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      role: u.role || "user",
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      createdAt: u.createdAt ? u.createdAt.toISOString() : null,
      updatedAt: u.updatedAt ? u.updatedAt.toISOString() : null,
    }));

    return res.json(formatted);
  } catch (err: any) {
    console.error("[adminUsers] Error:", err);
    return res.status(500).json({ message: err?.message || "Failed to fetch users" });
  }
});

export default router;

