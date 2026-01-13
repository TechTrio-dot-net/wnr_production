// src/routes/useraddresses.ts
import { Router } from "express";
import { connectDB } from "../lib/db";
import User from "../modules/users/User";
import { requireUser } from "../middlewares/userAuth";

const router = Router();

// ---------- helpers ----------
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
  a
    ? [n(a.label || "home"), n(a.line1), n(a.line2), n(a.city), n(a.state), n(a.pincode)].join("|")
    : "";

// Safely de-dupe a Mongoose DocumentArray IN PLACE (no reassignment)
function dedupeAddressesInPlace(arr: any[]) {
  const seen = new Set<string>();
  for (let i = arr.length - 1; i >= 0; i--) {
    const k = addrKey(arr[i]);
    if (!k || seen.has(k)) {
      arr.splice(i, 1); // remove duplicate
    } else {
      seen.add(k);
    }
  }
}

// ✅ Use unified authentication middleware
router.use(requireUser);

// ---------- POST /api/users/addresses (add new) ----------
router.post("/", async (req, res) => {
  await connectDB();
  const uid = req.userId!; // ✅ Set by requireUser middleware

  const address = (req.body?.address || {}) as Addr;
  const line1 = (address.line1 || "").trim();
  const line2 = (address.line2 || "").trim();
  const city = (address.city || "").trim();
  const state = (address.state || "").trim();
  const pincode = String(address.pincode || "").trim();
  const label: "Home" | "Work" | "Other" = (address.label as any) || "Home";

  if (!line1 || !line2 || !city || !state || !/^\d{6}$/.test(pincode)) {
    return res.status(422).json({ message: "Invalid address" });
  }

  const me = await User.findById(uid);
  if (!me) return res.status(404).json({ message: "User not found" });

  const incoming = { label, line1, line2, city, state, pincode };
  const inKey = addrKey(incoming);
  const exists = (me.addresses || []).some((a: any) => addrKey(a as Addr) === inKey);
  if (!exists) {
    // push to start
    (me.addresses as any).unshift(incoming);
    // de-dupe for safety
    dedupeAddressesInPlace(me.addresses as any);
  }

  // mark profile completeness if needed
  me.isProfileComplete =
    !!me.name &&
    !!me.addresses[0]?.line1 &&
    !!me.addresses[0]?.city &&
    !!me.addresses[0]?.state &&
    /^\d{6}$/.test(String(me.addresses[0]?.pincode || ""));

  await me.save();
  return res.json({ ok: true, addresses: me.addresses });
});

// ---------- PUT /api/users/addresses (edit existing by prevKey) ----------
router.put("/", async (req, res) => {
  await connectDB();
  const uid = req.userId!; // ✅ Set by requireUser middleware

  const prevKey = String(req.body?.prevKey || "");
  const address = (req.body?.address || {}) as Addr;

  const line1 = (address.line1 || "").trim();
  const line2 = (address.line2 || "").trim();
  const city = (address.city || "").trim();
  const state = (address.state || "").trim();
  const pincode = String(address.pincode || "").trim();
  const label: "Home" | "Work" | "Other" = (address.label as any) || "Home";

  if (!prevKey) return res.status(422).json({ message: "Missing prevKey" });
  if (!line1 || !line2 || !city || !state || !/^\d{6}$/.test(pincode)) {
    return res.status(422).json({ message: "Invalid address" });
  }

  const me = await User.findById(uid);
  if (!me) return res.status(404).json({ message: "User not found" });

  const updated = { label, line1, line2, city, state, pincode };
  const idx = (me.addresses || []).findIndex((a: any) => addrKey(a as Addr) === prevKey);

  if (idx >= 0) {
    // Update subdoc IN PLACE
    const sub: any = (me.addresses as any)[idx];
    sub.label = updated.label;
    sub.line1 = updated.line1;
    sub.line2 = updated.line2;
    sub.city = updated.city;
    sub.state = updated.state;
    sub.pincode = updated.pincode;
  } else {
    // not found -> add to start
    (me.addresses as any).unshift(updated);
  }

  // de-dupe IN PLACE (no reassignment)
  dedupeAddressesInPlace(me.addresses as any);

  me.isProfileComplete =
    !!me.name &&
    !!me.addresses[0]?.line1 &&
    !!me.addresses[0]?.city &&
    !!me.addresses[0]?.state &&
    /^\d{6}$/.test(String(me.addresses[0]?.pincode || ""));

  await me.save();
  return res.json({ ok: true, addresses: me.addresses });
});

// ---------- DELETE /api/users/addresses (by key) ----------
router.delete("/", async (req, res) => {
  await connectDB();
  const uid = req.userId!; // ✅ Set by requireUser middleware

  const key = String(req.body?.key || "");
  if (!key) return res.status(422).json({ message: "Missing key" });

  const me = await User.findById(uid);
  if (!me) return res.status(404).json({ message: "User not found" });

  const before = me.addresses.length;

  // remove IN PLACE (no reassignment)
  for (let i = me.addresses.length - 1; i >= 0; i--) {
    const k = addrKey((me.addresses as any)[i]);
    if (k === key) {
      (me.addresses as any).splice(i, 1);
    }
  }

  if (me.addresses.length === before) {
    return res.status(404).json({ message: "Address not found" });
  }

  me.isProfileComplete =
    !!me.name &&
    !!me.addresses[0]?.line1 &&
    !!me.addresses[0]?.city &&
    !!me.addresses[0]?.state &&
    /^\d{6}$/.test(String(me.addresses[0]?.pincode || ""));

  await me.save();
  return res.json({ ok: true, addresses: me.addresses });
});

export default router;
