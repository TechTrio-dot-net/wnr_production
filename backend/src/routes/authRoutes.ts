// src/routes/authRoutes.ts
import { Router } from "express";
import type { CookieOptions } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db";
import AdminModel from "../modules/admin/Admin"; // <-- maps to collection: "tables"

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) console.error("[authRoutes] JWT_SECRET is not set");

/** ---------------------------
 *  POST /login
 *  Verify admin credentials against "tables" (passwordHash) and set session cookie
 *  --------------------------- */
// src/routes/authRoutes.ts (replace ONLY the /login handler)
// src/routes/authRoutes.ts
router.post("/login", async (req, res) => {
  try {
    const { email, password } = (req.body || {}) as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    if (!JWT_SECRET) {
      return res.status(500).json({ message: "Server misconfigured (JWT secret missing)" });
    }

    await connectDB();

    const e = email.trim().toLowerCase();
    // @ts-ignore
    const dbName = (global as any)?.mongoose?.connection?.name;
    console.log("[AUTH] attempt:", e, "db:", dbName);

    const admin = await AdminModel.findOne({ email: e })
      .select("+passwordHash +role +email +active")
      .lean();

    if (!admin) {
      console.warn("[AUTH] no admin found for:", e);
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if ((admin as any).active === false) {
      console.warn("[AUTH] disabled:", e);
      return res.status(403).json({ message: "Account disabled" });
    }

    const hash = (admin as any).passwordHash || "";
    if (!hash) {
      console.warn("[AUTH] missing passwordHash for:", e);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, hash);
    if (!ok) {
      console.warn("[AUTH] bad password for:", e);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const role = (admin as any).role || "user";
    if (role !== "admin") {
      console.warn("[AUTH] not admin role for:", e, "role:", role);
      return res.status(403).json({ message: "Forbidden: admin only" });
    }

    const token = jwt.sign(
      { uid: String(admin._id), role: "admin", email: (admin as any).email },
      JWT_SECRET,
      { expiresIn: "7d", issuer: "wnr-backend", audience: "admin-ui", algorithm: "HS256" }
    );

    // Return token in response body. Do NOT set cookies (Bearer-only flow).
    console.log("[AUTH] success:", e);
    return res.json({ ok: true, token, user: { _id: admin._id, email: (admin as any).email, role } });
  } catch (e: any) {
    console.error("[AUTH] login error:", e?.message);
    return res.status(500).json({ message: e?.message || "Login failed" });
  }
});





/** ---------------------------
 *  GET /me
 *  Read session cookie, validate, return admin profile
 *  --------------------------- */
router.get("/me", async (req, res) => {
  try {
    // Require Authorization: Bearer <token>
    const authHeader = typeof req.headers.authorization === "string" ? req.headers.authorization : undefined;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ message: "No session" });
    const token = authHeader.slice(7).trim();
    if (!JWT_SECRET) return res.status(500).json({ message: "Server misconfigured (JWT secret missing)" });

    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as {
      uid: string;
      role?: string;
    };

    if (decoded?.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    await connectDB();
    const admin = await AdminModel.findById(decoded.uid)
      .select("+role +email +active")
      .lean();

    if (!admin) return res.status(404).json({ message: "User not found" });
    if ((admin as any).role !== "admin") return res.status(403).json({ message: "Forbidden" });
    if ((admin as any).active === false) return res.status(403).json({ message: "Account disabled" });

    return res.json({
      ok: true,
      user: {
        _id: admin._id,
        email: (admin as any).email,
        role: (admin as any).role,
        active: (admin as any).active,
      },
    });
  } catch {
    return res.status(401).json({ message: "Invalid session" });
  }
});


/** ---------------------------
 *  POST /logout
 *  Clear the session cookie
 *  --------------------------- */
router.post("/logout", (_req, res) => {
  // Bearer-only logout: nothing to clear server-side. Return success even if no token.
  return res.json({ ok: true });
});

export default router;
