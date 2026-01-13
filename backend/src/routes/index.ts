import { Router } from "express";

// core module routes
import health from "./health";
import categories from "../modules/catalog/categories";
import products from "../modules/catalog/products";
import settings from "../modules/settings";
import serviceabilityRouter from "./serviceability";
import payments from "./payments";
import geo from "./geo";
import ordersRouter from "./orders";

import adminOrdersRouter from "./adminOrders";
import adminUsersRouter from "./adminUsers";
import wishlistRouter from "./wishlist";
import shippingRoutes from "./shipping";
import userAddressesRouter from "./useraddresses";
import pricingRoutes from "./pricing";
import blogRoutes from "../modules/cms/blog/routes";
import reviewRoutes from "../modules/reviews/review.routes";
import publicRouter from "../routes/public";
import offerStripAdminRouter from "./offerStripAdmin";
import ingredientsStripAdminRouter from "./ingredientsStripAdmin";
import shippingAdminRouter from "./shippingAdmin";
import shipments from "./shipments";

// ✅ Add this import for your admin auth (the one you already made)
import adminAuthRoutes from "./authRoutes"; // your existing file

// auth + users
import auth from "./auth";
import users from "./users";

// cart + checkout
import cart from "./cart";
import checkout from "./checkout";

// 📩 contact (new)
import contactRouter from "./contact";

// 📸 Instagram streaming
import instagramRouter from "./instagram";

// 🌍 Eshopbox integration (order & tracking management)
import eshopboxRouter from "./eshopbox";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ service: "wnr-backend-admin", status: "ok" });
});

// Core
router.use("/health", health);

// Serviceability (Eshopbox)
router.use("/api/serviceability", serviceabilityRouter);

// User Addresses
router.use("/api/users/addresses", userAddressesRouter);

// Catalog
router.use("/api/categories", categories);
router.use("/api/products", products);

// Settings
router.use("/api/settings", settings);

// Auth / Users
router.use("/api/geo", geo);
router.use("/api/auth", auth);
router.use("/api/users", users);

// Wishlist
router.use("/api/wishlist", wishlistRouter);

// Blog / CMS
router.use("/api/blogs", blogRoutes);

// Reviews
router.use("/api/reviews", reviewRoutes);

// Rewards
import rewardRoutes from "../modules/rewards/reward.routes";
router.use("/api/rewards", rewardRoutes);

// Coupons
import couponRoutes from "../modules/coupons/coupon.routes";
router.use("/api/coupons", couponRoutes);

// Testimonials
import testimonialRoutes from "../modules/testimonials/testimonial.routes";
router.use("/api/testimonials", testimonialRoutes);

// Notifications
import notificationsRouter from "./notifications";
router.use("/api/admin/notifications", notificationsRouter);

// Cart / Checkout
router.use("/api/cart", cart);
router.use("/api/checkout", checkout);
router.use("/api/shipments", shipments);

// Pricing
router.use("/api/cart/price", pricingRoutes);

// Shipping
router.use("/api/shipping", shippingRoutes);

// Payments / Razorpay
router.use("/api/orders", ordersRouter);
router.use("/api/admin/shipping", shippingAdminRouter);

// ✅ Admin API routes (use your existing authRoutes.ts file)
router.use("/api/admin/auth", adminAuthRoutes); // this will expose /auth/me + /auth/logout
router.use("/api/admin/orders", adminOrdersRouter);
router.use("/api/admin/users", adminUsersRouter);
router.use("/api/admin/offer-strip", offerStripAdminRouter);
router.use("/api/admin/ingredients-strip", ingredientsStripAdminRouter);

// Dashboard
import dashboardRouter from "./dashboard";
router.use("/api/dashboard", dashboardRouter);

router.use("/api/payments", payments);

// 📩 Contact
router.use("/api/contact", contactRouter);

// 📸 Instagram video streaming (public, no auth)
router.use("/api/instagram", instagramRouter);

// 🌍 Eshopbox (order creation, tracking, shipment management)
router.use("/api/eshopbox", eshopboxRouter);

// Public routes (no auth)
router.use("/public", publicRouter);

// Admin Logs
import logRoutes from "../modules/logs/log.routes";
router.use("/api/admin/logs", logRoutes);

// CMS Content
import contentRoutes from "../modules/cms/content/content.routes";
router.use("/api/cms/content", contentRoutes);

export default router;
