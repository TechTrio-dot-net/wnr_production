import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import {
  getUserReward,
  getRewardSummary,
  awardCoins,
  redeemCoins,
  getActiveCoinBalance,
  updateUserTier,
} from "./reward.service";
import { RewardTierModel, DEFAULT_TIERS } from "./reward-tier.model";

/**
 * GET /api/rewards/balance
 * Get user's current coin balance and reward summary
 */
export async function getBalance(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const summary = await getRewardSummary(req.userId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/rewards/redeem
 * Redeem coins (used at checkout)
 * Body: { amount: number, orderId?: string }
 */
export async function redeem(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { amount, orderId } = req.body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    const orderObjectId = orderId && Types.ObjectId.isValid(orderId) ? new Types.ObjectId(orderId) : undefined;

    const result = await redeemCoins(req.userId, Math.floor(amount), orderObjectId);

    if (!result.success) {
      return res.status(400).json({
        error: "Insufficient coins",
        balance: result.newBalance,
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/rewards/transactions
 * Get user's coin transaction history
 */
export async function getTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const { CoinTransaction } = await import("./reward.model");

    const [transactions, total] = await Promise.all([
      CoinTransaction.find({ user: req.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "orderId", select: "orderNumber" })
        .lean(),
      CoinTransaction.countDocuments({ user: req.userId }),
    ]);

    res.json({
      transactions: transactions.map((tx) => ({
        id: String(tx._id),
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        orderNumber: (tx.orderId as any)?.orderNumber,
        createdAt: tx.createdAt,
        expiresAt: tx.expiresAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * ADMIN: GET /api/admin/rewards/tiers
 * Get all reward tier configurations
 */
export async function getTiers(req: Request, res: Response, next: NextFunction) {
  try {
    const tiers = await RewardTierModel.find().sort({ minCoinsEarned: 1 }).lean();

    if (tiers.length === 0) {
      // Return default tiers if none configured
      return res.json({ tiers: DEFAULT_TIERS });
    }

    res.json({ tiers });
  } catch (err) {
    next(err);
  }
}

/**
 * ADMIN: PUT /api/admin/rewards/tiers/:tier
 * Update reward tier configuration
 */
export async function updateTier(req: Request, res: Response, next: NextFunction) {
  try {
    const { tier } = req.params;
    const { name, minCoinsEarned, coinMultiplier, couponDiscount, couponCode, benefits } = req.body;

    if (!tier || !["silver", "gold", "diamond"].includes(tier)) {
      return res.status(400).json({ error: "Invalid tier" });
    }

    const update: any = {};
    if (name) update.name = String(name);
    if (minCoinsEarned !== undefined) update.minCoinsEarned = Number(minCoinsEarned);
    if (coinMultiplier !== undefined) update.coinMultiplier = Number(coinMultiplier);
    if (couponDiscount !== undefined) update.couponDiscount = Number(couponDiscount);
    if (couponCode !== undefined) update.couponCode = String(couponCode);
    if (benefits !== undefined) update.benefits = Array.isArray(benefits) ? benefits : [];

    const tierDoc = await RewardTierModel.findOneAndUpdate({ tier }, update, {
      new: true,
      upsert: true,
      runValidators: true,
    });

    res.json(tierDoc);
  } catch (err) {
    next(err);
  }
}

/**
 * ADMIN: GET /api/admin/rewards/users
 * Get all users' reward statistics
 */
export async function getAllUserRewards(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const tier = req.query.tier as string | undefined;

    const { UserReward } = await import("./reward.model");

    const filter: any = {};
    if (tier && ["silver", "gold", "diamond"].includes(tier)) {
      filter.tier = tier;
    }

    const [rewards, total] = await Promise.all([
      UserReward.find(filter)
        .populate({ path: "user", select: "name email phone" })
        .sort({ totalCoinsEarned: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserReward.countDocuments(filter),
    ]);

    res.json({
      rewards: rewards.map((r) => ({
        id: String(r._id),
        userId: String(r.user),
        userName: (r.user as any)?.name,
        userEmail: (r.user as any)?.email,
        userPhone: (r.user as any)?.phone,
        totalCoinsEarned: r.totalCoinsEarned,
        totalCoinsRedeemed: r.totalCoinsRedeemed,
        currentBalance: r.currentBalance,
        tier: r.tier,
        tierUpdatedAt: r.tierUpdatedAt,
        lastCoinEarnedAt: r.lastCoinEarnedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * ADMIN: POST /api/admin/rewards/award
 * Manually award coins to a user
 */
export async function adminAwardCoins(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, amount, description } = req.body;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Valid userId is required" });
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    const result = await awardCoins(new Types.ObjectId(userId), Math.floor(amount), undefined, description);

    res.json(result);
  } catch (err) {
    next(err);
  }
}
