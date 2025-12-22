import { Request, Response } from "express";
import CouponModel from "./coupon.model";
import { validateCoupon, recordCouponUsage } from "./coupon.service";
import { Types } from "mongoose";

/**
 * GET /api/coupons/validate
 * Validate a coupon code
 */
export async function validateCouponCode(req: Request, res: Response) {
  try {
    const { code, subtotal, productIds, categoryIds } = req.body;
    const userId = (req as any).userId;

    if (!code || !subtotal) {
      return res.status(400).json({ message: "Code and subtotal are required" });
    }

    const result = await validateCoupon({
      code,
      userId,
      subtotal: Number(subtotal),
      productIds: Array.isArray(productIds) ? productIds : [],
      categoryIds: Array.isArray(categoryIds) ? categoryIds : [],
    });

    if (!result.valid) {
      return res.status(400).json({
        valid: false,
        message: result.message || "Invalid coupon",
      });
    }

    return res.json({
      valid: true,
      coupon: {
        code: result.coupon!.code,
        name: result.coupon!.name,
        discountType: result.coupon!.discountType,
        discountValue: result.coupon!.discountValue,
      },
      discountAmount: result.discountAmount,
    });
  } catch (error: any) {
    console.error("Validate coupon error:", error);
    return res.status(500).json({ message: error?.message || "Failed to validate coupon" });
  }
}

/**
 * POST /api/coupons/apply
 * Apply coupon and record usage
 */
export async function applyCoupon(req: Request, res: Response) {
  try {
    const { code, subtotal, productIds, categoryIds, orderId } = req.body;
    const userId = (req as any).userId;

    if (!code || !subtotal) {
      return res.status(400).json({ message: "Code and subtotal are required" });
    }

    const result = await validateCoupon({
      code,
      userId,
      subtotal: Number(subtotal),
      productIds: Array.isArray(productIds) ? productIds : [],
      categoryIds: Array.isArray(categoryIds) ? categoryIds : [],
    });

    if (!result.valid || !result.coupon) {
      return res.status(400).json({
        valid: false,
        message: result.message || "Invalid coupon",
      });
    }

    // Record usage if orderId is provided
    if (orderId && result.coupon && result.coupon._id) {
      await recordCouponUsage(String(result.coupon._id), userId);
    }

    return res.json({
      valid: true,
      coupon: {
        code: result.coupon.code,
        name: result.coupon.name,
        discountType: result.coupon.discountType,
        discountValue: result.coupon.discountValue,
      },
      discountAmount: result.discountAmount,
    });
  } catch (error: any) {
    console.error("Apply coupon error:", error);
    return res.status(500).json({ message: error?.message || "Failed to apply coupon" });
  }
}

/**
 * GET /api/admin/coupons
 * Get all coupons (admin)
 */
export async function getCoupons(req: Request, res: Response) {
  try {
    const coupons = await (CouponModel as any).find({}).sort({ createdAt: -1 }).lean();
    return res.json({ coupons });
  } catch (error: any) {
    console.error("Get coupons error:", error);
    return res.status(500).json({ message: error?.message || "Failed to fetch coupons" });
  }
}

/**
 * POST /api/admin/coupons
 * Create a new coupon (admin)
 */
export async function createCoupon(req: Request, res: Response) {
  try {
    const couponData = req.body;
    const coupon = new CouponModel(couponData);
    await coupon.save();
    return res.json({ coupon });
  } catch (error: any) {
    console.error("Create coupon error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }
    return res.status(500).json({ message: error?.message || "Failed to create coupon" });
  }
}

/**
 * PUT /api/admin/coupons/:id
 * Update a coupon (admin)
 */
export async function updateCoupon(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid coupon ID" });
    }

    const coupon = await (CouponModel as any).findByIdAndUpdate(id, req.body, { new: true }).lean();
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    return res.json({ coupon });
  } catch (error: any) {
    console.error("Update coupon error:", error);
    return res.status(500).json({ message: error?.message || "Failed to update coupon" });
  }
}

/**
 * DELETE /api/admin/coupons/:id
 * Delete a coupon (admin)
 */
export async function deleteCoupon(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid coupon ID" });
    }

    await (CouponModel as any).findByIdAndDelete(id).exec();
    return res.json({ message: "Coupon deleted" });
  } catch (error: any) {
    console.error("Delete coupon error:", error);
    return res.status(500).json({ message: error?.message || "Failed to delete coupon" });
  }
}
