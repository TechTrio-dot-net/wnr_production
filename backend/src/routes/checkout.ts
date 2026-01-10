// routes/checkout.ts
import { Router } from "express";
import { Types } from "mongoose";

import { connectDB } from "../lib/db";
import Cart from "../modules/cart/Cart";
import { Product } from "../modules/catalog/products/product.model";
import OrderModel from "../modules/orders/Order";
import { requireUser } from "../middlewares/userAuth";
import { SettingsModel } from "../modules/settings/settings.model";

const router = Router();

// ✅ Use unified authentication middleware
router.use(requireUser);

/**
 * POST /api/checkout
 * Body: {
 *   shipping?: number,
 *   address: {
 *     name?: string, phone?: string,
 *     line1: string, line2?: string,
 *     city: string, state: string, pincode: string
 *   }
 * }
 */
router.post("/", async (req, res) => {
  try {
    await connectDB();

    const userId = req.userId!; // ✅ Set by requireUser middleware

    // Check if free delivery is enabled in settings
    let settings = await SettingsModel.findOne();
    if (!settings) {
      settings = await SettingsModel.create({});
    }
    const freeDelivery = settings.freeDelivery === true;
    
    // If free delivery is enabled, set shipping to 0; otherwise use the provided value
    const shipping = freeDelivery ? 0 : (Number.isFinite(+req.body?.shipping) ? Number(req.body.shipping) : 0);
    
    if (freeDelivery) {
      console.log("[checkout] Free delivery enabled, setting shipping to 0");
    }

    // ✅ address is required by schema
    const address = req.body?.address || {};
    const line1 = String(address.line1 || "").trim();
    const city = String(address.city || "").trim();
    const state = String(address.state || "").trim();
    const pincode = String(address.pincode || "").trim();
    if (!line1 || !city || !state || !/^\d{6}$/.test(pincode)) {
      return res.status(422).json({
        message: "Invalid address. Provide line1, city, state and a 6-digit pincode.",
      });
    }

    // load cart
    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      select: "name price stock status discountPercentage",
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // validate items + compute subtotal with discounts
    let subtotal = 0;
    for (const it of cart.items as any[]) {
      const p = it.product;
      if (!p) return res.status(400).json({ message: "A product in your cart is missing" });
      if (p.status !== "active") return res.status(409).json({ message: `Product ${p._id} is inactive` });
      if (typeof p.price !== "number") return res.status(422).json({ message: `Product ${p._id} price missing` });
      // Check if product is out of stock
      if (typeof p.stock === "number" && p.stock === 0) {
        return res.status(409).json({ message: `Product ${p._id} is out of stock` });
      }
      if (typeof p.stock === "number" && p.stock < it.qty) {
        return res.status(409).json({ message: `Insufficient stock for ${p._id}. Available: ${p.stock}, Requested: ${it.qty}` });
      }
      
      // Always use product's current discount. If product no longer has discount, don't apply stored discount from add time
      const discountPercentage = (typeof p.discountPercentage === 'number' && p.discountPercentage > 0)
        ? p.discountPercentage
        : undefined;
      const originalPrice = p.price;
      const finalPrice = typeof discountPercentage === 'number' && discountPercentage > 0
        ? Math.round(originalPrice * (1 - discountPercentage / 100))
        : originalPrice;
      
      subtotal += finalPrice * it.qty;
    }

    const total = Math.max(0, subtotal + shipping);

    // (optional) reserve stock: keep but check result
    for (const it of cart.items as any[]) {
      const upd = await Product.updateOne(
        { _id: it.product._id, stock: { $gte: it.qty } },
        { $inc: { stock: -it.qty } }
      );
      if (upd.modifiedCount === 0) {
        return res.status(409).json({ message: `Insufficient stock for ${it.product._id}` });
      }
    }

    // ✅ Create order with a valid addressSnapshot and discount information
    const orderDoc = new OrderModel({
      user: userId,
      items: cart.items.map((it: any) => {
        const p = it.product;
        // Always use product's current discount. If product no longer has discount, don't apply stored discount from add time
        const discountPercentage = (typeof p.discountPercentage === 'number' && p.discountPercentage > 0)
          ? p.discountPercentage
          : undefined;
        const originalPrice = p.price;
        const finalPrice = typeof discountPercentage === 'number' && discountPercentage > 0
          ? Math.round(originalPrice * (1 - discountPercentage / 100))
          : originalPrice;
        const discountAmount = originalPrice - finalPrice;
        
        return {
          product: p._id,
          name: p.name,
          price: finalPrice, // final price after discount
          ...(typeof discountPercentage === 'number' && discountPercentage > 0 ? {
            originalPrice,
            discountPercentage,
            discountAmount,
          } : {}),
          qty: it.qty,
        };
      }),
      subtotal,
      shipping,
      total,
      status: "pending",
      addressSnapshot: {
        name: String(address.name || "").trim() || undefined,
        phone: String(address.phone || "").trim() || undefined,
        line1,
        line2: String(address.line2 || "").trim() || undefined,
        city,
        state,
        pincode,
      },
      // payment: { method: "razorpay", status: "unpaid" }, // enable if added to schema
      // placedAt: new Date(),
    });

    const order = await orderDoc.save(); // will throw if schema invalid

    // ✅ Only clear cart after order is saved
    cart.items = [];
    await cart.save();

    return res.json({ ok: true, orderId: String(order._id), total });
  } catch (err: any) {
    console.error("CHECKOUT ERROR:", err?.message, err?.errors || "");
    return res.status(500).json({ message: err?.message || "Checkout failed" });
  }
});

export default router;
