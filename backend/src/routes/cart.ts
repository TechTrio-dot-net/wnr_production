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
      select: "name price images stock status discountPercentage",
    })
    .lean();

  if (!cart) {
    const created = await Cart.create({ user: userId, items: [] });
    const fresh = await Cart.findById(created._id)
      .populate({ path: "items.product", select: "name price images stock status discountPercentage" })
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
  // Check stock availability
  if (typeof product.stock === "number" && product.stock === 0) {
    return res.status(409).json({ message: "This product is out of stock" });
  }
  if (typeof product.stock === "number" && product.stock < qty) {
    return res.status(409).json({ 
      message: `Insufficient stock. Available: ${product.stock}, Requested: ${qty}` 
    });
  }

  // Capture discount percentage at add time (0-100, or undefined if not set)
  const discountPercentage = typeof product.discountPercentage === "number" && product.discountPercentage >= 0 && product.discountPercentage <= 100
    ? product.discountPercentage
    : undefined;

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [{ 
        product: product._id, 
        qty, 
        priceAtAdd: product.price,
        ...(discountPercentage !== undefined ? { discountPercentageAtAdd: discountPercentage } : {})
      }],
    });
  } else {
    const existing = cart.items.find((i: any) => String(i.product) === String(product._id));
    if (existing) {
      const newQty = existing.qty + qty;
      // Check if new total quantity exceeds stock
      if (typeof product.stock === "number" && product.stock < newQty) {
        return res.status(409).json({ 
          message: `Insufficient stock. Available: ${product.stock}, Requested: ${newQty}` 
        });
      }
      existing.qty = newQty;
    } else {
      cart.items.push({ 
        product: product._id as any, 
        qty, 
        priceAtAdd: product.price,
        ...(discountPercentage !== undefined ? { discountPercentageAtAdd: discountPercentage } : {})
      });
    }
    await cart.save();
  }

  const fresh = await Cart.findById(cart._id)
    .populate({ path: "items.product", select: "name price images stock status discountPercentage" })
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
  // Check stock availability
  if (typeof product.stock === "number" && product.stock < qty) {
    return res.status(409).json({ 
      message: `Insufficient stock. Available: ${product.stock}, Requested: ${qty}` 
    });
  }

  // Check if stock is 0
  if (typeof product.stock === "number" && product.stock === 0) {
    return res.status(409).json({ message: "This product is out of stock" });
  }

  item.qty = qty;
  await cart.save();

  const fresh = await Cart.findById(cart._id)
    .populate({ path: "items.product", select: "name price images stock status discountPercentage" })
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
    .populate({ path: "items.product", select: "name price images stock status discountPercentage" })
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

// POST /api/cart/validate-stock -> Validates all items in cart have sufficient stock
router.post("/validate-stock", async (req, res) => {
  await connectDB();
  const userId = req.userId!; // Set by requireUser middleware

  const cart = await Cart.findOne({ user: userId }).populate({
    path: "items.product",
    select: "name price stock status discountPercentage",
  });

  if (!cart || !cart.items || cart.items.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  const issues: Array<{ productId: string; productName: string; issue: string }> = [];

  for (const it of cart.items as any[]) {
    const p = it.product;
    if (!p) {
      issues.push({
        productId: String(it.product || "unknown"),
        productName: "Unknown Product",
        issue: "Product not found",
      });
      continue;
    }

    if (p.status !== "active") {
      issues.push({
        productId: String(p._id),
        productName: p.name || "Product",
        issue: "Product is inactive",
      });
      continue;
    }

    // Check if product is out of stock
    if (typeof p.stock === "number" && p.stock === 0) {
      issues.push({
        productId: String(p._id),
        productName: p.name || "Product",
        issue: "Product is out of stock",
      });
      continue;
    }

    // Check if requested quantity exceeds available stock
    if (typeof p.stock === "number" && p.stock < it.qty) {
      issues.push({
        productId: String(p._id),
        productName: p.name || "Product",
        issue: `Insufficient stock. Available: ${p.stock}, Requested: ${it.qty}`,
      });
      continue;
    }
  }

  if (issues.length > 0) {
    const message = issues.map(issue => `${issue.productName}: ${issue.issue}`).join("; ");
    return res.status(409).json({
      message: `Cart validation failed: ${message}`,
      issues,
    });
  }

  return res.json({ ok: true, message: "All items in cart are available" });
});

export default router;
