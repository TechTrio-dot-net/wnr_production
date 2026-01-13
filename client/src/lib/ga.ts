// src/lib/ga.ts
export type GAItem = {
  item_id?: string;
  item_name?: string;
  price?: number;
  quantity?: number;
};

function gtagSafe(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const anyWin = window as any;
  if (typeof anyWin.gtag === "function") {
    anyWin.gtag("event", event, params || {});
  }
}

export function trackAddToCart(items: GAItem[] = []) {
  gtagSafe("add_to_cart", { currency: "INR", items });
}

export function trackBeginCheckout(items: GAItem[] = [], value?: number) {
  gtagSafe("begin_checkout", { currency: "INR", value, items });
}

export function trackPurchase(transactionId: string, value: number, items: GAItem[] = []) {
  gtagSafe("purchase", {
    transaction_id: transactionId,
    value,
    currency: "INR",
    items,
  });
}


