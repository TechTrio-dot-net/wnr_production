import type { CartItem } from "./types";

/* =========================================================
   LAUNCH PROMO CONFIG (admin editable, auto-expires)
   ========================================================= */

type PromoType = "AUTO"; // dynamic: B3G1 if ≥4, Combo-999 if exactly 2

interface LaunchPromoConfig {
  enabled: boolean;
  type: PromoType; // kept for clarity; logic is dynamic below
  productIds: string[]; // products that participate in the group
  launchEndsAtISO: string; // auto-expiry (IST)
  // Combo 2-for-999
  n: number;               // 2
  fixedPrice: number;      // 999
  // B3G1
  x: number;               // 3
  y: number;               // 1
}

export const LAUNCH_PROMO: LaunchPromoConfig = {
  enabled: true,
  type: "AUTO",
  productIds: [
    "68fce0f0c92b1b801763d3de", // DIGESTIVE BREW (₹499)
    "68fce032c92b1b801763d3d2", // SUGARWISE BREW (₹599)
    "68fcded7c92b1b801763d3c1", // SLIM BREW (₹599)
    "68fcddfdc92b1b801763d3be", // GUTEASE BREW (₹599)
    "68fcd950c92b1b801763d3af", // POWER BREW (₹599)
  ],
  launchEndsAtISO: "2025-11-30T23:59:59+05:30",
  // Combo
  n: 2,
  fixedPrice: 999,
  // Buy X Get Y
  x: 3,
  y: 1,
};

/* =========================================================
   TYPES
   ========================================================= */

export type PricedItem = CartItem & {
  lineSubtotal: number;
  lineDiscount: number;
  lineTotal: number;
  promoLabel?: string | null;
};

/* =========================================================
   HELPERS
   ========================================================= */

const pidOf = (it: CartItem) => String(it.productId ?? it.product?._id ?? it._id ?? "");

/** Build a flat list of units for all eligible lines (mix & match across group). */
function flattenEligibleUnits(items: CartItem[], eligible: Set<string>) {
  type Unit = { lineIndex: number; price: number };
  const units: Unit[] = [];
  items.forEach((it, idx) => {
    const pid = pidOf(it);
    if (!eligible.has(pid)) return;
    const qty = Math.max(0, Math.floor(it.qty));
    for (let k = 0; k < qty; k++) {
      units.push({ lineIndex: idx, price: it.price });
    }
  });
  return units;
}

/** Split a total discount across some line indices proportionally by (lineSubtotal). */
function splitDiscountProportionally(
  base: Array<{ idx: number; amount: number }>, // per-line subtotal among the targeted set
  totalDiscount: number
) {
  const totals = base.reduce((s, b) => s + b.amount, 0) || 1;
  const parts = base.map((b) => ({
    idx: b.idx,
    share: Math.floor((b.amount / totals) * totalDiscount),
  }));
  // rounding fix
  const assigned = parts.reduce((s, p) => s + p.share, 0);
  let delta = totalDiscount - assigned;
  if (delta !== 0) {
    const first = parts[0];
    if (first) first.share += delta;
  }
  return parts;
}

/* =========================================================
   MAIN FUNCTION
   ========================================================= */

export function applyLaunchPromo(items: CartItem[]): {
  items: PricedItem[];
  discountTotal: number;
  promoLabel: string | null;
} {
  const now = new Date();
  const active = LAUNCH_PROMO.enabled && now < new Date(LAUNCH_PROMO.launchEndsAtISO);

  // Passthrough if inactive
  if (!active) {
    const passthrough: PricedItem[] = items.map((it) => {
      const lineSubtotal = it.price * it.qty;
      return {
        ...it,
        lineSubtotal,
        lineDiscount: 0,
        lineTotal: lineSubtotal,
        promoLabel: null,
      };
    });
    return { items: passthrough, discountTotal: 0, promoLabel: null };
  }

  const eligible = new Set(LAUNCH_PROMO.productIds.map(String));

  // Prepare base priced lines (we will add discounts later)
  const priced: PricedItem[] = items.map((it) => {
    const lineSubtotal = it.price * it.qty;
    return {
      ...it,
      lineSubtotal,
      lineDiscount: 0,
      lineTotal: lineSubtotal,
      promoLabel: null,
    };
  });

  // Build unit list across *all* eligible products (mix & match)
  const units = flattenEligibleUnits(items, eligible);
  const totalQty = units.length;

  let appliedLabel: string | null = null;

  // ========== CASE 1: B3G1 if total eligible quantity ≥ 4 ==========
  if (totalQty >= (LAUNCH_PROMO.x + LAUNCH_PROMO.y)) {
    const x = LAUNCH_PROMO.x;
    const y = LAUNCH_PROMO.y;
    const bundleSize = x + y;
    const bundles = Math.floor(totalQty / bundleSize);
    const freeUnits = bundles * y;

    if (freeUnits > 0) {
      // Choose the cheapest units as free (standard retailer rule for mixed-price groups)
      const sortedAsc = [...units].sort((a, b) => a.price - b.price);
      const free = sortedAsc.slice(0, freeUnits);

      // Sum discount and add per-line
      let totalDiscount = 0;
      const perLineSum: Record<number, number> = {};
      for (const u of free) {
        totalDiscount += u.price;
        perLineSum[u.lineIndex] = (perLineSum[u.lineIndex] ?? 0) + u.price;
      }

      // Apply discounts line-wise
      Object.entries(perLineSum).forEach(([idxStr, d]) => {
        const idx = Number(idxStr);
        const line = priced[idx];
        if (!line) return;
        line.lineDiscount += d;
        line.lineTotal = Math.max(0, line.lineSubtotal - line.lineDiscount);
        line.promoLabel = `Offer applied: Buy ${x} Get ${y} Free (mix & match)`;
      });

      appliedLabel = `Buy ${x} Get ${y} Free`;
    }
  }

  // ========== CASE 2: EXACTLY two eligible units → 2 for ₹999 ==========
  else if (totalQty === LAUNCH_PROMO.n) {
    const n = LAUNCH_PROMO.n; // 2
    // With exactly two units, the original sum is the sum of those two unit prices
    const originalSum = units.reduce((s, u) => s + u.price, 0);
    // Never increase price
    const target = Math.min(originalSum, LAUNCH_PROMO.fixedPrice);
    const totalDiscount = Math.max(0, originalSum - target);

    if (totalDiscount > 0) {
      // Split discount proportional to the two units' prices
      const byLine: Record<number, number> = {};
      units.forEach((u) => (byLine[u.lineIndex] = (byLine[u.lineIndex] ?? 0) + u.price));
      const base = Object.entries(byLine).map(([idx, amount]) => ({ idx: Number(idx), amount }));
      const shares = splitDiscountProportionally(base, totalDiscount);

      shares.forEach(({ idx, share }) => {
        const line = priced[idx];
        if (!line) return;
        line.lineDiscount += share;
        line.lineTotal = Math.max(0, line.lineSubtotal - line.lineDiscount);
        line.promoLabel = `Offer applied: Any ${n} for ₹${LAUNCH_PROMO.fixedPrice}`;
      });

      appliedLabel = `Any ${n} for ₹${LAUNCH_PROMO.fixedPrice}`;
    }
  }

  // (If totalQty is 1 or 3, or other values that don't match the above, no launch discount.)

  // Final discount total & rounding safety (lines are already non-negative)
  const discountTotal = priced.reduce((s, it) => s + it.lineDiscount, 0);

  return {
    items: priced,
    discountTotal,
    promoLabel: appliedLabel,
  };
}
