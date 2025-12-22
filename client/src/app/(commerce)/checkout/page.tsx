// src/app/buy-now/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { isLoggedIn, currentPathWithQuery } from "@/lib/auth";
import { buildUrl as build, CartAPI } from "@/lib/api";
import AddAddressModal, { type AddressPayload } from "@/components/common/AddAddressModal";
import { toast } from "sonner";

/* ---------- Razorpay setup ---------- */
declare global { interface Window { Razorpay?: any } }
const RZP_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

async function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.Razorpay) return true;
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/* ---------- types ---------- */
type RenderItem = {
  id: string;
  name: string;
  image: string | StaticImageData;
  price: number;
  quantity: number;
};

type ServerAddress = AddressPayload & { _id?: string };

type UserMe = {
  _id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  addresses?: ServerAddress[];
};

type RateQuote = {
  zone?: string;
  carrier?: "eshopboxStandard" | string;
  estimatedDeliveryDays?: number;
  totalShippingCharges: number;
  breakdown?: Record<string, number | undefined>;
};

/* --------- Products-only pricing from backend (no shipping/eta) ---------- */
type PricedLine = {
  name?: string;
  qty: number;
  unitPrice: number;
  lineSubtotal: number;
  lineDiscount: number;
  lineTotal: number;
  promoLabel?: string | null;
};

type ProductPriceResp = {
  items: PricedLine[];
  subtotal: number;
  discountTotal: number;
};

/* ---------- utils ---------- */
const INR = new Intl.NumberFormat("en-IN");
const money = (n: number) => `₹${INR.format(Math.max(0, Math.round(n)))}`;

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
const addrKey = (a?: ServerAddress) =>
  a?._id ? String(a._id) :
    a ? [norm(a.label as any), norm(a.line1), norm(a.line2), norm(a.city), norm(a.state), norm(a.pincode)].join("|") : "";

const dedupeByKey = (arr: ServerAddress[]) => {
  const seen = new Set<string>();
  const out: ServerAddress[] = [];
  for (const a of arr) {
    const k = addrKey(a);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push({
      label: (a.label as any) || "Home",
      line1: a.line1 || "",
      line2: a.line2 || "",
      city: a.city || "",
      state: a.state || "",
      pincode: a.pincode || "",
      _id: a._id,
    });
  }
  return out;
};

/* Reasonable defaults for shipping calc (kept internal for payload) */
const DEFAULT_PICKUP_PIN = process.env.NEXT_PUBLIC_PICKUP_PINCODE || "560034";
const DEFAULT_WEIGHT_G = 500; // 0.5 kg
const DEFAULT_L = 12;
const DEFAULT_W = 12;
const DEFAULT_H = 12;

export default function BuyNowPage() {
  /* ---------- Contact (read-only from /api/users/me) ---------- */
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  /* ---------- Addresses ---------- */
  const [addresses, setAddresses] = useState<ServerAddress[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const selectedAddress = useMemo(
    () => addresses.find((a) => addrKey(a) === selectedKey),
    [addresses, selectedKey]
  );

  /* ---------- Modal ---------- */
  const [addrModalOpen, setAddrModalOpen] = useState(false);

  /* ---------- Cart ---------- */
  const { cart, subtotal } = useCart();
  const items: RenderItem[] = useMemo(() => {
    const list = cart?.items ?? [];
    return list.map((it) => {
      const p = it.product;
      const price = (p?.price ?? it.priceAtAdd ?? 0) as number;
      const imageSrc =
        (Array.isArray(p?.images) && p!.images.length > 0
          ? (typeof p!.images[0] === "string"
            ? (p!.images[0] as string)
            : (p!.images[0] as { url: string }).url)
          : "/product-placeholder.png") as string;
      return {
        id: String(p?._id ?? it._id),
        name: String(p?.name ?? "Product"),
        image: imageSrc,
        price,
        quantity: it.qty,
      };
    });
  }, [cart]);

  /* ---------- Local shipping state ---------- */
  const [quote, setQuote] = useState<RateQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [deliverySpeed, setDeliverySpeed] = useState<"standard" | "express" | "prime">("standard");
  const [expressQuote, setExpressQuote] = useState<RateQuote | null>(null);
  const [primeQuote, setPrimeQuote] = useState<RateQuote | null>(null);
  // Force prepaid only
  const paymentMethod: "Prepaid" = "Prepaid";
  const orderWeight = DEFAULT_WEIGHT_G;
  const len = DEFAULT_L;
  const wid = DEFAULT_W;
  const ht = DEFAULT_H;
  const doorstepQc = false;

  /* ---------- server-priced PRODUCTS ONLY ---------- */
  const [priced, setPriced] = useState<ProductPriceResp | null>(null);

  /* ---------- Coin Redemption ---------- */
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [coinsToRedeem, setCoinsToRedeem] = useState<number>(0);
  const [redeemingCoins, setRedeemingCoins] = useState(false);

  /* ---------- Coupon ---------- */
  const [couponCode, setCouponCode] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    name: string;
    discountAmount: number;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => {
    async function loadCoinBalance() {
      try {
        const { getAuthHeader } = await import("@/lib/token");
        const authHeaders = getAuthHeader();
        const res = await fetch(build("/api/rewards/balance"), {
          headers: authHeaders,
        });
        if (res.ok) {
          const data = await res.json();
          setCoinBalance(data.balance || 0);
        }
      } catch {
        // Silent fail
      }
    }
    loadCoinBalance();
  }, []);

  /* ---------- Totals ---------- */
  const merchandiseSubtotal = subtotal;
  // Get shipping charge based on selected delivery speed
  const getShippingCharge = () => {
    if (deliverySpeed === "express") return expressQuote?.totalShippingCharges ?? 0;
    if (deliverySpeed === "prime") return primeQuote?.totalShippingCharges ?? 0;
    return quote?.totalShippingCharges ?? 0;
  };
  const shippingCharge = getShippingCharge();
  const coinDiscount = coinsToRedeem; // 1 coin = 1 rupee discount
  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const grandTotal = Math.max(0, merchandiseSubtotal + shippingCharge - coinDiscount - couponDiscount);
  
  // Calculate coins to be earned (1 rupee = 1 coin, excluding shipping)
  const coinsToEarn = Math.floor(merchandiseSubtotal);
  
  // Validate and apply coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    
    setValidatingCoupon(true);
    try {
      const { getAuthHeader } = await import("@/lib/token");
      const authHeaders = getAuthHeader();
      const res = await fetch(build("/api/coupons/validate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          code: couponCode.trim(),
          subtotal: merchandiseSubtotal,
          productIds: items.map((it) => it.id),
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message || "Invalid coupon code");
        setAppliedCoupon(null);
        return;
      }
      
      const data = await res.json();
      if (data.valid && data.coupon) {
        setAppliedCoupon({
          code: data.coupon.code,
          name: data.coupon.name,
          discountAmount: data.discountAmount,
        });
        toast.success(`Coupon "${data.coupon.code}" applied! You saved ₹${data.discountAmount.toFixed(2)}`);
      } else {
        toast.error(data.message || "Invalid coupon code");
        setAppliedCoupon(null);
      }
    } catch (error) {
      console.error("Coupon validation error:", error);
      toast.error("Failed to validate coupon");
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };
  
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast.info("Coupon removed");
  };

  /* ---------- Fetch /api/users/me ---------- */
  const fetchMe = useCallback(async (): Promise<UserMe | null> => {
    try {
      const { getAuthHeader } = await import("@/lib/token");
      const headers = getAuthHeader();
      const r = await fetch(build("/api/users/me"), { cache: "no-store", headers });
      if (!r.ok) return null;
      const me: UserMe = await r.json().catch(() => null as any);
      return me;
    } catch { return null; }
  }, []);

  const loadUserAndAddresses = useCallback(async (keepSelection?: string) => {
    const me = await fetchMe();
    if (!me) return;
    setEmail((me.email ?? "").trim());
    setPhone((me.phone ?? "").replace(/^\+?91/, ""));
    setFullName((me.name ?? "").trim());
    const serverAddrs = dedupeByKey(me.addresses || []);
    setAddresses(serverAddrs);
    const nextSel =
      keepSelection && serverAddrs.some((a) => addrKey(a) === keepSelection)
        ? keepSelection
        : serverAddrs[0]
          ? addrKey(serverAddrs[0])
          : "";
    setSelectedKey(nextSel);
  }, [fetchMe]);

  useEffect(() => { void loadUserAndAddresses(); }, [loadUserAndAddresses]);

  useEffect(() => {
    const onChanged = () => { void loadUserAndAddresses(selectedKey); };
    window.addEventListener("wnr:addresses:changed", onChanged as EventListener);
    return () => window.removeEventListener("wnr:addresses:changed", onChanged as EventListener);
  }, [loadUserAndAddresses, selectedKey]);

  /* ---------- fetch server product pricing (NO shipping/ETA) ---------- */
  const fetchProductPricing = useCallback(async () => {
    if ((items?.length ?? 0) === 0) {
      setPriced(null);
      return;
    }
    try {
      const { getAuthHeader } = await import("@/lib/token");
      const authHeaders = getAuthHeader();
      const payload = {
        items: items.map((it) => ({
          productId: it.id,
          name: it.name,
          price: it.price,
          qty: it.quantity,
        })),
      };

      const res = await fetch(build("/api/cart/price"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || res.statusText || "Pricing failed");
      }

      const data = (await res.json()) as ProductPriceResp | (ProductPriceResp & { shipping?: number; etaDays?: number | null });
      setPriced({ items: data.items, subtotal: data.subtotal, discountTotal: 0 });
    } catch {
      setPriced(null); // fall back to local subtotal if needed
    }
  }, [items]);

  useEffect(() => {
    const t = setTimeout(fetchProductPricing, 150);
    return () => clearTimeout(t);
  }, [fetchProductPricing]);

  /* ---------- Shipping rate ---------- */
  const manualRateRef = useRef(false);

  // Helper to fetch rate for a specific delivery speed
  const fetchRateForSpeed = useCallback(async (speed: "standard" | "express" | "prime") => {
    const pin = (selectedAddress?.pincode || "").trim();
    if (!/^\d{6}$/.test(pin) || merchandiseSubtotal <= 0) return null;

    try {
      const { getAuthHeader } = await import("@/lib/token");
      const authHeaders = getAuthHeader();
      const body = {
        journeyType: "forward",
        pickupPincode: DEFAULT_PICKUP_PIN,
        dropPincode: pin,
        orderWeight: Number(orderWeight),
        length: Number(len),
        width: Number(wid),
        height: Number(ht),
        paymentMethod,
        codAmountToBeCollected: 0,
        doorstepQc,
        deliverySpeed: speed, // Add delivery speed to request
      };

      const res = await fetch(build("/api/shipping/rate"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // Handle 503 (Service Unavailable) gracefully - shipping service may be temporarily unavailable
        if (res.status === 503) {
          console.warn("[Shipping] Service temporarily unavailable, using fallback");
        }
        return null;
      }

      const data = await res.json();
      const totalCharge = Number(data?.totalShippingCharges);
      if (!Number.isFinite(totalCharge) || totalCharge < 0) return null;

      return {
        zone: data.zone,
        carrier: data.carrier || "eshopboxStandard",
        estimatedDeliveryDays: data.estimatedDeliveryDays,
        totalShippingCharges: totalCharge,
        breakdown: data.breakdown || {},
      };
    } catch {
      return null;
    }
  }, [selectedAddress, merchandiseSubtotal, paymentMethod, orderWeight, len, wid, ht, doorstepQc]);

  const fetchRate = useCallback(async () => {
    const pin = (selectedAddress?.pincode || "").trim();
    if (!/^\d{6}$/.test(pin)) {
      setQuote(null);
      setExpressQuote(null);
      setPrimeQuote(null);
      setQuoteErr(pin ? "Invalid pincode" : "Add/select a delivery address");
      manualRateRef.current = false;
      return;
    }
    if (merchandiseSubtotal <= 0) {
      setQuote(null);
      setExpressQuote(null);
      setPrimeQuote(null);
      setQuoteErr("Cart is empty");
      manualRateRef.current = false;
      return;
    }
    try {
      setQuoting(true);
      setQuoteErr(null);

      // Fetch rates for all delivery speeds in parallel
      const [standardRate, expressRate, primeRate] = await Promise.all([
        fetchRateForSpeed("standard"),
        fetchRateForSpeed("express"),
        fetchRateForSpeed("prime"),
      ]);

      setQuote(standardRate);
      setExpressQuote(expressRate);
      setPrimeQuote(primeRate);

      if (!standardRate && !expressRate && !primeRate) {
        setQuoteErr("Could not fetch shipping rates. Please try again.");
      }
    } catch (e: any) {
      setQuote(null);
      setExpressQuote(null);
      setPrimeQuote(null);
      setQuoteErr(e?.message || "Could not fetch rates");
    } finally {
      setQuoting(false);
      manualRateRef.current = false;
    }
  }, [selectedAddress, merchandiseSubtotal, paymentMethod, orderWeight, len, wid, ht, doorstepQc, fetchRateForSpeed]);

  useEffect(() => {
    const t = setTimeout(fetchRate, 300);
    return () => clearTimeout(t);
  }, [fetchRate]);

  /* ---------- Pay ---------- */
  const handleReviewOrder = async () => {
    try {
      const ok = await isLoggedIn();
      if (!ok) {
        const ret = encodeURIComponent(currentPathWithQuery());
        toast.info("Please sign in to continue.", { id: "auth" });
        window.location.href = `/login?returnTo=${ret}`;
        return;
      }

      if (!selectedAddress) { toast.warning("Please select a delivery address.", { id: "addr" }); return; }
      if (!selectedAddress.line1 || !selectedAddress.city || !selectedAddress.state || !/^\d{6}$/.test(selectedAddress.pincode || "")) {
        toast.warning("Selected address is incomplete.", { id: "addr" }); return;
      }
      if ((items?.length ?? 0) === 0) { toast.warning("Your cart is empty.", { id: "cart" }); return; }
      if (!RZP_KEY_ID) {
        toast.error("Razorpay key is missing. Set NEXT_PUBLIC_RAZORPAY_KEY_ID and rebuild.", { id: "rzp" });
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        toast.error("Unable to load Razorpay. Try again.", { id: "rzp" });
        return;
      }

      // ======= compute final payable and amountInPaise on client =======
      const baseSubtotal = priced?.subtotal ?? subtotal;          // server-priced products if available
      const shippingNow = getShippingCharge();                    // shipping based on delivery speed
      const coinDiscount = coinsToRedeem || 0;                    // coin redemption discount
      const couponDiscount = appliedCoupon?.discountAmount || 0;  // coupon discount
      const payable = Math.max(0, baseSubtotal + shippingNow - coinDiscount - couponDiscount);
      const amountInPaise = Math.max(100, Math.round(payable * 100)); // INR paise, min ₹1.00

      // Store coin redemption and coupon in notes for later processing
      const notes: Record<string, string> = {
        name: fullName || "",
        phone: phone || "",
        address1: selectedAddress.line1,
        address2: selectedAddress.line2 || "",
        city: selectedAddress.city,
        state: selectedAddress.state,
        postalCode: selectedAddress.pincode || "",
        shipping: String(shippingNow),
        deliverySpeed: deliverySpeed, // Store delivery speed
        couponCode: appliedCoupon?.code || "",
        couponDiscountAmount: String(appliedCoupon?.discountAmount || 0),
        coinsRedeemed: String(coinsToRedeem),
      };

      const receipt = `rcpt_${Date.now()}`;

      const { getAuthHeader } = await import("@/lib/token");
      const authHeaders = getAuthHeader();
      const orderRes = await fetch(build("/api/payments/create-order"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({
          amountInPaise,
          currency: "INR",
          receipt,
          notes,
          items: items.map((it) => ({
            productId: it.id,
            name: it.name,
            price: it.price,
            qty: it.quantity,
          })),
          address: { pincode: selectedAddress.pincode },
        }),
      });

      if (!orderRes.ok) {
        const text = await orderRes.text().catch(() => "");
        toast.error(text || "Could not create payment order.", { id: "order" });
        return;
      }

      const payload = await orderRes.json().catch(() => ({} as any));
      const order = payload?.order;
      if (!order?.id || !order?.amount || !order?.currency) {
        toast.error("Invalid order info from server.", { id: "order" });
        return;
      }

      const rzp = new window.Razorpay({
        key: RZP_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Wild n' Root",
        description: "Order payment",
        order_id: order.id,
        prefill: {
          name: fullName || undefined,
          email: email || undefined,
          contact: phone || undefined,
        },
        notes,
        theme: { color: "#722F37" },
        method: { upi: true, card: true, netbanking: true, wallet: true },

        // ✅ If verification fails, redirect to /payment-failed (no checkout flash)
        handler: async (resp: any) => {
          try {
            const { getAuthHeader } = await import("@/lib/token");
            const authHeaders = getAuthHeader();
            const v = await fetch(build("/api/payments/verify"), {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                ...authHeaders
              },
              body: JSON.stringify(resp),
            });

            if (!v.ok) {
              const body = await v.json().catch(() => ({} as any));
              const failedOrder =
                body?.orderNumber ||
                body?.order?.orderNumber ||
                resp?.razorpay_order_id || "";

              window.location.replace(
                `/payment-failed${failedOrder ? `?orderNumber=${encodeURIComponent(failedOrder)}` : ""}`
              );
              return;
            }

            // ✅ Verified → continue
            // Coin redemption is handled on the backend during payment verification
            const verified = await v.json().catch(() => ({} as any));
            const serverOrderNumber = verified?.orderNumber || verified?.order?.orderNumber || "";

            // Dispatch event to update rewards (coins were redeemed and new ones awarded on backend)
            window.dispatchEvent(new Event("wnr:rewards:changed"));

            // Recompute payable (for display purposes only - backend already processed discounts)
            const baseSubtotal2 = priced?.subtotal ?? subtotal;
            const shippingNow2 = getShippingCharge();
            const coinDiscount2 = coinsToRedeem || 0;
            const couponDiscount2 = appliedCoupon?.discountAmount || 0;
            const payable2 = Math.max(0, baseSubtotal2 + shippingNow2 - coinDiscount2 - couponDiscount2);

            try { await CartAPI.clear(); } catch {}

            sessionStorage.setItem("wnr:thanks", JSON.stringify({
              orderNumber: serverOrderNumber,
              amount: payable2,
              email,
              phone,
            }));

            window.location.replace("/brewing");
          } catch {
            const fallbackOrder = resp?.razorpay_order_id || "";
            window.location.replace(
              `/payment-failed${fallbackOrder ? `?orderNumber=${encodeURIComponent(fallbackOrder)}` : ""}`
            );
          }
        },

        modal: {
          ondismiss: () => {
            toast("Checkout closed.", { id: "closed" });
          },
        },
      });

      // Razorpay failed event → also redirect to failed
      rzp.on("payment.failed", (resp: any) => {
        const failedOrder = resp?.error?.metadata?.order_id || resp?.razorpay_order_id || "";
        window.location.replace(
          `/payment-failed${failedOrder ? `?orderNumber=${encodeURIComponent(failedOrder)}` : ""}`
        );
      });

      rzp.open();
    } catch (e: any) {
      toast.error(e?.message || "Payment failed to start. Please try again.", { id: "fatal" });
    }
  };


  return (
    <>
      {/* Title */}
      <div className="pt-28 md:pt-34 pb-2 text-center">
        <h1 className="text-2xl md:3xl font-bold text-[var(--wnr-berry)]">Checkout</h1>
        <p className="text-sm text-black/60 mt-1">Review your details and complete payment.</p>
      </div>

      {/* Main */}
      <main className="bg-white text-gray-900 min-h-screen px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 py-8 md:py-12">
        {/* Left */}
        <section className="md:col-span-2 space-y-8">
          {/* Contact (read-only) */}
          <div>
            <h2 className="font-bold text-lg mb-2">Contact</h2>
            <input type="email" value={email} readOnly disabled className="w-full border rounded px-3 py-2 mb-2 bg-gray-50 text-gray-600 cursor-not-allowed" />
            <input type="text" value={phone} readOnly disabled className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600 cursor-not-allowed" />
            <p className="text-xs text-gray-500 mt-1">Contact details come from your profile and can’t be edited here.</p>
          </div>

          {/* Address selection */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg mb-3">Choose delivery address</h2>
              <button onClick={() => setAddrModalOpen(true)} className="rounded px-3 py-2 bg-[#722F37] text-white text-sm hover:bg-[#5a2430]">
                + Add new address
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="rounded border p-4 text-sm text-gray-700">You have no saved addresses. Click “Add new address”.</div>
            ) : (
              <ul className="space-y-3">
                {addresses.map((a, i) => {
                  const k = addrKey(a);
                  const selected = k === selectedKey;
                  return (
                    <li key={k || i}>
                      <label className={`flex items-start gap-3 rounded border p-3 cursor-pointer transition ${selected ? "ring-2 ring-[#722F37] border-[#722F37]" : "hover:bg-gray-50"}`}>
                        <input type="radio" name="address" className="mt-1" checked={selected} onChange={() => setSelectedKey(k)} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex text-xs px-2 py-1 rounded-full bg-neutral-100 border">{a.label || "Home"}</span>
                            <span className="text-xs text-neutral-500">#{i + 1}</span>
                          </div>
                          <div className="text-sm">
                            <div>{a.line1}</div>
                            {a.line2 ? <div>{a.line2}</div> : null}
                            <div>{a.city}, {a.state} – {a.pincode}</div>
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            {selectedAddress && (
              <div className="text-xs text-gray-700 mt-2 space-y-1">
                <p>
                  Delivering to: <strong>{selectedAddress.city}</strong>, <strong>{selectedAddress.state}</strong> – <strong>{selectedAddress.pincode}</strong>
                </p>
                {quoteErr ? <p className="text-red-600">{quoteErr}</p> : null}
              </div>
            )}
          </div>

          {/* Delivery Speed Selection */}
          {selectedAddress && !quoteErr && (
            <div>
              <h2 className="font-bold text-lg mb-3">Choose Delivery Speed</h2>
              <div className="space-y-3">
                {/* Standard Delivery */}
                <label
                  className={`flex items-start gap-4 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                    deliverySpeed === "standard"
                      ? "border-[#722F37] bg-[#722F37]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliverySpeed"
                    value="standard"
                    checked={deliverySpeed === "standard"}
                    onChange={() => setDeliverySpeed("standard")}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">Standard Delivery</span>
                      <span className="text-sm font-bold text-[#722F37]">
                        {quote ? money(quote.totalShippingCharges) : "—"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {quoting
                        ? "Calculating…"
                        : quote?.estimatedDeliveryDays != null
                        ? `Estimated ${quote.estimatedDeliveryDays} day${quote.estimatedDeliveryDays === 1 ? "" : "s"}`
                        : "Standard shipping"}
                    </p>
                  </div>
                </label>

                {/* Express Delivery */}
                <label
                  className={`flex items-start gap-4 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                    deliverySpeed === "express"
                      ? "border-[#722F37] bg-[#722F37]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliverySpeed"
                    value="express"
                    checked={deliverySpeed === "express"}
                    onChange={() => setDeliverySpeed("express")}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Express Delivery</span>
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                          Fast
                        </span>
                      </div>
                      <span className="text-sm font-bold text-[#722F37]">
                        {expressQuote ? money(expressQuote.totalShippingCharges) : "—"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {quoting
                        ? "Calculating…"
                        : expressQuote?.estimatedDeliveryDays != null
                        ? `Estimated ${expressQuote.estimatedDeliveryDays} day${expressQuote.estimatedDeliveryDays === 1 ? "" : "s"}`
                        : "Faster delivery"}
                    </p>
                  </div>
                </label>

                {/* Prime Delivery */}
                <label
                  className={`flex items-start gap-4 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                    deliverySpeed === "prime"
                      ? "border-[#722F37] bg-[#722F37]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliverySpeed"
                    value="prime"
                    checked={deliverySpeed === "prime"}
                    onChange={() => setDeliverySpeed("prime")}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Prime Delivery</span>
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                          Fastest
                        </span>
                      </div>
                      <span className="text-sm font-bold text-[#722F37]">
                        {primeQuote ? money(primeQuote.totalShippingCharges) : "—"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {quoting
                        ? "Calculating…"
                        : primeQuote?.estimatedDeliveryDays != null
                        ? `Estimated ${primeQuote.estimatedDeliveryDays} day${primeQuote.estimatedDeliveryDays === 1 ? "" : "s"}`
                        : "Fastest delivery option"}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Pay (Prepaid only) */}
          <button
            onClick={handleReviewOrder}
            disabled={redeemingCoins}
            className="w-full bg-[#722F37] text-white py-3 rounded font-semibold hover:bg-[#5a2430] transition mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {redeemingCoins ? "Processing..." : "Review & Pay (Prepaid)"}
          </button>
        </section>

        {/* Right: Summary (sticky) */}
        <aside
          className="
            bg-gray-50 p-6 rounded space-y-6
            md:sticky md:top-24
            self-start
            md:max-h-[calc(100vh-6rem)]
            md:overflow-auto
          "
        >
          <h2 className="font-bold text-lg">Order summary</h2>

          <div className="space-y-4">
            {(priced?.items?.length ? priced.items : items.map(it => ({
              name: it.name,
              qty: it.quantity,
              unitPrice: it.price,
              lineTotal: it.price * it.quantity,
              lineSubtotal: it.price * it.quantity,
              lineDiscount: 0
            }))).map((it, idx) => (
              <div key={idx} className="flex items-center gap-4">
                {items[idx] ? (
                  <Image src={items[idx].image} alt={items[idx].name} width={64} height={64} className="rounded object-cover" />
                ) : <div className="w-16 h-16 rounded bg-neutral-200" />}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{it.name ?? items[idx]?.name ?? "Product"}</p>
                  <p className="text-xs text-gray-500">Quantity: {it.qty}</p>
                  <p className="text-xs text-gray-500">{money(it.unitPrice)} each</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-[var(--wnr-berry)]">{money(it.lineSubtotal)}</div>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-sm text-gray-600">
                Your cart is empty. <Link href="/products" className="underline">Shop products</Link>
              </div>
            )}
          </div>

          {/* Points Earned Section - Eye-catching */}
          {coinsToEarn > 0 && (
            <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 rounded-xl p-4 shadow-lg border-2 border-amber-500">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl animate-pulse">🪙</span>
                <div className="text-center">
                  <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">You Will Earn</p>
                  <p className="text-3xl font-extrabold text-amber-950 drop-shadow-lg">
                    {coinsToEarn.toLocaleString()}
                  </p>
                  <p className="text-xs font-bold text-amber-800">WNR COINS</p>
                </div>
              </div>
            </div>
          )}

          {/* Coupon Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Have a coupon code?</h3>
            {appliedCoupon ? (
              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-green-800">{appliedCoupon.code}</p>
                    <p className="text-xs text-green-600">{appliedCoupon.name}</p>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-600">Discount</p>
                  <p className="text-lg font-bold text-green-700">-₹{appliedCoupon.discountAmount.toFixed(2)}</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="flex-1 border rounded px-3 py-2 text-sm uppercase"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleApplyCoupon();
                    }
                  }}
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={validatingCoupon || !couponCode.trim()}
                  className="px-4 py-2 bg-[var(--wnr-berry)] text-white rounded text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {validatingCoupon ? "Applying..." : "Apply"}
                </button>
              </div>
            )}
          </div>

          {/* Coin Redemption */}
          {coinBalance > 0 && (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🪙</span>
                  <div>
                    <p className="font-semibold text-sm">Use WNR Coins</p>
                    <p className="text-xs text-gray-600">You have {coinBalance.toLocaleString()} coins</p>
                  </div>
                </div>
              </div>
              {coinsToRedeem > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Redeeming:</span>
                    <span className="font-semibold">{coinsToRedeem.toLocaleString()} coins</span>
                  </div>
                  <button
                    onClick={() => setCoinsToRedeem(0)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max={Math.min(coinBalance, Math.floor(merchandiseSubtotal + shippingCharge))}
                    placeholder="Enter coins"
                    value={coinsToRedeem || ""}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(coinBalance, Math.floor(Number(e.target.value) || 0)));
                      setCoinsToRedeem(val);
                    }}
                    className="flex-1 border rounded px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => {
                      const maxRedeemable = Math.min(coinBalance, Math.floor(merchandiseSubtotal + shippingCharge));
                      setCoinsToRedeem(maxRedeemable);
                    }}
                    className="px-3 py-2 bg-[var(--wnr-berry)] text-white rounded text-sm hover:opacity-90 whitespace-nowrap"
                  >
                    Use Max
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="font-medium text-gray-700">Subtotal</span>
              <span className="font-bold text-lg text-gray-900">{money(priced?.subtotal ?? merchandiseSubtotal)}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <div className="flex flex-col">
                <span className="font-medium text-gray-700">Shipping</span>
                {deliverySpeed && (
                  <span className="text-xs text-gray-500">
                    {deliverySpeed === "prime" ? "⚡ Prime" : deliverySpeed === "express" ? "🚀 Express" : "📦 Standard"}
                  </span>
                )}
              </div>
              <span className="font-bold text-lg text-gray-900">
                {quoting
                  ? "Calculating…"
                  : shippingCharge > 0
                  ? money(shippingCharge)
                  : quote || expressQuote || primeQuote
                  ? money(shippingCharge)
                  : "—"}
              </span>
            </div>

            {coinsToRedeem > 0 && (
              <div className="flex justify-between bg-green-50 rounded-lg p-3 border-2 border-green-300">
                <div className="flex flex-col">
                  <span className="text-green-700 font-bold text-base">Coin Discount</span>
                  <span className="text-xs text-green-600">You saved!</span>
                </div>
                <div className="text-right">
                  <span className="text-green-700 font-extrabold text-2xl">-{money(coinsToRedeem)}</span>
                </div>
              </div>
            )}

            {appliedCoupon && (
              <div className="flex justify-between bg-purple-50 rounded-lg p-3 border-2 border-purple-300">
                <div className="flex flex-col">
                  <span className="text-purple-700 font-bold text-base">Coupon Discount</span>
                  <span className="text-xs text-purple-600">{appliedCoupon.code}</span>
                </div>
                <div className="text-right">
                  <span className="text-purple-700 font-extrabold text-2xl">-{money(appliedCoupon.discountAmount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Savings Summary - Prominent when coins or coupon are used */}
          {(coinsToRedeem > 0 || appliedCoupon) && (
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl p-5 shadow-xl border-2 border-green-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl animate-bounce">💰</span>
                  <div>
                    <p className="text-sm font-bold text-green-900 uppercase tracking-wide">Total Savings</p>
                    <p className="text-4xl font-extrabold text-green-950 drop-shadow-lg">
                      {money(coinsToRedeem + (appliedCoupon?.discountAmount || 0))}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {coinsToRedeem > 0 && (
                    <p className="text-xs font-semibold text-green-900">
                      {coinsToRedeem.toLocaleString()} coins
                    </p>
                  )}
                  {appliedCoupon && (
                    <p className="text-xs font-semibold text-green-900">
                      {appliedCoupon.code}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between font-extrabold text-2xl pt-4 border-t-2 border-gray-400">
            <span className="text-gray-800">Total</span>
            <span className="text-[var(--wnr-berry)] text-3xl">
              {money(grandTotal)}
            </span>
          </div>
        </aside>
      </main>

      {/* Add Address Modal */}
      <AddAddressModal
        open={addrModalOpen}
        mode="add"
        onClose={() => setAddrModalOpen(false)}
        onSaved={async (newAddr) => {
          setAddrModalOpen(false);
          await loadUserAndAddresses(addrKey(newAddr as ServerAddress));
        }}
      />
    </>
  );
}
