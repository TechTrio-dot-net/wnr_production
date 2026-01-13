import { Types } from "mongoose";
import { UserReward, CoinTransaction, UserRewardDoc } from "./reward.model";
import { RewardTierModel, DEFAULT_TIERS } from "./reward-tier.model";
import { RewardTier } from "./reward.model";
import { connectDB } from "../../lib/db";

const COIN_VALIDITY_DAYS = 180;

/**
 * Get or create user reward record
 */
export async function getUserReward(userId: Types.ObjectId): Promise<UserRewardDoc> {
  await connectDB();
  let reward = await UserReward.findOne({ user: userId });
  
  if (!reward) {
    reward = await UserReward.create({
      user: userId,
      totalCoinsEarned: 0,
      totalCoinsRedeemed: 0,
      currentBalance: 0,
      tier: "silver",
      tierUpdatedAt: new Date(),
    });
  }
  
  return reward;
}

/**
 * Calculate current tier based on total coins earned
 */
export async function calculateTier(totalCoinsEarned: number): Promise<RewardTier> {
  await connectDB();
  
  // Get tier configurations from database or use defaults
  const tiers = await RewardTierModel.find().sort({ minCoinsEarned: -1 }).lean();
  const tierConfigs = tiers.length > 0 ? tiers : DEFAULT_TIERS;
  
  // Find the highest tier the user qualifies for
  for (const tierConfig of tierConfigs) {
    if (totalCoinsEarned >= tierConfig.minCoinsEarned) {
      return tierConfig.tier as RewardTier;
    }
  }
  
  return "silver";
}

/**
 * Update user tier if needed
 */
export async function updateUserTier(userId: Types.ObjectId): Promise<RewardTier> {
  await connectDB();
  const reward = await getUserReward(userId);
  const newTier = await calculateTier(reward.totalCoinsEarned);
  
  if (newTier !== reward.tier) {
    reward.tier = newTier;
    reward.tierUpdatedAt = new Date();
    await reward.save();
  }
  
  return newTier;
}

/**
 * Award coins to user (1 rupee = 1 coin, excluding shipping)
 */
export async function awardCoins(
  userId: Types.ObjectId,
  amount: number,
  orderId?: Types.ObjectId,
  description?: string
): Promise<{ coins: number; newBalance: number; tier: RewardTier }> {
  await connectDB();
  
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }
  
  const reward = await getUserReward(userId);
  
  // Get user's tier to apply multiplier
  const tier = await calculateTier(reward.totalCoinsEarned);
  const tierConfig = await RewardTierModel.findOne({ tier }).lean();
  const multiplier = tierConfig?.coinMultiplier || 1.0;
  
  // Calculate coins with tier bonus
  const baseCoins = Math.floor(amount);
  const bonusCoins = Math.floor(baseCoins * (multiplier - 1));
  const totalCoins = baseCoins + bonusCoins;
  
  // Create transaction
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + COIN_VALIDITY_DAYS);
  
  await CoinTransaction.create({
    user: userId,
    type: "earned",
    amount: totalCoins,
    orderId,
    expiresAt,
    description: description || `Earned ${totalCoins} coins from purchase`,
  });
  
  // Update user reward
  reward.totalCoinsEarned += totalCoins;
  reward.currentBalance += totalCoins;
  reward.lastCoinEarnedAt = new Date();
  
  // Update tier if needed
  const newTier = await calculateTier(reward.totalCoinsEarned);
  if (newTier !== reward.tier) {
    reward.tier = newTier;
    reward.tierUpdatedAt = new Date();
  }
  
  await reward.save();
  
  return {
    coins: totalCoins,
    newBalance: reward.currentBalance,
    tier: newTier,
  };
}

/**
 * Redeem coins (used at checkout)
 */
export async function redeemCoins(
  userId: Types.ObjectId,
  amount: number,
  orderId?: Types.ObjectId
): Promise<{ success: boolean; redeemed: number; newBalance: number }> {
  await connectDB();
  
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }
  
  const reward = await getUserReward(userId);
  
  // Check if user has enough active coins
  const activeCoins = await getActiveCoinBalance(userId);
  
  if (activeCoins < amount) {
    return {
      success: false,
      redeemed: 0,
      newBalance: activeCoins,
    };
  }
  
  // Get active coins (oldest first) to redeem
  const transactions = await CoinTransaction.find({
    user: userId,
    type: "earned",
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: 1 })
    .lean();
  
  let remaining = amount;
  const redeemedTransactions: Array<{ id: Types.ObjectId; amount: number }> = [];
  
  for (const tx of transactions) {
    if (remaining <= 0) break;
    
    const available = tx.amount;
    const toRedeem = Math.min(available, remaining);
    
    if (toRedeem > 0) {
      // Create redemption transaction
      await CoinTransaction.create({
        user: userId,
        type: "redeemed",
        amount: -toRedeem,
        orderId,
        expiresAt: tx.expiresAt,
        description: `Redeemed ${toRedeem} coins`,
      });
      
      redeemedTransactions.push({ id: String(tx._id), amount: toRedeem } as any);
      remaining -= toRedeem;
    }
  }
  
  // Update user reward
  reward.totalCoinsRedeemed += amount;
  reward.currentBalance = Math.max(0, reward.currentBalance - amount);
  await reward.save();
  
  return {
    success: true,
    redeemed: amount,
    newBalance: reward.currentBalance,
  };
}

/**
 * Get active coin balance (excluding expired coins)
 */
export async function getActiveCoinBalance(userId: Types.ObjectId): Promise<number> {
  await connectDB();
  
  // Clean up expired coins first
  await expireOldCoins(userId);
  
  const reward = await getUserReward(userId);
  
  // Recalculate from transactions to ensure accuracy
  const activeTransactions = await CoinTransaction.aggregate([
    {
      $match: {
        user: new Types.ObjectId(userId),
        expiresAt: { $gt: new Date() },
      },
    },
    {
      $group: {
        _id: null,
        earned: {
          $sum: {
            $cond: [{ $eq: ["$type", "earned"] }, "$amount", 0],
          },
        },
        redeemed: {
          $sum: {
            $cond: [{ $eq: ["$type", "redeemed"] }, { $abs: "$amount" }, 0],
          },
        },
      },
    },
  ]);
  
  if (activeTransactions.length === 0) {
    return 0;
  }
  
  const { earned = 0, redeemed = 0 } = activeTransactions[0];
  return Math.max(0, earned - redeemed);
}

/**
 * Expire old coins (cleanup job)
 */
export async function expireOldCoins(userId: Types.ObjectId): Promise<number> {
  await connectDB();
  
  const now = new Date();
  const expiredTransactions = await CoinTransaction.find({
    user: userId,
    type: "earned",
    expiresAt: { $lte: now },
    amount: { $gt: 0 },
  }).lean();
  
  let totalExpired = 0;
  
  for (const tx of expiredTransactions) {
    // Check if already expired
    const alreadyExpired = await CoinTransaction.findOne({
      user: userId,
      type: "expired",
      orderId: tx.orderId,
      createdAt: { $gte: tx.expiresAt },
    });
    
    if (!alreadyExpired && tx.amount > 0) {
      await CoinTransaction.create({
        user: userId,
        type: "expired",
        amount: -tx.amount,
        orderId: tx.orderId,
        expiresAt: tx.expiresAt,
        description: `Coins expired after ${COIN_VALIDITY_DAYS} days`,
      });
      
      totalExpired += tx.amount;
    }
  }
  
  if (totalExpired > 0) {
    const reward = await getUserReward(userId);
    reward.currentBalance = Math.max(0, reward.currentBalance - totalExpired);
    await reward.save();
  }
  
  return totalExpired;
}

/**
 * Get user reward summary
 */
export async function getRewardSummary(userId: Types.ObjectId) {
  await connectDB();
  
  const reward = await getUserReward(userId);
  await expireOldCoins(userId);
  
  const activeBalance = await getActiveCoinBalance(userId);
  const tier = await calculateTier(reward.totalCoinsEarned);
  
  // Get tier details
  const tierConfig = await RewardTierModel.findOne({ tier }).lean();
  const tierInfo = tierConfig || DEFAULT_TIERS.find((t) => t.tier === tier) || DEFAULT_TIERS[0];
  
  if (!tierInfo) {
    throw new Error("Tier info not found");
  }
  
  // Get next tier info
  const allTiers = await RewardTierModel.find({}).sort({ minCoinsEarned: 1 }).lean();
  const tierList = allTiers.length > 0 ? allTiers : DEFAULT_TIERS;
  const currentTierIndex = tierList.findIndex((t) => t.tier === tier);
  const nextTier = currentTierIndex < tierList.length - 1 ? tierList[currentTierIndex + 1] : null;
  
  // Get recent transactions
  const recentTransactions = await CoinTransaction.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate({ path: "orderId", select: "orderNumber" })
    .lean();
  
  return {
    balance: activeBalance,
    totalEarned: reward.totalCoinsEarned,
    totalRedeemed: reward.totalCoinsRedeemed,
    tier: {
      current: tier,
      name: tierInfo.name,
      multiplier: tierInfo.coinMultiplier,
      couponDiscount: tierInfo.couponDiscount,
      couponCode: tierInfo.couponCode,
      benefits: tierInfo.benefits,
      nextTier: nextTier
        ? {
            tier: nextTier.tier,
            name: nextTier.name,
            minCoinsEarned: nextTier.minCoinsEarned,
            coinsNeeded: Math.max(0, nextTier.minCoinsEarned - reward.totalCoinsEarned),
          }
        : null,
    },
    transactions: recentTransactions.map((tx) => ({
      id: String(tx._id),
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      orderNumber: (tx.orderId as any)?.orderNumber,
      createdAt: tx.createdAt,
      expiresAt: tx.expiresAt,
    })),
  };
}
