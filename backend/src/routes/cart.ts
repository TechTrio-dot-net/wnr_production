import { Router } from "express";
import { Types } from "mongoose";
import { connectDB } from "../lib/db";
import Cart from "../modules/cart/Cart";
import { Product } from "../modules/catalog/products/product.model";
import { requireUser } from "../middlewares/userAuth";

const router = Router();

// ✅ Use unified auth middleware
router.use(requireUser);

// GET /api/cart/summary -> returns cart item count only (lightweight for navbar)
router.get("/summary", async (req, res) => {
  await connectDB();
  const userId = req.userId!;

  const cart = await Cart.findOne({ user: userId })
    .select({ items: 1, _id: 0 })
    .lean<{ items?: any[] } | null>();

  const count = Array.isArray(cart?.items) ? cart.items.reduce((sum, it) => sum + (it.qty || 0), 0) : 0;
  res.json({ count });
});

// GET /api/cart  -> returns the user's cart
router.get("/", async (req, res) => {
  await connectDB();
  const userId = req.userId!; // Set by requireUser middleware

  let cart = await Cart.findOne({ user: userId })
    .populate({
      path: "items.product",
      select: "name price images stock status",
    })
    .lean();

  if (!cart) {
    const created = await Cart.create({ user: userId, items: [] });
    const fresh = await Cart.findById(created._id)
      .populate({ path: "items.product", select: "name price images stock status" })
      .lean();
    return res.json(fresh);
  }
  return res.json(cart);
});

// POST /api/cart/items -> { productId, qty }
router.post("/items", async (req, res) => {
  await connectDB();
  const userId = req.userId!; // Set by requireUser middleware
  const { productId, qty } = req.body || {};

  if (!Types.ObjectId.isValid(productId) || !Number.isInteger(qty) || qty < 1) {
    return res.status(422).json({ message: "Invalid product/qty" });
  }

  const product = await Product.findById(productId).lean();
  if (!product) return res.status(404).json({ message: "Product not found" });
  if (product.status !== "active") {
    return res.status(409).json({ message: "Product is not active" });
  }
  if (typeof product.price !== "number") {
    return res.status(422).json({ message: "Product price missing" });
  }
  if (typeof product.stock === "number" && product.stock < qty) {
    return res.status(409).json({ message: "Insufficient stock" });
  }

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [{ product: product._id, qty, priceAtAdd: product.price }],
    });
  } else {
    const existing = cart.items.find((i: any) => String(i.product) === String(product._id));
    if (existing) {
      existing.qty += qty;
    } else {
      cart.items.push({ product: product._id as any, qty, priceAtAdd: product.price });
    }
    await cart.save();
  }

  const fresh = await Cart.findById(cart._id)
    .populate({ path: "items.product", select: "name price images stock status" })
    .lean();
  return res.json(fresh);
});

// PATCH /api/cart/items/:itemId -> { qty }
router.patch("/items/:itemId", async (req, res) => {
  await connectDB();
  const userId = req.userId!; // Set by requireUser middleware
  const { itemId } = req.params;
  const { qty } = req.body || {};
  if (!Number.isInteger(qty) || qty < 1) return res.status(422).json({ message: "Invalid qty" });
  const cart = await Cart.findOne({ user: userId });
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  // ✅ Avoid .id(); use findIndex on subdoc _id
  const idx = cart.items.findIndex((i: any) => String(i._id) === String(itemId));
  if (idx === -1) return res.status(404).json({ message: "Item not found" });

  const item: any = cart.items[idx];

  // stock re-check
  const product = await Product.findById(item.product).lean();
  if (!product) return res.status(404).json({ message: "Product missing" });
  if (product.status !== "active") return res.status(409).json({ message: "Product inactive" });
  if (typeof product.stock === "number" && product.stock < qty) {
    return res.status(409).json({ message: "Insufficient stock" });
  }

  item.qty = qty;
  await cart.save();

  const fresh = await Cart.findById(cart._id)
    .populate({ path: "items.product", select: "name price images stock status" })
    .lean();
  return res.json(fresh);
});

// DELETE /api/cart/items/:itemId
router.delete("/items/:itemId", async (req, res) => {
  await connectDB();
  const userId = req.userId!; // Set by requireUser middleware
  const { itemId } = req.params;
  const cart = await Cart.findOne({ user: userId });
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  // ✅ Avoid .id(); remove via findIndex
  const idx = cart.items.findIndex((i: any) => String(i._id) === String(itemId));
  if (idx === -1) return res.status(404).json({ message: "Item not found" });

  cart.items.splice(idx, 1);
  await cart.save();

  const fresh = await Cart.findById(cart._id)
    .populate({ path: "items.product", select: "name price images stock status" })
    .lean();
  return res.json(fresh);
});

// DELETE /api/cart (clear all)
router.delete("/", async (req, res) => {
  await connectDB();
  const userId = req.userId!; // Set by requireUser middleware

  const cart = await Cart.findOne({ user: userId });
  if (!cart) return res.json({ ok: true });

  cart.items = [];
  await cart.save();
  return res.json({ ok: true });
});

export default router;
