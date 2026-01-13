"use client";

import React, { useEffect, useState } from "react";
import { Search, Filter, Coins, Award, Star, TrendingUp, Gift } from "lucide-react";
import { http } from "@/lib/api";
import { toast } from "sonner";

type UserReward = {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  totalCoinsEarned: number;
  totalCoinsRedeemed: number;
  currentBalance: number;
  tier: "silver" | "gold" | "diamond";
  tierUpdatedAt: string;
  lastCoinEarnedAt?: string | null;
};

type RewardTier = {
  tier: "silver" | "gold" | "diamond";
  name: string;
  minCoinsEarned: number;
  coinMultiplier: number;
  couponDiscount?: number;
  couponCode?: string;
  benefits: string[];
};

type RewardsResponse = {
  rewards: UserReward[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

type TiersResponse = {
  tiers: RewardTier[];
};

export default function RewardsPage() {
  const [rewards, setRewards] = useState<UserReward[]>([]);
  const [tiers, setTiers] = useState<RewardTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierLoading, setTierLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | "silver" | "gold" | "diamond">("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [awarding, setAwarding] = useState(false);
  const [awardUserId, setAwardUserId] = useState("");
  const [awardAmount, setAwardAmount] = useState("");
  const [awardDescription, setAwardDescription] = useState("");

  useEffect(() => {
    fetchRewards();
    fetchTiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tierFilter]);

  async function fetchRewards() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (tierFilter !== "all") {
        params.append("tier", tierFilter);
      }
      params.append("page", page.toString());
      params.append("limit", "20");

      const data = await http<RewardsResponse>(`/api/rewards/admin/users?${params.toString()}`);
      setRewards(data.rewards || []);
      setPagination(data.pagination || pagination);
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Failed to load rewards");
      setRewards([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTiers() {
    try {
      setTierLoading(true);
      const data = await http<TiersResponse>("/api/rewards/admin/tiers");
      setTiers(data.tiers || []);
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Failed to load tiers");
    } finally {
      setTierLoading(false);
    }
  }

  async function handleAwardCoins() {
    if (!awardUserId || !awardAmount) {
      toast.error("Please fill in user ID and amount");
      return;
    }

    const amount = Number(awardAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setAwarding(true);
      await http("/api/rewards/admin/award", {
        method: "POST",
        body: JSON.stringify({
          userId: awardUserId,
          amount: Math.floor(amount),
          description: awardDescription || `Admin awarded ${Math.floor(amount)} coins`,
        }),
      });
      toast.success(`Awarded ${Math.floor(amount)} coins`);
      setAwardUserId("");
      setAwardAmount("");
      setAwardDescription("");
      fetchRewards();
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Failed to award coins");
    } finally {
      setAwarding(false);
    }
  }

  const filteredRewards = rewards.filter((r) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.userName?.toLowerCase().includes(query) ||
      r.userEmail?.toLowerCase().includes(query) ||
      r.userPhone?.includes(query) ||
      r.userId.toLowerCase().includes(query)
    );
  });

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
        return <Star className="w-5 h-5" />;
      case "gold":
        return <Award className="w-5 h-5" />;
      case "silver":
        return <Coins className="w-5 h-5" />;
      default:
        return <Coins className="w-5 h-5" />;
    }
  };

  const stats = {
    totalUsers: rewards.length,
    totalCoinsEarned: rewards.reduce((sum, r) => sum + r.totalCoinsEarned, 0),
    totalCoinsRedeemed: rewards.reduce((sum, r) => sum + r.totalCoinsRedeemed, 0),
    totalActiveBalance: rewards.reduce((sum, r) => sum + r.currentBalance, 0),
    byTier: {
      silver: rewards.filter((r) => r.tier === "silver").length,
      gold: rewards.filter((r) => r.tier === "gold").length,
      diamond: rewards.filter((r) => r.tier === "diamond").length,
    },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rewards Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage user rewards, coins, and tiers</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Coins className="w-5 h-5" />}
          color="primary"
        />
        <StatCard
          title="Total Coins Earned"
          value={stats.totalCoinsEarned.toLocaleString()}
          icon={<TrendingUp className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Total Redeemed"
          value={stats.totalCoinsRedeemed.toLocaleString()}
          icon={<Gift className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Active Balance"
          value={stats.totalActiveBalance.toLocaleString()}
          icon={<Award className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Tier Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Coins className="w-5 h-5 text-gray-500" />
            <span className="font-semibold">Silver</span>
          </div>
          <p className="text-2xl font-bold">{stats.byTier.silver}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-5 h-5 text-yellow-600" />
            <span className="font-semibold">Gold</span>
          </div>
          <p className="text-2xl font-bold">{stats.byTier.gold}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Star className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">Diamond</span>
          </div>
          <p className="text-2xl font-bold">{stats.byTier.diamond}</p>
        </div>
      </div>

      {/* Tier Configuration */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Tier Configuration</h2>
        {tierLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {tiers.map((tier) => (
              <div
                key={tier.tier}
                className={`bg-gradient-to-r ${getTierColor(tier.tier)} rounded-lg p-4 text-white`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getTierIcon(tier.tier)}
                    <h3 className="text-lg font-bold">{tier.name}</h3>
                  </div>
                  <span className="text-sm opacity-90">
                    Min: {tier.minCoinsEarned.toLocaleString()} coins
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="opacity-80">Coin Multiplier</p>
                    <p className="font-semibold">{tier.coinMultiplier}x</p>
                  </div>
                  {tier.couponDiscount && (
                    <div>
                      <p className="opacity-80">Coupon Discount</p>
                      <p className="font-semibold">{tier.couponDiscount}% ({tier.couponCode})</p>
                    </div>
                  )}
                </div>
                {tier.benefits.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs opacity-80 mb-1">Benefits:</p>
                    <ul className="text-xs space-y-1">
                      {tier.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-white" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Award Coins */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Award Coins</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">User ID</label>
            <input
              type="text"
              value={awardUserId}
              onChange={(e) => setAwardUserId(e.target.value)}
              placeholder="User ID"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              value={awardAmount}
              onChange={(e) => setAwardAmount(e.target.value)}
              placeholder="Coins"
              min="1"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (Optional)</label>
            <input
              type="text"
              value={awardDescription}
              onChange={(e) => setAwardDescription(e.target.value)}
              placeholder="Description"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAwardCoins}
              disabled={awarding || !awardUserId || !awardAmount}
              className="w-full px-4 py-2 bg-[var(--wnr-berry)] text-white rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {awarding ? "Awarding..." : "Award Coins"}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--wnr-berry)]"
          />
        </div>
        <div className="w-full md:w-48 relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value as "all" | "silver" | "gold" | "diamond");
              setPage(1);
            }}
            className="w-full pl-9 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--wnr-berry)] appearance-none"
          >
            <option value="all">All Tiers</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="diamond">Diamond</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Tier</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Total Earned</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Total Redeemed</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Current Balance</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Last Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
                    </div>
                  </td>
                </tr>
              ) : filteredRewards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-600">
                    No rewards found
                  </td>
                </tr>
              ) : (
                filteredRewards.map((reward) => (
                  <tr key={reward.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{reward.userName || "Guest"}</p>
                        <p className="text-sm text-gray-600">{reward.userEmail || reward.userPhone || reward.userId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getTierColor(
                          reward.tier
                        )} text-white`}
                      >
                        {getTierIcon(reward.tier)}
                        <span className="capitalize">{reward.tier}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold">{reward.totalCoinsEarned.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700">{reward.totalCoinsRedeemed.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-[var(--wnr-berry)]">
                        {reward.currentBalance.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {reward.lastCoinEarnedAt
                          ? new Date(reward.lastCoinEarnedAt).toLocaleDateString("en-IN")
                          : "—"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages || loading}
                className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color = "primary",
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "primary" | "blue" | "emerald" | "amber";
}) {
  const colors = {
    primary: "bg-[var(--wnr-berry)]/10 text-[var(--wnr-berry)]",
    blue: "bg-blue-500/10 text-blue-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
  };

  return (
    <div className="bg-white border rounded-lg p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
