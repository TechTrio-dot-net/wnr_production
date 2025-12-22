import { Router } from "express";
import { requireUser } from "../../middlewares/userAuth";
import { requireAuth, requireAdmin } from "../../middlewares/auth";
import * as couponController from "./coupon.controller";

const router = Router();

// Public/user routes
router.post("/validate", requireUser, couponController.validateCouponCode);
router.post("/apply", requireUser, couponController.applyCoupon);

// Admin routes
router.get("/admin", requireAuth, requireAdmin, couponController.getCoupons);
router.post("/admin", requireAuth, requireAdmin, couponController.createCoupon);
router.put("/admin/:id", requireAuth, requireAdmin, couponController.updateCoupon);
router.delete("/admin/:id", requireAuth, requireAdmin, couponController.deleteCoupon);

export default router;
