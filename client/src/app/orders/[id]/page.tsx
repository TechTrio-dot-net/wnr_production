"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { buildUrl as build } from "@/lib/api";
import { getAuthHeader } from "@/lib/token";
import OrderTracking from "@/components/order/OrderTracking";
import TransitStepsModal from "@/components/order/TransitStepsModal";
import { renderInvoicePDF } from "@/lib/invoice";
import { Download, Eye } from "lucide-react";

type OrderItem = {
  product?: string;
  name: string;
  price: number;
  qty: number;
  imageUrl?: string;
};

type OrderResp = {
  _id: string;
  orderNumber?: string;
  user: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  addressSnapshot?: {
    name?: string | null;
    phone?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  payment?: {
    method?: string;
    status?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  };
  shipment?: {
    trackingId?: string | null;
    courierName?: string | null;
    labelUrl?: string | null;
    status?: string | null;
    latest_status?: string | null;
    status_updated_at?: string | null;
    statusDescription?: string | null;
    statusCategory?: "pending" | "in-transit" | "delivered" | "issue" | null;
  } | null;
  placedAt?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export default function OrderDetailPageClient() {
  const params = useParams<{ id: string }>();
  const orderId = decodeURIComponent(params?.id || "");
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [order, setOrder] = useState<OrderResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [transitModalOpen, setTransitModalOpen] = useState(false);

  const fmtINR = useMemo(
    () => (n = 0) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(n),
    []
  );
  const fmtDate = (d?: string | Date | null) =>
    d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const niceOrderNo = (o?: OrderResp | null) =>
    o?.orderNumber ?? (o?._id ? `WNR_${o._id.slice(-6).toUpperCase()}` : "—");

  useEffect(() => {
    if (!orderId) return;
    if (userLoading) return;

    if (!user) {
      setUnauthorized(true);
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/login?returnTo=${returnTo}`);
      return;
    }

    let aborted = false;
    (async () => {
      setLoading(true);
      setErr(null);
      setNotFound(false);
      setUnauthorized(false);
      try {
        const authHeaders = getAuthHeader();
        const res = await fetch(build(`/api/orders/${encodeURIComponent(orderId)}`), {
          method: "GET",
          headers: { 
            "Content-Type": "application/json",
            ...authHeaders
          },
          cache: "no-store",
        });

        if (res.status === 401) {
          if (!aborted) {
            setUnauthorized(true);
            const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
            router.push(`/login?returnTo=${returnTo}`);
          }
          return;
        }

        if (res.status === 404) {
          if (!aborted) setNotFound(true);
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

  const handleTrack = () => {
    router.push(`/orders/${encodeURIComponent(orderId)}/track`);
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    try {
      setDownloadingInvoice(true);
      await renderInvoicePDF(order);
    } catch (error) {
      console.error("Failed to download invoice:", error);
      alert("Failed to download invoice. Please try again.");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const EmptyCard = ({
    title = "No order found",
    subtitle = "You don’t have an order to show here.",
    primaryHref = "/products",
    primaryText = "Shop now",
    secondaryHref = "/orders",
    secondaryText = "Back to orders",
  }: {
    title?: string;
    subtitle?: string;
    primaryHref?: string;
    primaryText?: string;
    secondaryHref?: string;
    secondaryText?: string;
  }) => (
    <section className="w-full">
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-full max-w-md rounded-xl bg-white shadow-sm border border-neutral-200 p-6 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[var(--wnr-berry)]/10 grid place-items-center">
            <svg width="22" height="22" viewBox="0 0 24 24" className="text-[var(--wnr-berry)]">
              <path
                fill="currentColor"
                d="M7 18c-1.1 0-2-.9-2-2V6H3V4h4v2h10V4h2v2h-2v10c0 1.1-.9 2-2 2H7Zm0-2h10V8H7v8Zm2-1h2v-2H9v2Zm4 0h2v-2h-2v2ZM9 12h2v-2H9v2Z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--wnr-berry)]">{title}</h2>
          <p className="mt-1 text-sm text-neutral-700">{subtitle}</p>

          <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center rounded-lg bg-[var(--wnr-berry)] px-4 py-2 text-white text-sm font-medium hover:opacity-90"
            >
              {primaryText}
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50"
            >
              {secondaryText}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <main
      className="
        container mx-auto px-4 sm:px-6 mt-[calc(5rem+var(--offer-strip-height,0px))]
        pt-24 md:pt-28
        pb-28 md:pb-32
         min-h-[100svh] overflow-x-hidden
      "
    >
      <div className="mx-auto w-full max-w-5xl bg-white rounded-xl shadow-sm border border-neutral-200 p-4 sm:p-6 md:p-8">
        <div className="mb-5">
          <Link
            href="/orders"
            className="inline-block rounded-lg bg-neutral-100 px-3 py-1.5 text-sm hover:bg-neutral-200"
          >
            ← Back to orders
          </Link>
        </div>

        {userLoading && <div className="text-sm text-neutral-600">Checking session…</div>}
        {!userLoading && loading && <div className="text-sm text-neutral-600">Loading order…</div>}

        {err && !loading && !userLoading && (
          <EmptyCard
            title="Something went wrong"
            subtitle={err}
            primaryHref="/products"
            primaryText="Shop now"
            secondaryHref="/orders"
            secondaryText="Back to orders"
          />
        )}

        {unauthorized && !userLoading && !loading && (
          <EmptyCard
            title="Sign in required"
            subtitle="Please sign in to view this order."
            primaryHref="/login"
            primaryText="Sign in"
            secondaryHref="/products"
            secondaryText="Shop"
          />
        )}

        {(notFound || (!order && !loading && !err)) && !userLoading && (
          <EmptyCard
            title="No order found"
            subtitle="Looks like there’s nothing here yet."
            primaryHref="/products"
            primaryText="Shop now"
            secondaryHref="/orders"
            secondaryText="Back to orders"
          />
        )}

        {!userLoading && !loading && !err && !notFound && order && (
          <>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">Order {niceOrderNo(order)}</h1>
                <p className="text-sm text-neutral-600 mt-1">
                  Placed: {fmtDate(order.placedAt ?? order.createdAt)}
                </p>
                <p className="text-sm text-neutral-600">
                  Status: <strong className="capitalize">{order.status}</strong>
                </p>
              </div>

              <div className="text-left md:text-right">
                <p className="text-xs text-neutral-600 uppercase tracking-wide">Total</p>
                <div className="text-2xl font-bold">{fmtINR(order.total)}</div>

                <div className="mt-3 flex gap-2 md:justify-end flex-wrap">
                  <button
                    onClick={handleDownloadInvoice}
                    disabled={downloadingInvoice}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download Invoice"
                  >
                    <Download className="w-4 h-4" />
                    {downloadingInvoice ? "Downloading..." : "Invoice"}
                  </button>

                  {order.shipment?.trackingId ? (
                    <Link
                      href={`/orders/${encodeURIComponent(order._id)}/track`}
                      className="inline-block rounded-lg px-3 py-1.5 text-sm bg-neutral-100 hover:bg-neutral-200"
                      title="View detailed tracking"
                    >
                      View Tracking
                    </Link>
                  ) : order.status === "paid" ? (
                    <span className="text-xs text-neutral-500">Tracking will be available soon</span>
                  ) : null}

                  {order.payment?.status !== "paid" && order.status !== "paid" && (
                    <Link
                      href={`/orders/${encodeURIComponent(order._id)}/pay`}
                      className="inline-block rounded-lg bg-[var(--wnr-berry)] px-3 py-1.5 text-sm text-white hover:opacity-90"
                    >
                      Pay now
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <hr className="my-5" />

            {/* Tracking Section */}
            {order.shipment?.trackingId && (
              <section className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold">Tracking</h2>
                  <button
                    onClick={() => setTransitModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm bg-neutral-100 hover:bg-neutral-200 transition-colors"
                    title="View transit steps"
                  >
                    <Eye className="w-4 h-4" />
                    View Steps
                  </button>
                </div>
                {/* Show shipment status badge - compute on-the-fly */}
                {(() => {
                  const currentStatus = order.shipment.latest_status || order.shipment.status;
                  if (!currentStatus) return null;
                  
                  // Compute statusCategory on-the-fly
                  const normalizedStatus = String(currentStatus).toUpperCase().trim();
                  let statusCategory: "pending" | "in-transit" | "delivered" | "issue" = "pending";
                  
                  if (normalizedStatus.includes("DELIVERED") && !normalizedStatus.includes("DELIVERY")) {
                    statusCategory = "delivered";
                  } else if (
                    normalizedStatus.includes("FAILED") ||
                    normalizedStatus.includes("CANCELLED") ||
                    normalizedStatus.includes("LOST") ||
                    normalizedStatus.includes("DAMAGED") ||
                    normalizedStatus.includes("HELD")
                  ) {
                    statusCategory = "issue";
                  } else if (
                    normalizedStatus.includes("TRANSIT") ||
                    normalizedStatus.includes("PICKED") ||
                    normalizedStatus.includes("OUT_FOR_DELIVERY")
                  ) {
                    statusCategory = "in-transit";
                  }
                  
                  // Get description
                  const statusDescription = order.shipment.statusDescription || 
                    normalizedStatus.replace(/_/g, ' ').toLowerCase()
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');
                  
                  return (
                    <div className="mb-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                        statusCategory === "delivered"
                          ? "bg-green-100 text-green-700"
                          : statusCategory === "in-transit"
                          ? "bg-blue-100 text-blue-700"
                          : statusCategory === "issue"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {statusDescription}
                      </div>
                      {order.shipment.status_updated_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Last updated: {new Date(order.shipment.status_updated_at).toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>
                  );
                })()}
                <OrderTracking
                  trackingId={order.shipment.trackingId}
                  shipmentDate={order.placedAt ? String(order.placedAt) : order.createdAt ? String(order.createdAt) : undefined}
                  shipmentData={order.shipment}
                  onRefresh={async () => {
                    // Refresh order data from backend
                    try {
                      const authHeaders = getAuthHeader();
                      const res = await fetch(build(`/api/orders/${encodeURIComponent(orderId)}`), {
                        method: "GET",
                        headers: { 
                          "Content-Type": "application/json",
                          ...authHeaders
                        },
                        cache: "no-store",
                      });
                      if (res.ok) {
                        const data = (await res.json()) as OrderResp;
                        setOrder(data ?? null);
                      }
                    } catch (e) {
                      console.error("Failed to refresh order:", e);
                    }
                  }}
                />
              </section>
            )}

            {/* Transit Steps Modal */}
            {order.shipment?.trackingId && (
              <TransitStepsModal
                isOpen={transitModalOpen}
                onClose={() => setTransitModalOpen(false)}
                trackingId={order.shipment.trackingId}
                currentStatus={order.shipment.latest_status || order.shipment.status || undefined}
              />
            )}

            <section className="mb-6">
              <h2 className="font-semibold mb-3">Items</h2>

              {order.items.some((it) => !!it.imageUrl) && (
                <div className="mb-3 grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-3">
                  {order.items.map((it, idx) => (
                    <div
                      key={`thumb-${idx}`}
                      className="border rounded-lg overflow-hidden aspect-square relative bg-neutral-50"
                    >
                      {it.imageUrl ? (
                        <Image
                          src={it.imageUrl}
                          alt={it.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                          priority={idx < 2}
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-xs text-neutral-500">
                          No image
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {order.items?.length ? (
                  order.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center border rounded-lg p-3">
                      <div className="min-w-0">
                        <div className="font-medium line-clamp-2">{it.name}</div>
                        <div className="text-sm text-neutral-600">Qty: {it.qty}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div>{fmtINR(it.price)} each</div>
                        <div className="text-sm text-neutral-600">
                          Subtotal: {fmtINR(it.price * it.qty)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-neutral-500">No items found for this order.</div>
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">Shipping address</h3>
                {order.addressSnapshot ? (
                  <div className="text-sm text-neutral-700">
                    {order.addressSnapshot.name && (
                      <div className="font-medium">{order.addressSnapshot.name}</div>
                    )}
                    <div>{order.addressSnapshot.line1}</div>
                    {order.addressSnapshot.line2 && <div>{order.addressSnapshot.line2}</div>}
                    <div>
                      {order.addressSnapshot.city}, {order.addressSnapshot.state} - {order.addressSnapshot.pincode}
                    </div>
                    {order.addressSnapshot.phone && (
                      <div className="mt-1">Phone: {order.addressSnapshot.phone}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-neutral-500">No shipping address recorded.</div>
                )}
              </section>

              <section className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">Payment</h3>
                <div className="text-sm text-neutral-700">
                  <div>
                    Method: <strong>{order.payment?.method ?? "—"}</strong>
                  </div>
                  <div>
                    Status:{" "}
                    <strong>{order.payment?.status ?? (order.status === "paid" ? "paid" : "unpaid")}</strong>
                  </div>
                  {order.payment?.razorpayOrderId && (
                    <div className="mt-1">
                      Razorpay Order: <code className="text-xs break-all">{order.payment.razorpayOrderId}</code>
                    </div>
                  )}
                  {order.payment?.razorpayPaymentId && (
                    <div>
                      Razorpay Payment: <code className="text-xs break-all">{order.payment.razorpayPaymentId}</code>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <hr className="my-5" />

            <section className="text-sm rounded-lg border p-4">
              <div className="flex justify-between mb-1">
                <span>Subtotal</span>
                <span>{fmtINR(order.subtotal)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Shipping</span>
                <span>{fmtINR(order.shipping)}</span>
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t font-semibold">
                <span>Total</span>
                <span>{fmtINR(order.total)}</span>
              </div>
            </section>

            <div className="mt-4 text-sm text-neutral-500 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>Created: {fmtDate(order.createdAt)}</div>
              <div>Updated: {fmtDate(order.updatedAt)}</div>
            </div>

            {/* <div className="mt-6 flex gap-2">
              <Link
                href="/orders"
                className="inline-block rounded-lg bg-neutral-100 px-4 py-2 text-sm hover:bg-neutral-200"
              >
                Back to orders
              </Link>
              {order.payment?.status !== "paid" && order.status !== "paid" && (
                <Link
                  href={`/orders/${encodeURIComponent(order._id)}/pay`}
                  className="inline-block rounded-lg bg-[var(--wnr-berry)] px-4 py-2 text-sm text-white hover:opacity-90"
                >
                  Pay now
                </Link>
              )}
            </div> */}
          </>
        )}
      </div>
    </main>
  );
}
