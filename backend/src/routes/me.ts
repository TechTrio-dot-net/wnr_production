import { Router } from "express";
import jwt from "jsonwebtoken";
import { connectDB } from "../lib/db";
import User from "../modules/users/User";

const router = Router();
const COOKIE_NAME = process.env.COOKIE_NAME || "tt_session";
type JWTPayload = { uid: string; [k: string]: unknown };

/* ---------- Auth Middleware ---------- */
router.use((req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ message: "No session" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    (req as any).session = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid session" });
  }
});

/* ---------- GET /api/users/me ---------- */
router.get("/me", async (req, res) => {
  await connectDB();
  const { uid } = (req as any).session as JWTPayload;

  // Force-select fields that might be select:false in schema
  const user = await User.findById(uid)
    .select("+isProfileComplete +addresses +name +email +phone +meta")
    .lean();

  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json(user);
});

/* ---------- PATCH /api/users/me ---------- */
router.patch("/me", async (req, res) => {
  await connectDB();
  const { uid } = (req as any).session as JWTPayload;

  const body = (req.body || {}) as {
    name?: string;
    email?: string;
    city?: string;
    dob?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      pincode?: string | number;
    };
  };

  const update: Record<string, any> = {};
  const current = await User.findById(uid).lean();
  if (!current) return res.status(404).json({ message: "User not found" });

  // Name
  if (typeof body.name === "string" && body.name.trim()) {
    update.name = body.name.trim();
  }

  // Email (optional; validate only if present and non-empty)
  if (typeof body.email === "string") {
    const e = body.email.trim().toLowerCase();
    if (e) {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
      if (!ok) return res.status(422).json({ message: "Invalid email" });
      update.email = e;
    }
  }

  // Optional meta
  if (body.city?.trim()) update["meta.city"] = body.city.trim();
  if (body.dob?.trim()) update["meta.dob"] = body.dob.trim();

  // Address (OPTIONAL NOW):
  // If user provided ANY address field, require *complete* address; otherwise skip updating.
  if (body.address) {
    const { line1, line2, city, state, pincode } = body.address;
    const l1 = (line1 ?? "").trim();
    const l2 = (line2 ?? "").trim();
    const c = (city ?? "").trim();
    const st = (state ?? "").trim();
    const pc = String(pincode ?? "").trim();

    const anyProvided = Boolean(l1 || l2 || c || st || pc);
    if (anyProvided) {
      if (!l1 || !c || !st || !/^\d{6}$/.test(pc)) {
        return res.status(422).json({
          message: "Invalid address. Provide line1, city, state and a 6-digit pincode, or leave all blank.",
        });
      }
      update["addresses.0"] = {
        line1: l1,
        ...(l2 ? { line2: l2 } : {}),
        city: c,
        state: st,
        pincode: pc,
      };
    }
  }

  // Profile completeness (MATCH FRONTEND COPY): name required; address OPTIONAL
  const nameOk = !!(update.name ?? current?.name);
  update.isProfileComplete = Boolean(nameOk);

  try {
    const user = await User.findByIdAndUpdate(
      uid,
      { $set: update },
      { new: true, runValidators: true }
    ).select("+isProfileComplete +addresses +name +email +phone +meta");

    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ ok: true, user });
  } catch (err: any) {
    if (err?.code === 11000 && err?.keyPattern?.email) {
      return res.status(409).json({ message: "Email already in use" });
    }
    return res.status(500).json({ message: err?.message || "Update failed" });
  }
});

export default router;



