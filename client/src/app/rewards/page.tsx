"use client";

import { useEffect, useState } from "react";
import { buildUrl } from "@/lib/api";
import { getAuthHeader } from "@/lib/token";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";
import { Coins, Gift, TrendingUp, Clock, Award, Star } from "lucide-react";
import Link from "next/link";

type RewardSummary = {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  tier: {
    current: "silver" | "gold" | "diamond";
    name: string;
    multiplier: number;
    couponDiscount?: number;
    couponCode?: string;
    benefits: string[];
    nextTier: {
      tier: string;
      name: string;
      minCoinsEarned: number;
      coinsNeeded: number;
    } | null;
  };
  transactions: Array<{
    id: string;
    type: "earned" | "redeemed" | "expired";
    amount: number;
    description: string;
    orderNumber?: string;
    createdAt: string;
    expiresAt: string;
  }>;
};

export default function RewardsPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<RewardSummary | null>(null);

  useEffect(() => {
    if (user) {
      fetchRewards();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function fetchRewards() {
    try {
      setLoading(true);
      const res = await fetch(buildUrl("/api/rewards/balance"), {
        headers: getAuthHeader(),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch rewards");
      }

      const data = await res.json();
      setSummary(data);
    } catch (error: any) {
      console.error("Failed to fetch rewards:", error);
      toast.error(error.message || "Failed to load rewards");
    } finally {
      setLoading(false);
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "diamond":
        return "from-blue-500 to-purple-600";
      case "gold":
        return "from-yellow-400 to-orange-500";
      case "silver":
        return "from-gray-300 to-gray-500";
      default:
        return "from-gray-300 to-gray-500";
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "diamond":
        return <Star className="w-6 h-6" />;
      case "gold":
        return <Award className="w-6 h-6" />;
      case "silver":
        return <Coins className="w-6 h-6" />;
      default:
        return <Coins className="w-6 h-6" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-white py-24 mt-[calc(6.25rem+var(--offer-strip-height,0px))]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-[var(--wnr-berry)] mb-4">Rewards & Coins</h1>
          <p className="text-gray-600 mb-6">Please login to view your rewards</p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-[var(--wnr-berry)] text-white rounded-lg hover:opacity-90"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white py-24 mt-[calc(6.25rem+var(--offer-strip-height,0px))]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-48 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white py-8 md:py-12 mt-[calc(6.25rem+var(--offer-strip-height,0px))]">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--wnr-berry)] mb-8">My Rewards</h1>

        {summary && (
          <>
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-[var(--wnr-berry)] to-purple-600 rounded-2xl p-6 md:p-8 text-white mb-8 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg md:text-xl font-semibold mb-2">Your WNR Coins</h2>
                  <p className="text-3xl md:text-5xl font-bold">{summary.balance.toLocaleString()}</p>
                </div>
                <div className="bg-white/20 rounded-full p-4">
                  <Coins className="w-8 h-8 md:w-10 md:h-10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="opacity-80">Total Earned</p>
                  <p className="text-xl font-semibold">{summary.totalEarned.toLocaleString()}</p>
                </div>
                <div>
                  <p className="opacity-80">Total Redeemed</p>
                  <p className="text-xl font-semibold">{summary.totalRedeemed.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Tier Card */}
            <div className={`bg-gradient-to-br ${getTierColor(summary.tier.current)} rounded-2xl p-6 md:p-8 text-white mb-8 shadow-lg`}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {getTierIcon(summary.tier.current)}
                    <h2 className="text-2xl md:text-3xl font-bold">{summary.tier.name} Member</h2>
                  </div>
                  <p className="opacity-90">
                    {summary.tier.multiplier > 1
                      ? `${Math.round((summary.tier.multiplier - 1) * 100)}% bonus coins on purchases`
                      : "Standard rewards"}
                  </p>
                </div>
              </div>

              {summary.tier.couponCode && (
                <div className="bg-white/20 rounded-lg p-4 mb-4">
                  <p className="text-sm opacity-90 mb-1">Your Exclusive Coupon</p>
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-mono font-bold">{summary.tier.couponCode}</code>
                    {summary.tier.couponDiscount && (
                      <span className="text-sm opacity-90">({summary.tier.couponDiscount}% off)</span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="font-semibold mb-2">Your Benefits:</p>
                <ul className="space-y-1">
                  {summary.tier.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {summary.tier.nextTier && (
                <div className="mt-6 pt-6 border-t border-white/20">
                  <p className="text-sm opacity-90 mb-2">
                    Progress to {summary.tier.nextTier.name}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            ((summary.totalEarned / summary.tier.nextTier.minCoinsEarned) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {summary.tier.nextTier.coinsNeeded.toLocaleString()} coins needed
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* How It Works */}
            <div className="bg-gray-50 rounded-2xl p-6 md:p-8 mb-8">
              <h3 className="text-xl font-bold text-[var(--wnr-berry)] mb-4">How Rewards Work</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex items-start gap-4">
                  <div className="bg-[var(--wnr-berry)]/10 rounded-lg p-3">
                    <Coins className="w-6 h-6 text-[var(--wnr-berry)]" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Earn Coins</h4>
                    <p className="text-sm text-gray-600">
                      1 rupee = 1 WNR coin (excluding shipping). Coins valid for 180 days.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-[var(--wnr-berry)]/10 rounded-lg p-3">
                    <TrendingUp className="w-6 h-6 text-[var(--wnr-berry)]" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Level Up</h4>
                    <p className="text-sm text-gray-600">
                      Earn more coins to unlock Silver, Gold, and Diamond tiers with exclusive benefits.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-[var(--wnr-berry)]/10 rounded-lg p-3">
                    <Gift className="w-6 h-6 text-[var(--wnr-berry)]" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Redeem</h4>
                    <p className="text-sm text-gray-600">
                      Use your coins at checkout to get discounts on your purchases.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white border rounded-2xl p-6 md:p-8">
              <h3 className="text-xl font-bold text-[var(--wnr-berry)] mb-6">Recent Transactions</h3>
              {summary.transactions.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No transactions yet</p>
              ) : (
                <div className="space-y-4">
                  {summary.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-lg ${
                            tx.type === "earned"
                              ? "bg-green-100 text-green-600"
                              : tx.type === "redeemed"
                              ? "bg-blue-100 text-blue-600"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {tx.type === "earned" ? (
                            <TrendingUp className="w-5 h-5" />
                          ) : tx.type === "redeemed" ? (
                            <Gift className="w-5 h-5" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{tx.description}</p>
                          {tx.orderNumber && (
                            <p className="text-sm text-gray-600">Order: {tx.orderNumber}</p>
                          )}
                          <p className="text-xs text-gray-500">{formatDate(tx.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${
                            tx.type === "earned" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {tx.type === "earned" ? "+" : ""}
                          {tx.amount.toLocaleString()} coins
                        </p>
                        {tx.type === "earned" && (
                          <p className="text-xs text-gray-500">
                            Expires: {formatDate(tx.expiresAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
