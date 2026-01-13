import { Schema, model, Document, Types } from "mongoose";

export type RewardTier = "silver" | "gold" | "diamond";

export interface CoinTransactionDoc extends Document {
  user: Types.ObjectId;
  type: "earned" | "redeemed" | "expired";
  amount: number; // positive for earned, negative for redeemed/expired
  orderId?: Types.ObjectId; // if earned from order
  expiresAt: Date; // coins expire after 180 days
  description?: string;
  createdAt: Date;
}

export interface UserRewardDoc extends Document {
  user: Types.ObjectId;
  totalCoinsEarned: number;
  totalCoinsRedeemed: number;
  currentBalance: number; // active coins (not expired)
  tier: RewardTier;
  tierUpdatedAt: Date;
  lastCoinEarnedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CoinTransactionSchema = new Schema<CoinTransactionDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["earned", "redeemed", "expired"],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", index: true },
    expiresAt: { type: Date, required: true, index: true },
    description: String,
  },
  { timestamps: true, collection: "coin_transactions" }
);

// Indexes for optimized queries
CoinTransactionSchema.index({ expiresAt: 1, type: 1 }); // Expired coins cleanup
CoinTransactionSchema.index({ user: 1, createdAt: -1 }); // User transaction history
CoinTransactionSchema.index({ user: 1, type: 1, createdAt: -1 }); // User transactions by type
CoinTransactionSchema.index({ orderId: 1 }); // Order-based transactions
CoinTransactionSchema.index({ expiresAt: 1 }); // Expiration queries

const UserRewardSchema = new Schema<UserRewardDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    totalCoinsEarned: { type: Number, default: 0, min: 0 },
    totalCoinsRedeemed: { type: Number, default: 0, min: 0 },
    currentBalance: { type: Number, default: 0, min: 0 },
    tier: {
      type: String,
      enum: ["silver", "gold", "diamond"],
      default: "silver",
      index: true,
    },
    tierUpdatedAt: { type: Date, default: Date.now },
    lastCoinEarnedAt: Date,
  },
  { timestamps: true, collection: "user_rewards" }
);

// UserReward indexes
UserRewardSchema.index({ tier: 1 }); // Tier-based queries
UserRewardSchema.index({ currentBalance: -1 }); // Top users by balance

export const CoinTransaction = model<CoinTransactionDoc>("CoinTransaction", CoinTransactionSchema);
export const UserReward = model<UserRewardDoc>("UserReward", UserRewardSchema);
