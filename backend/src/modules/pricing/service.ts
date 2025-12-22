import { applyLaunchPromo } from "./applyLaunchPromo";
import type { CartItem } from "./types";

export type PricingInput = {
  items: CartItem[];
  address?: { pincode?: string | null };
  shipping?: {
    pickupPincode?: string;
    length?: number;
    width?: number;
    height?: number;
    weightGrams?: number;
    doorstepQc?: boolean;
  };
};

export type PricingResult = {
  items: Array<{
    name?: string;
    qty: number;
    unitPrice: number;
    lineSubtotal: number;
    lineDiscount: number;
    lineTotal: number;
    promoLabel?: string | null;
  }>;
  subtotal: number;
  discountTotal: number;
  shipping: number;
  grandTotal: number;
  promoSummary: string[];
  etaDays?: number | null;
};

const DEFAULTS = {
  pickup: process.env.ESHOPBOX_PICKUP_LOCATION_CODE || "380015",
  L: 8,
  W: 12,
  H: 9.5,
  WG: 27,
};

/** Swap to your internal shipping service if available */
async function calcShipping(
  pin: string | null | undefined,
  _merchandiseTotal: number,
  dims?: PricingInput["shipping"]
) {
  if (!pin || !/^\d{6}$/.test(pin)) return { amount: 0, eta: null as number | null };

  try {
    const body = {
      journeyType: "forward",
      pickupPincode: dims?.pickupPincode || DEFAULTS.pickup,
      dropPincode: pin,
      orderWeight: Number(dims?.weightGrams ?? DEFAULTS.WG),
      length: Number(dims?.length ?? DEFAULTS.L),
      width: Number(dims?.width ?? DEFAULTS.W),
      height: Number(dims?.height ?? DEFAULTS.H),
      paymentMethod: "Prepaid",
      codAmountToBeCollected: 0,
      doorstepQc: !!dims?.doorstepQc,
    };

    const res = await fetch(`${process.env.API_BASE_URL || ""}/api/shipping/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return {
      amount: Number(data?.totalShippingCharges) || 0,
      eta: (data?.estimatedDeliveryDays as number | null) ?? null,
    };
  } catch {
    return { amount: 0, eta: null };
  }
}

export async function priceCart(input: PricingInput): Promise<PricingResult> {
  // Build CartItem objects with concrete strings for name/productId
  const baseItems: CartItem[] = input.items.map((it) => {
    const obj: CartItem = {
      ...(it.product ? { product: it.product } : {}),
      productId: String(it.productId ?? it.product?._id ?? ""),
      name: String(it.name ?? it.product?.name ?? ""),
      price: Number(it.price) || 0,
      qty: Number(it.qty) || 0,
    };
    return obj;
  });

  const { items: withPromo, discountTotal } = applyLaunchPromo(baseItems);

  const subtotal = withPromo.reduce((s, it) => s + it.lineSubtotal, 0);
  const merchandiseTotal = withPromo.reduce((s, it) => s + it.lineTotal, 0);

  const ship = await calcShipping(input.address?.pincode ?? null, merchandiseTotal, input.shipping);
  const shipping = ship.amount;
  const grandTotal = Math.max(0, merchandiseTotal + shipping);

  return {
    items: withPromo.map((it) => ({
      name: it.name ?? "Product",
      qty: it.qty,
      unitPrice: it.price,
      lineSubtotal: it.lineSubtotal,
      lineDiscount: it.lineDiscount,
      lineTotal: it.lineTotal,
      promoLabel: it.promoLabel ?? null, // never undefined
    })),
    subtotal,
    discountTotal,
    shipping,
    grandTotal,
    promoSummary: Array.from(
      new Set(withPromo.map((i) => i.promoLabel).filter((x): x is string => !!x))
    ),
    etaDays: ship.eta,
  };
}
