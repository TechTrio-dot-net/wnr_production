import { Schema, model, Document } from "mongoose";
import { RewardTier } from "./reward.model";

export interface RewardTierDoc extends Document {
  tier: RewardTier;
  name: string;
  minCoinsEarned: number; // Minimum total coins earned to reach this tier
  coinMultiplier: number; // Extra points multiplier (e.g., 1.1 = 10% bonus)
  couponDiscount?: number; // Percentage discount coupon unlocked
  couponCode?: string; // Coupon code for this tier
  benefits: string[]; // List of benefits for this tier
  createdAt: Date;
  updatedAt: Date;
}

const RewardTierSchema = new Schema<RewardTierDoc>(
  {
    tier: {
      type: String,
      enum: ["silver", "gold", "diamond"],
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true },
    minCoinsEarned: { type: Number, required: true, min: 0 },
    coinMultiplier: { type: Number, required: true, min: 1, default: 1 },
    couponDiscount: { type: Number, min: 0, max: 100 },
    couponCode: String,
    benefits: { type: [String], default: [] },
  },
  { timestamps: true, collection: "reward_tiers" }
);

export const RewardTierModel = model<RewardTierDoc>("RewardTier", RewardTierSchema);

// Default tier configurations
export const DEFAULT_TIERS = [
  {
    tier: "silver" as RewardTier,
    name: "Silver",
    minCoinsEarned: 0,
    coinMultiplier: 1.0,
    couponDiscount: 5,
    couponCode: "SILVER5",
    benefits: ["5% discount coupon", "Standard rewards"],
  },
  {
    tier: "gold" as RewardTier,
    name: "Gold",
    minCoinsEarned: 1000,
    coinMultiplier: 1.1, // 10% bonus coins
    couponDiscount: 10,
    couponCode: "GOLD10",
    benefits: ["10% discount coupon", "10% bonus coins on purchases", "Priority support"],
  },
  {
    tier: "diamond" as RewardTier,
    name: "Diamond",
    minCoinsEarned: 5000,
    coinMultiplier: 1.2, // 20% bonus coins
    couponDiscount: 15,
    couponCode: "DIAMOND15",
    benefits: ["15% discount coupon", "20% bonus coins on purchases", "VIP support", "Early access to new products"],
  },
];
