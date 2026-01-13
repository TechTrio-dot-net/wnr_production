"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { buildUrl as build } from "@/lib/api";
import { getAuthHeader } from "@/lib/token";
import OrderTracking from "@/components/order/OrderTracking";

type OrderResp = {
  _id: string;
  orderNumber?: string;
  shipment?: {
    trackingId?: string | null;
    courierName?: string | null;
    labelUrl?: string | null;
    status?: string | null;
    latest_status?: string | null;
    status_updated_at?: string | null;
    statusCategory?: "pending" | "in-transit" | "delivered" | "issue" | null;
    statusDescription?: string | null;
  } | null;
  placedAt?: string | Date | null;
  createdAt?: string | Date;
};

export default function OrderTrackPage() {
  const params = useParams<{ id: string }>();
  const orderId = decodeURIComponent(params?.id || "");
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [order, setOrder] = useState<OrderResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    if (userLoading) return;

    if (!user) {
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/login?returnTo=${returnTo}`);
      return;
    }

    let aborted = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const authHeaders = getAuthHeader();
        const res = await fetch(build(`/api/orders/${encodeURIComponent(orderId)}`), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
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
          throw new Error(txt || res.statusText || "Failed to load order");
        }

        const data = (await res.json()) as OrderResp;
        if (!aborted) setOrder(data ?? null);
      } catch (e: any) {
        if (!aborted) setErr(String(e?.message || e));
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [orderId, user, userLoading, router]);

  // Function to refresh order data
  const refreshOrder = async () => {
    if (!orderId || !user) return;
    setRefreshing(true);
    try {
      const authHeaders = getAuthHeader();
      const res = await fetch(build(`/api/orders/${encodeURIComponent(orderId)}`), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as OrderResp;
        setOrder(data ?? null);
      }
    } catch (e: any) {
      console.error("Failed to refresh order:", e);
    } finally {
      setRefreshing(false);
    }
  };

  const niceOrderNo = (o?: OrderResp | null) =>
    o?.orderNumber ?? (o?._id ? `WNR_${o._id.slice(-6).toUpperCase()}` : "—");

  if (userLoading || loading) {
    return (
      <main className="wnr-container py-10 mt-32">
        <div className="text-sm text-neutral-600">Loading tracking information…</div>
      </main>
    );
  }

  if (err) {
    return (
      <main className="wnr-container py-10 mt-32">
        <div className="text-sm text-red-600">Error: {err}</div>
        <Link href={`/orders/${encodeURIComponent(orderId)}`} className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to order
        </Link>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="wnr-container py-10 mt-32">
        <div className="text-sm text-neutral-600">Order not found</div>
        <Link href="/orders" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to orders
        </Link>
      </main>
    );
  }

  return (
    <main className="wnr-container py-10 mt-32">
      <div className="mb-6">
        <Link
          href={`/orders/${encodeURIComponent(orderId)}`}
          className="inline-block rounded-lg bg-neutral-100 px-3 py-1.5 text-sm hover:bg-neutral-200 mb-4"
        >
          ← Back to Order {niceOrderNo(order)}
        </Link>
        <h1 className="text-2xl font-semibold">Track Order {niceOrderNo(order)}</h1>
      </div>

      {order.shipment?.trackingId ? (
        <>
          {/* Show shipment status badge if available */}
          {order.shipment.statusCategory && (
            <div className="mb-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                order.shipment.statusCategory === "delivered"
                  ? "bg-green-100 text-green-700"
                  : order.shipment.statusCategory === "in-transit"
                  ? "bg-blue-100 text-blue-700"
                  : order.shipment.statusCategory === "issue"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}>
                {order.shipment.statusDescription || order.shipment.latest_status || "Tracking"}
              </div>
              {order.shipment.status_updated_at && (
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {new Date(order.shipment.status_updated_at).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          )}
          <OrderTracking
            trackingId={order.shipment.trackingId}
            shipmentDate={
              order.placedAt ? String(order.placedAt) : order.createdAt ? String(order.createdAt) : undefined
            }
            shipmentData={order.shipment}
            onRefresh={refreshOrder}
          />
        </>
      ) : (
        <div className="rounded-lg bg-gray-50 p-6 text-center">
          <p className="text-gray-600 mb-4">
            Tracking information is not available yet for this order.
          </p>
          <p className="text-sm text-gray-500">
            Tracking will be available once your order is shipped. We'll update you soon!
          </p>
          <Link
            href={`/orders/${encodeURIComponent(orderId)}`}
            className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          >
            View order details
          </Link>
        </div>
      )}
    </main>
  );
}

