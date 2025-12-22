// src/routes/users.ts
import { Router } from "express";
import { connectDB } from "../lib/db";
import User from "../modules/users/User";
import { requireUser } from "../middlewares/userAuth";

const router = Router();

/* ---------- tiny helpers (key + validators) ---------- */
const n = (s?: unknown) => String(s ?? "").trim().toLowerCase();
type Addr = {
  label?: "Home" | "Work" | "Other";
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;   // code
  pincode?: string; // 6-digit
};
const addrKey = (a?: Addr) =>
  a ? [n(a.label || "home"), n(a.line1), n(a.line2), n(a.city), n(a.state), n(a.pincode)].join("|") : "";

const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isPin6 = (p?: string | number) => /^\d{6}$/.test(String(p ?? "").trim());

function dedupeAddressesInPlace(arr: any[]) {
  const seen = new Set<string>();
  for (let i = arr.length - 1; i >= 0; i--) {
    const k = addrKey(arr[i] as Addr);
    if (!k || seen.has(k)) {
      arr.splice(i, 1);
    } else {
      seen.add(k);
    }
  }
}

function markCompleteness(me: any) {
  me.isProfileComplete =
    !!me.name &&
    !!me.addresses?.[0]?.line1 &&
    !!me.addresses?.[0]?.city &&
    !!me.addresses?.[0]?.state &&
    isPin6(me.addresses?.[0]?.pincode);
}

/* ---------- Unified Auth Middleware ---------- */
router.use(requireUser);

/* ---------- GET /api/users/me ---------- */
router.get("/me", async (req, res) => {
  await connectDB();
  const userId = req.userId!; // Set by requireUser middleware

  const user = await User.findById(userId)
    .select("+isProfileComplete +addresses +name +email +phone +meta")
    .lean();

  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json(user);
});

/* ---------- PATCH /api/users/me ---------- */
/**
 * Accepts any of:
 * - name?: string
 * - email?: string
 * - city?: string
 * - dob?: string
 * - address?: { line1, line2?, city, state, pincode }        // sets primary address (index 0)
 * - pushAddress?: { label, line1, line2, city, state, pincode }        // add new address
 * - updateAddress?: { prevKey: string, address: { label, line1, ... } } // edit by key
 */
router.patch("/me", async (req, res) => {
  await connectDB();
  const userId = req.userId!; // Set by requireUser middleware

  const body = (req.body || {}) as {
    name?: string;
    email?: string;
    city?: string;
    dob?: string;
    address?: Addr; // primary
    pushAddress?: Addr;
    updateAddress?: { prevKey?: string; address?: Addr };
  };

  const me = await User.findById(userId);
  if (!me) return res.status(404).json({ message: "User not found" });

  /* ----- Profile fields ----- */
  if (typeof body.name === "string" && body.name.trim()) {
    me.name = body.name.trim();
  }

  if (typeof body.email === "string") {
    const e = body.email.trim().toLowerCase();
    if (e) {
      if (!isEmail(e)) return res.status(422).json({ message: "Invalid email" });
      me.email = e; // unique (partial) handled by model/index
    } else {
      // blank -> unset
      (me as any).email = undefined;
    }
  }

  if (typeof body.city === "string" && body.city.trim()) {
    me.meta = me.meta || {};
    me.meta.city = body.city.trim();
  }
  if (typeof body.dob === "string" && body.dob.trim()) {
    me.meta = me.meta || {};
    me.meta.dob = body.dob.trim();
  }

  /* ----- Primary address (index 0) ----- */
  if (body.address) {
    const { line1 = "", line2 = "", city = "", state = "", pincode = "" } = body.address;
    const pc = String(pincode).trim();
    if (!line1.trim() || !city.trim() || !state.trim() || !isPin6(pc)) {
      return res.status(422).json({
        message: "Provide line1, city, state and a 6-digit pincode. line2 is optional.",
      });
    }

    if (me.addresses?.length) {
      // update subdoc in place
      const sub: any = (me.addresses as any)[0];
      // keep existing label for primary if any, otherwise default Home
      sub.label = (sub.label as any) || "Home";
      sub.line1 = line1.trim();
      sub.line2 = line2.trim();
      sub.city = city.trim();
      sub.state = state.trim();
      sub.pincode = pc;
    } else {
      // create first address
      (me.addresses as any).push({
        label: "Home",
        line1: line1.trim(),
        ...(line2.trim() ? { line2: line2.trim() } : {}),
        city: city.trim(),
        state: state.trim(),
        pincode: pc,
      });
    }
  }

  /* ----- Add another address (pushAddress) ----- */
  if (body.pushAddress) {
    const a = body.pushAddress;
    const payload: Addr = {
      label: (a.label as any) || "Home",
      line1: (a.line1 || "").trim(),
      line2: (a.line2 || "").trim(),
      city: (a.city || "").trim(),
      state: (a.state || "").trim(),
      pincode: String(a.pincode || "").trim(),
    };

    if (!payload.line1 || !payload.line2 || !payload.city || !payload.state || !isPin6(payload.pincode)) {
      return res.status(422).json({ message: "Invalid address" });
    }

    // add to start
    (me.addresses as any).unshift(payload);
    // de-dupe in place
    dedupeAddressesInPlace(me.addresses as any);
  }

  /* ----- Edit an existing address (updateAddress) ----- */
  if (body.updateAddress?.address) {
    const prevKey = String(body.updateAddress.prevKey || "");
    if (!prevKey) return res.status(422).json({ message: "Missing prevKey" });

    const a = body.updateAddress.address;
    const updated: Addr = {
      label: (a.label as any) || "Home",
      line1: (a.line1 || "").trim(),
      line2: (a.line2 || "").trim(),
      city: (a.city || "").trim(),
      state: (a.state || "").trim(),
      pincode: String(a.pincode || "").trim(),
    };

    if (!updated.line1 || !updated.line2 || !updated.city || !updated.state || !isPin6(updated.pincode)) {
      return res.status(422).json({ message: "Invalid address" });
    }

    const idx = (me.addresses || []).findIndex((x: any) => addrKey(x as Addr) === prevKey);
    if (idx >= 0) {
      const sub: any = (me.addresses as any)[idx];
      sub.label = updated.label;
      sub.line1 = updated.line1;
      sub.line2 = updated.line2;
      sub.city = updated.city;
      sub.state = updated.state;
      sub.pincode = updated.pincode;
    } else {
      (me.addresses as any).unshift(updated);
    }
    dedupeAddressesInPlace(me.addresses as any);
  }

  /* ----- completeness & save ----- */
  markCompleteness(me);

  try {
    await me.save();
    const fresh = await User.findById(userId)
      .select("+isProfileComplete +addresses +name +email +phone +meta");
    return res.json({ ok: true, user: fresh });
  } catch (err: any) {
    if (err?.code === 11000 && err?.keyPattern?.email) {
      return res.status(409).json({ message: "Email already in use" });
    }
    return res.status(500).json({ message: err?.message || "Update failed" });
  }
});

export default router;
