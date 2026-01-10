// src/routes/payments.ts
import express, { Router } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";

import { connectDB } from "../lib/db";
import Cart from "../modules/cart/Cart";
import { Product } from "../modules/catalog/products/product.model";
import OrderModel from "../modules/orders/Order";
import { nextSequence } from "../modules/counters/Counter";
import { requireUser } from "../middlewares/userAuth";
import { SettingsModel } from "../modules/settings/settings.model";

const router = Router();

/* ---------- ENV + Razorpay client ---------- */
const rzKeyId = process.env.RAZORPAY_KEY_ID;
const rzKeySecret = process.env.RAZORPAY_KEY_SECRET;
const rzWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
const COOKIE_NAME = process.env.COOKIE_NAME || "tt_session";

if (!rzKeyId || !rzKeySecret) {
  console.error("[payments] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
}
if (!rzWebhookSecret) {
  console.warn("[payments] RAZORPAY_WEBHOOK_SECRET not set (webhook verification will fail).");
}

const razorpay =
  rzKeyId && rzKeySecret
    ? new Razorpay({ key_id: rzKeyId, key_secret: rzKeySecret })
    : (null as unknown as Razorpay);

/* -------------------------------------------------------
 * POST /api/payments/create-order
 * Body: { amountInPaise: number, currency?: "INR", receipt?: string, notes?: Record<string,string> }
 * Returns: { order }
 * NOTE: This endpoint doesn't require strict auth (guest checkout),
 * but /verify does check auth before creating the order.
 * ----------------------------------------------------- */
router.post("/create-order", async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(500).json({ message: "Razorpay is not configured on the server." });
    }

    await connectDB();

    const {
      amountInPaise,
      currency = "INR",
      receipt = `rcpt_${Date.now()}`,
      notes = {},
    } = (req.body || {}) as {
      amountInPaise?: number;
      currency?: string;
      receipt?: string;
      notes?: Record<string, string>;
    };

    if (!amountInPaise || typeof amountInPaise !== "number" || !Number.isFinite(amountInPaise)) {
      return res.status(400).json({ message: "amountInPaise must be a number (in paise)." });
    }
    if (amountInPaise < 100) {
      return res.status(400).json({ message: "amountInPaise must be >= 100 (₹1.00)." });
    }
    if (currency !== "INR") {
      return res.status(400).json({ message: "Only INR is supported." });
    }

    // trim metadata to avoid gateway 400s
    const safeReceipt = String(receipt).slice(0, 40);
    const safeNotes: Record<string, string> = {};
    Object.entries(notes || {}).forEach(([k, v]) => {
      safeNotes[String(k).slice(0, 20)] = String(v).slice(0, 200);
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amountInPaise), // paise
      currency,
      receipt: safeReceipt,
      notes: safeNotes,
    });

    return res.json({ order });
  } catch (e: any) {
    console.error("create-order error:", e);
    return res.status(500).json({ message: e?.error?.description || e?.message || "Order creation failed" });
  }
});

/* -------------------------------------------------------
 * POST /api/payments/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *
 * - Verifies signature
 * - Authenticates user from Bearer token OR cookie JWT
 * - Loads cart, validates stock, computes totals
 * - Generates sequential order number (WNR_0001, …)
 * - Saves Order (status=paid)
 * - Clears cart
 * Returns: { ok: true, orderId, orderNumber }
 * ----------------------------------------------------- */
router.post("/verify", async (req, res) => {
  try {
    if (!rzKeySecret) {
      return res.status(500).json({ message: "Razorpay is not configured on the server." });
    }
    if (!razorpay) {
      return res.status(500).json({ message: "Razorpay client not available." });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // 1) Verify signature
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto.createHmac("sha256", rzKeySecret).update(payload).digest("hex");
    if (expected !== razorpay_signature) {
      console.warn("Razorpay signature mismatch", { razorpay_order_id, razorpay_payment_id });
      return res.status(400).json({ ok: false, message: "Invalid signature" });
    }

    // 2) DB
    await connectDB();

    // 3) Auth via Bearer token OR session cookie
    let userId: Types.ObjectId | null = null;
    
    // Try Bearer token first (priority)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const uid = decoded.uid || decoded.sub || decoded.id;
        if (uid) {
          userId = new Types.ObjectId(String(uid));
        }
      } catch {
        // Fall through to cookie check
      }
    }

    // Fall back to cookie if Bearer token not present or invalid
    if (!userId) {
      const cookieToken = req.cookies?.[COOKIE_NAME];
      if (!cookieToken) {
        return res.status(401).json({ message: "No session" });
      }
      try {
        const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET!) as any;
        const uid = decoded.uid || decoded.sub || decoded.id;
        if (!uid) {
          return res.status(401).json({ message: "Invalid session payload" });
        }
        userId = new Types.ObjectId(String(uid));
      } catch {
        return res.status(401).json({ message: "Invalid session" });
      }
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication failed" });
    }

    // 4) Fetch RZP order & payment (for notes/amount verification)
    let rOrder: any = null;
    let rPayment: any = null;
    try { rOrder = await razorpay.orders.fetch(razorpay_order_id); } catch {}
    try { rPayment = await razorpay.payments.fetch(razorpay_payment_id); } catch {}

    // 5) Load cart
    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      select: "name price stock status discountPercentage",
    });
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // 6) Compute subtotal with discounts & validate stock
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

    // 7) Shipping and coupon from notes
    const notes = (rOrder && rOrder.notes) || {};
    
    // Check if free delivery is enabled in settings
    let settings = await SettingsModel.findOne();
    if (!settings) {
      settings = await SettingsModel.create({});
    }
    const freeDelivery = settings.freeDelivery === true;
    
    // If free delivery is enabled, set shipping to 0; otherwise use the value from notes
    const shippingNum = Number(notes.shipping || notes.shipping_in_inr || 0);
    const shipping = freeDelivery ? 0 : (Number.isFinite(shippingNum) ? shippingNum : 0);
    
    if (freeDelivery) {
      console.log("[payments] Free delivery enabled, setting shipping to 0");
    }
    
    // Handle coupon discount
    let couponDiscount = 0;
    let couponData: any = null;
    if (notes.couponCode && notes.couponDiscountAmount) {
      couponDiscount = Number(notes.couponDiscountAmount) || 0;
      try {
        const { recordCouponUsage } = await import("../modules/coupons/coupon.service");
        const CouponModel = (await import("../modules/coupons/coupon.model")).default;
        const coupon = await (CouponModel as any).findOne({ code: notes.couponCode.toUpperCase() }).lean();
        if (coupon) {
          couponData = {
            code: coupon.code,
            name: coupon.name,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmount: couponDiscount,
          };
          // Record coupon usage
          await recordCouponUsage(coupon._id, String(userId));
        }
      } catch (couponError) {
        console.error("Failed to record coupon usage:", couponError);
      }
    }
    
    const computedTotal = Math.max(0, subtotal + shipping - couponDiscount);
    const computedPaise = Math.round(computedTotal * 100);

    // Optionally compare with RZP amounts (warn only)
    if (rOrder?.amount && typeof rOrder.amount === "number" && rOrder.amount !== computedPaise) {
      console.warn("Amount mismatch (RZP order vs computed)", { rzp: rOrder.amount, computedPaise });
    } else if (rPayment?.amount && typeof rPayment.amount === "number" && rPayment.amount !== computedPaise) {
      console.warn("Amount mismatch (RZP payment vs computed)", { rzp: rPayment.amount, computedPaise });
    }

    // 8) Decrement stock
    for (const it of cart.items as any[]) {
      const upd = await Product.updateOne(
        { _id: it.product._id, stock: { $gte: it.qty } },
        { $inc: { stock: -it.qty } }
      );
      if (upd.modifiedCount === 0) {
        return res.status(409).json({ message: `Insufficient stock for ${it.product._id}` });
      }
    }

    // 9) Address snapshot (from RZP notes)
    const addr = {
      name: (notes.name as string) || "",
      phone: (notes.phone as string) || "",
      line1: (notes.address1 as string) || "",
      line2: (notes.address2 as string) || "",
      city: (notes.city as string) || "",
      state: (notes.state as string) || "",
      pincode: (notes.postalCode as string) || (notes.pincode as string) || "",
    };
    if (!addr.line1 || !addr.city || !addr.state || !/^\d{6}$/.test(String(addr.pincode || ""))) {
      console.warn("Address incomplete in razorpay notes; cannot create order.", { addr });
      return res.status(422).json({ message: "Address missing or incomplete in payment metadata. Order not created." });
    }

    // 10) Items for order with discount information
    const orderItems = (cart.items as any[]).map((it) => {
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
    });

    // 11) Get next sequence & formatted order number
    const seq = await nextSequence("order");                 // 1, 2, 3, ...
    const orderNumber = `WNR_${String(seq).padStart(4, "0")}`;

    // 12) Create order
    const deliverySpeed = (notes.deliverySpeed as "standard" | "express" | "prime") || "standard";
    const orderDoc = new OrderModel({
      user: userId,
      orderNumber,
      orderSeq: seq,
      items: orderItems,
      subtotal,
      shipping,
      total: computedTotal,
      status: "paid",
      deliverySpeed,
      coupon: couponData || undefined,
      addressSnapshot: {
        name: addr.name || undefined,
        phone: addr.phone || undefined,
        line1: addr.line1,
        line2: addr.line2 || undefined,
        city: addr.city,
        state: addr.state,
        pincode: String(addr.pincode),
      },
      payment: {
        method: "razorpay",
        status: "paid",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      },
      placedAt: new Date(),
    });

    const savedOrder = await orderDoc.save();

    // 13) Handle coin redemption (if any) - redeem before awarding new coins
    const coinsRedeemed = Number(notes.coinsRedeemed || 0);
    if (coinsRedeemed > 0) {
      try {
        const { redeemCoins } = await import("../modules/rewards/reward.service");
        await redeemCoins(userId, coinsRedeemed, savedOrder._id as any);
      } catch (redeemError) {
        // Log but don't fail the order if coin redemption fails
        console.error("Failed to redeem coins:", redeemError);
      }
    }

    // 14) Award coins (1 rupee = 1 coin, excluding shipping)
    try {
      const { awardCoins } = await import("../modules/rewards/reward.service");
      await awardCoins(
        userId,
        subtotal, // Exclude shipping
        savedOrder._id as any,
        `Coins earned from order ${savedOrder.orderNumber}`
      );
    } catch (coinError) {
      // Log but don't fail the order if coin awarding fails
      console.error("Failed to award coins:", coinError);
    }

    // 14) Clear cart
    cart.items = [];
    await cart.save();

    // Done
    return res.json({
      ok: true,
      orderId: String(savedOrder._id),
      orderNumber: savedOrder.orderNumber,
      order: {
        id: String(savedOrder._id),
        orderNumber: savedOrder.orderNumber,
      },
    });
  } catch (e: any) {
    console.error("verify error:", e);
    return res.status(500).json({ message: e?.message || "Verification failed" });
  }
});

/* -------------------------------------------------------
 * POST /api/payments/webhook
 * Content-Type: application/json
 * Body is RAW (express.raw) so we can verify signature
 * ----------------------------------------------------- */
router.post(
  "/webhook",
  express.raw({ type: "*/*" }),
  (req, res) => {
    try {
      if (!rzWebhookSecret) {
        return res.status(500).json({ message: "Webhook secret not configured." });
      }

      const signature = req.headers["x-razorpay-signature"] as string;
      if (!signature) return res.status(400).send("Missing webhook signature");

      const body = (req.body as Buffer).toString("utf8");
      const expected = crypto.createHmac("sha256", rzWebhookSecret).update(body).digest("hex");
      if (expected !== signature) return res.status(400).send("Invalid webhook signature");

      const event = JSON.parse(body);
      // Handle events (payment.captured, order.paid, refund.processed, etc.)
      // You can reconcile here if you want, but the /verify flow already writes the order.

      res.json({ received: true });
    } catch (e: any) {
      console.error("webhook error:", e);
      return res.status(500).json({ message: e?.message || "Webhook error" });
    }
  }
);

export default router;
