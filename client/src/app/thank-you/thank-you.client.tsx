// src/app/thank-you/thank-you.client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import CelebrationConfetti from "@/components/common/CelebrationConfetti";
import { getAuthHeader } from "@/lib/token";
import { buildUrl } from "@/lib/api";
import { trackPurchase, type GAItem } from "@/lib/ga";
import { trackPurchase as trackMetaPurchase } from "@/lib/metaPixel";
import { renderInvoicePDF } from "@/lib/invoice";
import { Download } from "lucide-react";

type OrderItem = { id: string; name: string; qty: number; price: number; image?: string; };
type OrderResponse = {
  _id: string;
  orderNumber: string;
  amount: number;
  total: number;
  items: OrderItem[];
  email?: string;
  phone?: string;
  etaDays?: number;
  updatedAt?: string;
  shipment?: {
    trackingId?: string | null;
    courierName?: string | null;
    status?: string | null;
  } | null;
};

const money = (n: number | string) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const normalizeImage = (src?: string) => {
  if (!src) return "/product-placeholder.png";
  try { return new URL(src).toString(); } catch { return src.startsWith("/") ? src : `/${src}`; }
};

async function fetchOrderByNumber(orderNumber: string): Promise<OrderResponse | null> {
  const authHeaders = getAuthHeader();
  
  try {
    // First, try to get all orders and find by orderNumber
    const r1 = await fetch(buildUrl("/api/orders"), {
      headers: authHeaders,
      cache: "no-store",
    });
    if (r1.ok) {
      const orders = (await r1.json()) as OrderResponse[];
      const found = orders.find((o) => o.orderNumber === orderNumber);
      if (found) {
        // Fetch full order details by _id
        const r2 = await fetch(buildUrl(`/api/orders/${encodeURIComponent(found._id)}`), {
          headers: authHeaders,
          cache: "no-store",
        });
        if (r2.ok) {
          const fullOrder = (await r2.json()) as OrderResponse;
          return {
            ...fullOrder,
            amount: fullOrder.total || fullOrder.amount || 0,
          };
        }
      }
    }
  } catch {}
  
  // Fallback: try direct lookup if orderNumber is a valid ObjectId
  try {
    if (/^[0-9a-fA-F]{24}$/.test(orderNumber)) {
      const r2 = await fetch(buildUrl(`/api/orders/${encodeURIComponent(orderNumber)}`), {
        headers: authHeaders,
        cache: "no-store",
      });
      if (r2.ok) {
        const fullOrder = (await r2.json()) as OrderResponse;
        return {
          ...fullOrder,
          amount: fullOrder.total || fullOrder.amount || 0,
        };
      }
    }
  } catch {}
  
  return null;
}

export default function ThankYouClient({
  initialOrderNumber,
  initialStatus = "success",
  initialAmount = 0,
  initialEmail = "",
  initialPhone = "",
}: {
  initialOrderNumber: string;
  initialStatus?: string;
  initialAmount?: number;
  initialEmail?: string;
  initialPhone?: string;
}) {
  const router = useRouter();

  const orderNumber = initialOrderNumber ?? "";
  const status = (initialStatus ?? "success").toLowerCase();
  const fallbackAmount = Number(initialAmount ?? 0) || 0;
  const fallbackEmail = initialEmail || "";
  const fallbackPhone = initialPhone || "";

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  // If failed → redirect to failed page
  useEffect(() => {
    if ((status === "failed" || status === "error") && !orderNumber) {
      router.replace("/payment-failed");
    }
  }, [status, orderNumber, router]);

  // Fetch order details (optional; page still renders with fallback)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!orderNumber) { setLoading(false); setError("Missing order number."); return; }
      try {
        setLoading(true);
        const data = await fetchOrderByNumber(orderNumber);
        if (!mounted) return;
        if (data) {
          setOrder({
            ...data,
            items: (data.items || []).map((it) => ({ ...it, image: normalizeImage(it.image) })),
          });
          setError(null);
        } else {
          setOrder(null);
          setError(null);
        }
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Unable to load your order.");
        setOrder(null);
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [orderNumber]);

  // Fire GA4 and Meta Pixel purchase once when we have order details
  useEffect(() => {
    if (!orderNumber) return;
    const amount = Number(order?.amount ?? fallbackAmount) || 0;
    const items: GAItem[] = (order?.items || []).map((it) => ({
      item_id: String(it.id),
      item_name: it.name,
      price: Number(it.price) || 0,
      quantity: Number(it.qty) || 1,
    }));
    // GA4: Purchase
    trackPurchase(String(order?.orderNumber || orderNumber), amount, items);
    // Meta Pixel: Purchase with complete catalog data
    const metaItems = (order?.items || []).map((it) => ({
      id: String(it.id),
      name: it.name,
      price: Number(it.price) || 0,
      quantity: Number(it.qty) || 1,
      brand: "Wild n' Root", // Brand name for catalog
      // Note: SKU and category would need to be included in order data if available
    }));
    trackMetaPurchase(String(order?.orderNumber || orderNumber), amount, metaItems);
  }, [order?.orderNumber, order?.amount, order?.items, orderNumber, fallbackAmount]);

  const eta = useMemo(() => {
    const d = new Date();
    const plus = order?.etaDays && Number.isFinite(order.etaDays) ? order.etaDays! : 4;
    d.setDate(d.getDate() + plus);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }, [order?.etaDays]);

  const totalPaid = order?.amount ?? fallbackAmount;
  const items = (order?.items ?? []).map((it) => ({ ...it, image: normalizeImage(it.image) }));

  const handleDownloadInvoice = async () => {
    if (!order?._id) {
      alert("Order details not available yet. Please try again in a moment.");
      return;
    }
    try {
      setDownloadingInvoice(true);
      const authHeaders = getAuthHeader();
      const res = await fetch(buildUrl(`/api/orders/${encodeURIComponent(order._id)}`), {
        headers: authHeaders,
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to load order details");
      }
      const orderDetail = await res.json();
      await renderInvoicePDF(orderDetail);
    } catch (error) {
      console.error("Failed to download invoice:", error);
      alert("Failed to download invoice. Please try again.");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  return (
    <main className="min-h-[80vh] bg-[var(--wnr-sand,#faf7f2)] py-10 md:py-14 relative overflow-hidden mt-18">
      <div className="wnr-container">
        <CelebrationConfetti speed={0.8} count={120} duration={3000} />
        <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow-soft ring-1 ring-black/5 p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
                  <path d="M20 7L9 18l-5-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900">Thank you! Your order is confirmed.</h1>
              <p className="mt-1 text-neutral-600">
                {order?.email || fallbackEmail || order?.phone || fallbackPhone ? (
                  <>
                    We’ve sent a confirmation to{" "}
                    {order?.email || fallbackEmail ? <strong>{order?.email || fallbackEmail}</strong> : "your email"}
                    {order?.phone || fallbackPhone ? <> and <strong>+91 {(order?.phone || fallbackPhone)}</strong></> : null}.
                    You’ll receive delivery updates soon.
                  </>
                ) : "You’ll receive delivery updates soon."}
              </p>

              {/* Meta grid */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-neutral-50 ring-1 ring-black/5 p-3">
                  <div className="text-neutral-500">Order Number</div>
                  <div className="font-medium">{order?.orderNumber || orderNumber || "—"}</div>
                </div>
                <div className="rounded-lg bg-neutral-50 ring-1 ring-black/5 p-3">
                  <div className="text-neutral-500">Total Paid</div>
                  <div className="font-medium">{money(totalPaid || 0)}</div>
                </div>
                <div className="rounded-lg bg-neutral-50 ring-1 ring-black/5 p-3">
                  <div className="text-neutral-500">Estimated Delivery</div>
                  <div className="font-medium">By {eta}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Order items */}
          <div className="mt-6 border-t pt-6">
            <h2 className="text-base font-semibold">Order Summary</h2>
            {loading ? (
              <p className="mt-3 text-sm text-neutral-600">Loading your order…</p>
            ) : error ? (
              <p className="mt-3 text-sm text-red-700">{error}</p>
            ) : (
              <>
                {items.length > 0 ? (
                  <>
                    <ul className="mt-3 space-y-3">
                      {items.map((it) => (
                        <li key={`${it.id}-${it.name}`} className="flex items-center gap-3">
                          <div className="relative h-14 w-14 rounded-lg overflow-hidden ring-1 ring-black/5 bg-white">
                            <Image src={it.image || "/product-placeholder.png"} alt={it.name} fill sizes="56px" className="object-cover" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium leading-tight">{it.name}</div>
                            <div className="text-sm text-neutral-600">Qty: {it.qty}</div>
                          </div>
                          <div className="text-sm font-medium">{money((Number(it.price) || 0) * (Number(it.qty) || 0))}</div>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex justify-end gap-6 text-sm">
                      <div className="text-neutral-600">Total Paid</div>
                      <div className="font-semibold">{money(totalPaid || 0)}</div>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-neutral-600">Your order details will appear here shortly.</p>
                )}
              </>
            )}
          </div>

          {/* CTAs */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link href="/" className="inline-flex items-center justify-center rounded-xl px-4 py-3 bg-[var(--wnr-berry,#6b2b39)] text-white hover:opacity-95">Go to Homepage</Link>
            <Link href="/products" className="inline-flex items-center justify-center rounded-xl px-4 py-3 ring-1 ring-black/10 bg-white hover:bg-black/5">Browse Products</Link>
            {order?._id ? (
              <>
                <Link href={`/orders/${encodeURIComponent(order._id)}`} className="inline-flex items-center justify-center rounded-xl px-4 py-3 ring-1 ring-black/10 bg-white hover:bg-black/5">View Order</Link>
                <button
                  onClick={handleDownloadInvoice}
                  disabled={downloadingInvoice}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 ring-1 ring-black/10 bg-white hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  {downloadingInvoice ? "Downloading..." : "Download Invoice"}
                </button>
                {order.shipment?.trackingId ? (
                  <Link href={`/orders/${encodeURIComponent(order._id)}/track`} className="inline-flex items-center justify-center rounded-xl px-4 py-3 ring-1 ring-black/10 bg-white hover:bg-black/5">Track Shipment</Link>
                ) : null}
              </>
            ) : null}
            <Link
              href={`https://wa.me/91${(order?.phone || fallbackPhone || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Hi Wild n' Root, I need help with my order ${order?.orderNumber || orderNumber}.`)}`}
              className="inline-flex items-center justify-center rounded-xl px-4 py-3 ring-1 ring-black/10 bg-white hover:bg-black/5"
              target="_blank"
            >
              Chat on WhatsApp
            </Link>
            <Link href="/faq#orders" className="inline-flex items-center justify-center rounded-xl px-4 py-3 ring-1 ring-black/10 bg-white hover:bg-black/5">Order FAQs</Link>
          </div>

          <div className="mt-8 rounded-xl bg-neutral-50 ring-1 ring-black/5 p-4 text-sm text-neutral-700">
            Tip: Save your <span className="font-medium">Order Number</span> for support and tracking updates.
          </div>
        </div>
      </div>
    </main>
  );
}
