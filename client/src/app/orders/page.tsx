// src/app/orders/OrdersPageClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { buildUrl as build } from "@/lib/api";
import { getClientCache, setClientCache, invalidateClientCache } from "@/lib/clientCache";
import { getAuthHeader } from "@/lib/token"; // ✅ Add auth header helper
import { renderInvoicePDF } from "@/lib/invoice";
import { Download } from "lucide-react";

type OrderItemPreview = {
  name: string;
  price: number;
  qty: number;
  imageUrl?: string;
};

type TrackingLite = {
  status:
    | "placed"
    | "confirmed"
    | "packed"
    | "shipped"
    | "dispatched"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  updatedAt?: string;
  timeline?: { label: string; at?: string }[];
};

type OrderSummary = {
  _id: string;
  orderNumber?: string;
  subtotal: number;
  shipping: number;
  total: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  placedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  items?: OrderItemPreview[];
  payment?: { method?: string; status?: string };
  tracking?: TrackingLite;
  shipment?: {
    trackingId?: string | null;
    courierName?: string | null;
    status?: string | null;
    latest_status?: string | null;
    statusCategory?: "pending" | "in-transit" | "delivered" | "issue" | null;
  } | null;
};

const ORDERS_TTL_MS = 60_000; // ✅ cache 60s (tweak if you want longer)

export default function OrdersPageClient() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

  // ----- FETCH w/ CLIENT CACHE -----
  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/login?returnTo=${returnTo}`);
      return;
    }

    const cacheKey = `orders:list:${user._id || "me"}`;
    const cached = getClientCache<OrderSummary[]>(cacheKey);
    if (cached) {
      // ✅ instant paint from cache, no fetch
      setOrders(cached);
      setLoading(false);
      setErr(null);
      return;
    }

    let aborted = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const authHeaders = getAuthHeader(); // ✅ Get Bearer token
        const res = await fetch(build("/api/orders"), {
          method: "GET",
          headers: { 
            "Content-Type": "application/json",
            ...authHeaders // ✅ Include Authorization: Bearer header
          },
          cache: "no-store",
        });

        if (res.status === 401) {
          const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
          router.push(`/login?returnTo=${returnTo}`);
          return;
        }
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || res.statusText || "Failed to load orders");
        }

        const data = (await res.json()) as OrderSummary[];
        if (!aborted) {
          setOrders(data || []);
          // ✅ store in cache
          setClientCache(cacheKey, data || [], ORDERS_TTL_MS);
        }
      } catch (e: any) {
        if (!aborted) setErr(String(e?.message || e));
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [user, userLoading, router]);

  const fmtINR = useMemo(
    () => (n = 0) =>
      new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n),
    []
  );
  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";
  const niceOrderNo = (o: OrderSummary) => o.orderNumber ?? `WNR_${o._id.slice(-6).toUpperCase()}`;

  const deriveTracking = (o: OrderSummary): TrackingLite => {
    if (o.tracking) return o.tracking;
    if (o.status === "paid") return { status: "confirmed", updatedAt: o.updatedAt ?? o.createdAt ?? undefined };
    if (o.status === "pending") return { status: "placed", updatedAt: o.updatedAt ?? o.createdAt ?? undefined };
    if (o.status === "failed") return { status: "cancelled", updatedAt: o.updatedAt ?? o.createdAt ?? undefined };
    return { status: "placed", updatedAt: o.updatedAt ?? o.createdAt ?? undefined };
  };

  const statusOrder: TrackingLite["status"][] = [
    "placed",
    "confirmed",
    "packed",
    "shipped",
    "dispatched",
    "out_for_delivery",
    "delivered",
  ];
  const progressPct = (s: TrackingLite["status"]) => {
    const idx = statusOrder.indexOf(s);
    if (idx < 0) return 10;
    const pct = Math.round(((idx + 1) / statusOrder.length) * 100);
    return Math.min(100, Math.max(10, pct));
  };

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      setDownloadingInvoice(orderId);
      const authHeaders = getAuthHeader();
      const res = await fetch(build(`/api/orders/${encodeURIComponent(orderId)}`), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
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
      setDownloadingInvoice(null);
    }
  };

  return (
    <main className="wnr-container py-10 mt-32">
      <div className="flex justify-center">
        <h1 className="text-2xl font-semibold mb-4">Your orders</h1>
      </div>

      {userLoading && <div className="text-sm text-neutral-600">Checking session…</div>}
      {!userLoading && loading && <div className="text-sm text-neutral-600">Loading orders…</div>}
      {err && <div className="text-sm text-red-600">Failed to load orders: {err}</div>}

      {!userLoading && !loading && !err && orders && orders.length === 0 && (
        <div className="text-sm text-neutral-600">You have no orders yet.</div>
      )}

      {!userLoading && !loading && !err && orders && orders.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-[720px] w-full bg-white">
            <thead>
              <tr className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-600">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Placed</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const first = o.items?.[0];
                const itemsCount = o.items?.reduce((sum, it) => sum + (it.qty || 0), 0) ?? 0;
                const t = deriveTracking(o);

                return (
                  <tr key={o._id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-md overflow-hidden border shrink-0">
                          {first?.imageUrl ? (
                            <Image src={first.imageUrl} alt={first.name} fill className="object-cover" sizes="48px" />
                          ) : (
                            <div className="w-full h-full grid place-items-center text-[10px] text-neutral-500 bg-neutral-50">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/orders/${encodeURIComponent(o._id)}`}
                            className="font-medium hover:underline block truncate"
                          >
                            {niceOrderNo(o)}
                          </Link>
                          <div className="text-xs text-neutral-500 truncate">
                            {first?.name || (itemsCount ? `${itemsCount} items` : "—")}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm text-neutral-700">{fmtDate(o.placedAt ?? o.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">{itemsCount || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-neutral-100 capitalize">
                          {t.status.replaceAll("_", " ")}
                        </span>
                        {o.shipment?.trackingId && (
                          <span className="text-xs text-neutral-500 font-mono">
                            {o.shipment.trackingId}
                          </span>
                        )}
                        {o.shipment?.courierName && (
                          <span className="text-xs text-neutral-500">
                            {o.shipment.courierName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{fmtINR(o.total)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/orders/${encodeURIComponent(o._id)}`}
                          className="rounded px-3 py-1 text-sm bg-neutral-100 hover:bg-neutral-200"
                        >
                          View
                        </Link>

                        <button
                          onClick={() => handleDownloadInvoice(o._id)}
                          disabled={downloadingInvoice === o._id}
                          className="rounded px-3 py-1 text-sm bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          title="Download Invoice"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {downloadingInvoice === o._id ? "..." : "Invoice"}
                        </button>

                        {o.shipment?.trackingId && (
                          <Link
                            href={`/orders/${encodeURIComponent(o._id)}/track`}
                            className="rounded px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            Track
                          </Link>
                        )}

                        {o.payment?.status !== "paid" && o.status !== "paid" && (
                          <Link
                            href={`/orders/${encodeURIComponent(o._id)}/pay`}
                            onClick={() => {
                              // ✅ ensure fresh when returning from payment
                              invalidateClientCache("orders:");
                            }}
                            className="rounded px-3 py-1 text-sm bg-[var(--wnr-berry)] text-white hover:opacity-90"
                          >
                            Pay now
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}


