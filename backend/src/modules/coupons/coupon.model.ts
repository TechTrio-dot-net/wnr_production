import mongoose, { Schema, Document, Types } from "mongoose";

export interface CouponDoc extends Document {
  code: string;
  name: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number; // percentage (0-100) or fixed amount in rupees
  minPurchaseAmount?: number;
  maxDiscountAmount?: number; // For percentage coupons
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number; // Total usage limit
  usageCount: number; // Current usage count
  userLimit?: number; // Per user usage limit
  isActive: boolean;
  applicableCategories?: Types.ObjectId[]; // Product categories
  applicableProducts?: Types.ObjectId[]; // Specific products
  excludeProducts?: Types.ObjectId[];
  firstTimeUserOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<CouponDoc>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minPurchaseAmount: {
      type: Number,
      default: 0,
    },
    maxDiscountAmount: {
      type: Number,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    userLimit: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    applicableCategories: [{
      type: Schema.Types.ObjectId,
      ref: "Category",
    }],
    applicableProducts: [{
      type: Schema.Types.ObjectId,
      ref: "Product",
    }],
    excludeProducts: [{
      type: Schema.Types.ObjectId,
      ref: "Product",
    }],
    firstTimeUserOnly: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for optimized coupon queries
CouponSchema.index({ code: 1, isActive: 1, validFrom: 1, validUntil: 1 }); // Active coupon lookup
CouponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 }); // Active coupons list
CouponSchema.index({ createdAt: -1 }); // For sorting by newest
CouponSchema.index({ usageCount: 1 }); // For usage analytics

export default mongoose.models.Coupon || mongoose.model<CouponDoc>("Coupon", CouponSchema);
