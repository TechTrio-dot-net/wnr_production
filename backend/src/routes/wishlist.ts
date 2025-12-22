// src/routes/wishlist.ts
import { Router } from "express";
import { Types } from "mongoose";
import Wishlist from "../modules/wishlist/Wishlist";
import { requireUser } from "../middlewares/userAuth";

const router = Router();

// ✅ Use unified auth middleware
router.use(requireUser);

/**
 * GET /api/wishlist
 * Returns minimal product info for rendering.
 */
router.get("/", async (req, res) => {
  const userId = req.userId!;

  let wl = await Wishlist.findOne({ user: userId })
    .populate({ path: "items", select: "name price images" })
    .lean<{ _id: Types.ObjectId; items: any[]; updatedAt: Date } | null>();

  if (!wl) {
    // create an empty wishlist for the user and return empty list
    await Wishlist.create({ user: userId, items: [] });
    return res.json({ items: [], count: 0, updatedAt: new Date().toISOString() });
  }

  const products = (Array.isArray(wl.items) ? wl.items : []).map((p: any) => ({
    _id: String(p._id),
    name: p.name,
    price: p.price,
    imageUrl:
      Array.isArray(p.images) && p.images.length
        ? (typeof p.images[0] === "string" ? p.images[0] : p.images[0]?.url)
        : undefined,
  }));

  res.json({ items: products, count: products.length, updatedAt: wl.updatedAt });
});

/**
 * GET /api/wishlist/summary
 * Returns wishlist count only (lightweight for navbar).
 */
router.get("/summary", async (req, res) => {
  const userId = req.userId!;

  const wl = await Wishlist.findOne({ user: userId })
    .select({ items: 1, _id: 0 })
    .lean<{ items?: Types.ObjectId[] } | null>();

  const count = Array.isArray(wl?.items) ? wl.items.length : 0;
  res.json({ count });
});

/**
 * GET /api/wishlist/ids
 * Returns only product ids.
 */
router.get("/ids", async (req, res) => {
  const userId = req.userId!;

  const wl = await Wishlist.findOne({ user: userId })
    .select({ items: 1, _id: 0 })
    .lean<{ items?: Types.ObjectId[] } | null>();

  if (!wl || !Array.isArray(wl.items)) {
    // ensure doc exists for the user so future updates don’t 404
    await Wishlist.updateOne({ user: userId }, { $setOnInsert: { items: [] } }, { upsert: true });
    return res.json({ ids: [] });
  }

  res.json({ ids: wl.items.map(String) });
});

/**
 * POST /api/wishlist  Body: { productId }
 */
router.post("/", async (req, res) => {
  const userId = req.userId!;
  const productId = String(req.body?.productId || "");
  if (!Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid productId" });
  }

  // Upsert + addToSet (no need to read doc yet)
  await Wishlist.updateOne(
    { user: userId },
    { $addToSet: { items: new Types.ObjectId(productId) } },
    { upsert: true }
  );

  // Read count safely
  const wl = await Wishlist.findOne({ user: userId }).select({ items: 1 }).lean<{ items?: Types.ObjectId[] } | null>();
  const count = Array.isArray(wl?.items) ? wl!.items!.length : 0;

  res.json({ ok: true, count });
});

/**
 * DELETE /api/wishlist/:productId
 */
router.delete("/:productId", async (req, res) => {
  const userId = req.userId!;
  const productId = String(req.params.productId || "");
  if (!Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid productId" });
  }

  await Wishlist.updateOne(
    { user: userId },
    { $pull: { items: new Types.ObjectId(productId) } },
    { upsert: true }
  );

  const wl = await Wishlist.findOne({ user: userId }).select({ items: 1 }).lean<{ items?: Types.ObjectId[] } | null>();
  const count = Array.isArray(wl?.items) ? wl!.items!.length : 0;

  res.json({ ok: true, count });
});

/**
 * DELETE /api/wishlist  (clear)
 */
router.delete("/", async (req, res) => {
  const userId = req.userId!;
  await Wishlist.updateOne({ user: userId }, { $set: { items: [] } }, { upsert: true });
  res.json({ ok: true });
});

export default router;
