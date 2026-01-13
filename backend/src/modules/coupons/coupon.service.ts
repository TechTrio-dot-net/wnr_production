import CouponModel, { CouponDoc } from "./coupon.model";
import { Types } from "mongoose";

export interface ValidateCouponParams {
  code: string;
  userId?: string;
  subtotal: number;
  productIds?: string[];
  categoryIds?: string[];
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: CouponDoc;
  discountAmount: number;
  message?: string;
}

/**
 * Validate and apply coupon
 */
export async function validateCoupon(params: ValidateCouponParams): Promise<CouponValidationResult> {
  const { code, userId, subtotal, productIds = [], categoryIds = [] } = params;

  // Find coupon
  const coupon = await (CouponModel as any).findOne({
    code: code.toUpperCase().trim(),
    isActive: true,
  }).lean();

  if (!coupon) {
    return {
      valid: false,
      discountAmount: 0,
      message: "Invalid coupon code",
    };
  }

  // Check validity dates
  const now = new Date();
  if (now < coupon.validFrom) {
    return {
      valid: false,
      discountAmount: 0,
      message: "Coupon is not yet valid",
    };
  }

  if (now > coupon.validUntil) {
    return {
      valid: false,
      discountAmount: 0,
      message: "Coupon has expired",
    };
  }

  // Check usage limit
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return {
      valid: false,
      discountAmount: 0,
      message: "Coupon usage limit reached",
    };
  }

  // Check minimum purchase amount
  if (coupon.minPurchaseAmount && subtotal < coupon.minPurchaseAmount) {
    return {
      valid: false,
      discountAmount: 0,
      message: `Minimum purchase of ₹${coupon.minPurchaseAmount} required`,
    };
  }

  // Check product/category applicability
  if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
    const applicableProductIds = coupon.applicableProducts.map((id: any) => String(id));
    const hasApplicableProduct = productIds.some((id: any) => applicableProductIds.includes(String(id)));
    if (!hasApplicableProduct) {
      return {
        valid: false,
        discountAmount: 0,
        message: "Coupon not applicable to selected products",
      };
    }
  }

  if (coupon.excludeProducts && coupon.excludeProducts.length > 0) {
    const excludedProductIds = coupon.excludeProducts.map((id: any) => String(id));
    const hasExcludedProduct = productIds.some((id: any) => excludedProductIds.includes(String(id)));
    if (hasExcludedProduct) {
      return {
        valid: false,
        discountAmount: 0,
        message: "Coupon not applicable to selected products",
      };
    }
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = (subtotal * coupon.discountValue) / 100;
    if (coupon.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
    }
  } else {
    discountAmount = Math.min(coupon.discountValue, subtotal);
  }

  return {
    valid: true,
    coupon,
    discountAmount: Math.round(discountAmount * 100) / 100,
  };
}

/**
 * Record coupon usage
 */
export async function recordCouponUsage(couponId: string | Types.ObjectId, userId?: string): Promise<void> {
  await (CouponModel as any).updateOne(
    { _id: couponId },
    { $inc: { usageCount: 1 } }
  ).exec();
}
