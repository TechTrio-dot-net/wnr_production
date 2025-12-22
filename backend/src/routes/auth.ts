import { Router } from "express";
import jwt from "jsonwebtoken";
import { adminAuth } from "../lib/firebaseAdmin";
import { connectDB } from "../lib/db";
import User from "../modules/users/User";
import { setSessionCookie, clearSessionCookie } from "../lib/session";

const router = Router();

/* ---------- POST /api/auth/session ---------- */
/* Verifies Firebase ID token, upserts user by phone, returns JWT bearer token + sets cookie */
router.post("/session", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ message: "idToken required" });

    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const phone = decoded.phone_number;
    if (!phone) return res.status(400).json({ message: "Phone number missing in token" });

    await connectDB();
    let user = await User.findOne({ phone });

    const now = new Date();
    let isNew = false;

    if (!user) {
      user = await User.create({
        phone,
        isProfileComplete: false,
        provider: "firebase-phone",
        lastLoginAt: now,
      });
      isNew = true;
    } else {
      user.lastLoginAt = now;
      await user.save();
    }

    // Create JWT bearer token
    const token = jwt.sign(
      {
        uid: String(user._id),
        role: user.role,
        isProfileComplete: user.isProfileComplete,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" }
    );

    // Also set cookie as fallback
    setSessionCookie(res, {
      uid: String(user._id),
      role: user.role,
      isProfileComplete: user.isProfileComplete,
    });

    const status = !user.isProfileComplete ? "new" : (isNew ? "new" : "existing");
    return res.json({ 
      status,
      token, // ✅ Return token to frontend
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        isProfileComplete: user.isProfileComplete,
      }
    });
  } catch (e: any) {
    return res.status(401).json({ message: e?.message || "Unauthorized" });
  }
});

/* ---------- POST /api/auth/logout ---------- */
router.post("/logout", async (_req, res) => {
  clearSessionCookie(res);
  return res.json({ ok: true });
});

export default router;
