// src/components/cart/CartDrawer.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { IoClose } from "react-icons/io5";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";

const money = (n: number) => `₹${n.toLocaleString("en-IN")}/-`;

/** Normalize product image value (string | { url: string }) to a plain string URL */
type ImgLike = string | { url: string } | undefined | null;
function toImageUrl(img: ImgLike): string {
  if (!img) return "/product-placeholder.png";
  return typeof img === "string" ? img : (img.url || "/product-placeholder.png");
}

export default function CartDrawer({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate?: (href: string) => void;
}) {
  const { cart, loading, error, update, remove, subtotal, count } = useCart();

  const asideRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const [footerH, setFooterH] = useState(0);

  // Close on Esc
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (open && e.key === "Escape") onClose();
    },
    [open, onClose]
  );
  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onKeyDown]);

  // Lock body scroll when open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  // Set drawer height dynamically
  useEffect(() => {
    if (!open) return;
    const setHeights = () => {
      const vh =
        typeof window !== "undefined"
          ? window.visualViewport?.height ?? window.innerHeight
          : 0;
      if (asideRef.current && vh > 0) asideRef.current.style.height = `${vh}px`;
      if (footerRef.current)
        setFooterH(footerRef.current.getBoundingClientRect().height);
    };
    setHeights();
    window.addEventListener("resize", setHeights, { passive: true });
    window.addEventListener("orientationchange", setHeights);
    window.visualViewport?.addEventListener("resize", setHeights);
    return () => {
      window.removeEventListener("resize", setHeights);
      window.removeEventListener("orientationchange", setHeights);
      window.visualViewport?.removeEventListener("resize", setHeights);
    };
  }, [open]);

  const items = cart?.items || [];

  const navigate = (href: string) => {
    if (onNavigate) onNavigate(href);
    else if (typeof window !== "undefined") window.location.href = href;
  };

  return (
    <>
      {/* Overlay (click outside to close) */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        ref={asideRef}
        role="dialog"
        aria-label="Cart drawer"
        className={`
          fixed top-0 right-0 w-full md:w-[36vw] max-w-md
          bg-white text-[var(--wnr-text)] shadow-2xl z-[70]
          transform transition-transform duration-500
          ${open ? "translate-x-0" : "translate-x-full"}
          flex flex-col overflow-x-hidden
        `}
        style={{ height: "100dvh" as unknown as number }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
          <h3 className="font-semibold text-lg">Your Cart</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5"
          >
            <IoClose size={22} />
          </button>
        </div>

        {/* Scroll area */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-6"
          style={{
            paddingBottom: `calc(${footerH}px + env(safe-area-inset-bottom, 0px))`,
          }}
        >
          {loading && !cart ? (
            <div className="py-12 text-center text-sm text-neutral-600">
              Loading…
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-600">{error}</div>
          ) : items.length === 0 ? (
            <div className="text-center text-sm text-neutral-600 py-12">
              Your cart is empty.
              <div className="mt-4">
                <button
                  onClick={() => navigate("/products")}
                  className="inline-flex items-center justify-center rounded-full px-4 py-2 border border-neutral-300 hover:bg-neutral-50"
                >
                  Browse Products
                </button>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((it: any) => {
                const p = it.product;
                // Calculate discounted price
                const originalPrice = p?.price ?? it.priceAtAdd ?? 0;
                // Always use product's current discount. If product no longer has discount, don't apply stored discount from add time
                const discountPercentage = (typeof p?.discountPercentage === 'number' && p.discountPercentage > 0)
                  ? p.discountPercentage
                  : undefined;
                // Calculate discounted price if discount exists
                const discountedPrice = typeof discountPercentage === 'number' && discountPercentage > 0
                  ? Math.round(originalPrice * (1 - discountPercentage / 100))
                  : originalPrice;
                const stock = typeof p?.stock === 'number' ? p.stock : undefined;
                const isOutOfStock = typeof stock === 'number' && (stock === 0 || stock < it.qty);
                const lineTotal = discountedPrice * it.qty;
                const hasDiscount = typeof discountPercentage === 'number' && discountPercentage > 0;
                const rawImg =
                  Array.isArray(p?.images) && p.images.length ? p.images[0] : undefined;
                const imgUrl = toImageUrl(rawImg);

                return (
                  <li
                    key={it._id}
                    className={`rounded-xl border p-3 flex gap-3 ${
                      isOutOfStock 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-black/5'
                    }`}
                  >
                    <button
                      className="block relative w-16 h-16 shrink-0 rounded-lg overflow-hidden ring-1 ring-black/5"
                      onClick={() => navigate(`/products/${p?._id}`)}
                      aria-label={`View ${p?.name}`}
                    >
                      <Image
                        src={imgUrl}
                        alt={p?.name || "Product"}
                        fill
                        sizes="64px"
                        className={`object-cover ${isOutOfStock ? 'opacity-60' : ''}`}
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-0.5">
                        <button
                          onClick={() => navigate(`/products/${p?._id}`)}
                          className={`font-semibold line-clamp-1 hover:text-[var(--wnr-berry)] text-left flex-1 ${
                            isOutOfStock ? 'text-red-900' : ''
                          }`}
                        >
                          {p?.name || "Product"}
                        </button>
                        {isOutOfStock && (
                          <span className="text-xs px-2 py-0.5 bg-red-500 text-white rounded-full font-medium shrink-0">
                            Out of Stock
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-neutral-600 mt-0.5">
                        {hasDiscount ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="line-through text-neutral-400">
                                ₹{originalPrice.toLocaleString("en-IN")}
                              </span>
                              <span className="font-semibold text-[var(--wnr-berry)]">
                                ₹{discountedPrice.toLocaleString("en-IN")}
                              </span>
                            </div>
                            <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded w-fit">
                              {discountPercentage}% OFF
                            </span>
                          </div>
                        ) : (
                          <span className="font-medium">₹{originalPrice.toLocaleString("en-IN")}</span>
                        )}
                      </div>

                      {isOutOfStock && (
                        <p className="text-xs text-red-600 font-medium mt-1 mb-2">
                          This item is no longer available. Please remove it.
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-2">
                        <div className={`inline-flex items-center rounded-full border overflow-hidden ${
                          isOutOfStock ? 'border-red-300 opacity-60' : 'border-black/10'
                        }`}>
                          <button
                            type="button"
                            disabled={isOutOfStock || it.qty <= 1}
                            className="px-3 py-1 text-sm hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={async () => {
                              if (it.qty > 1) {
                                try {
                                  await update(it._id, it.qty - 1);
                                } catch (e: any) {
                                  toast.error(e?.message || "Failed to update quantity");
                                }
                              }
                            }}
                          >
                            –
                          </button>
                          <span className="px-3 py-1 text-sm tabular-nums">
                            {it.qty}
                          </span>
                          <button
                            type="button"
                            disabled={isOutOfStock || (typeof stock === 'number' && stock <= it.qty)}
                            className="px-3 py-1 text-sm hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={async () => {
                              try {
                                await update(it._id, it.qty + 1);
                              } catch (e: any) {
                                toast.error(e?.message || "Failed to update quantity");
                              }
                            }}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className="px-3 py-1 text-sm rounded-full hover:bg-black/5 text-red-600 hover:bg-red-50 font-medium"
                          onClick={async () => {
                            try {
                              await remove(it._id);
                              toast.success("Removed from cart");
                            } catch (e: any) {
                              toast.error(e?.message || "Failed to remove item");
                            }
                          }}
                        >
                          {isOutOfStock ? 'Remove' : 'Remove'}
                        </button>
                      </div>
                    </div>

                    <div className="self-start font-semibold text-right">
                      <div className={isOutOfStock ? 'text-red-600 line-through' : ''}>
                        {money(lineTotal)}
                      </div>
                      {hasDiscount && !isOutOfStock && (
                        <div className="text-xs text-neutral-400 line-through mt-0.5">
                          {money(originalPrice * it.qty)}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div
          ref={footerRef}
          className="bg-white border-t p-4 sticky bottom-0 left-0 right-0 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]"
        >
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Items</span>
              <span>{count}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="font-medium">Subtotal</span>
              <span className="font-medium">₹ {subtotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500">
              Shipping calculated at checkout.
            </p>
            <div className="h-px bg-neutral-200 my-1" />
            <div className="flex justify-between text-base font-semibold">
              <span>Total (before shipping)</span>
              <span>{money(subtotal)}</span>
            </div>
          </div>

          <button
            onClick={() => {
              if ((cart?.items?.length || 0) > 0) navigate("/checkout");
            }}
            className="mt-3 block w-full rounded-full px-4 py-3 text-center bg-[var(--wnr-berry)] text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--wnr-berry)]"
          >
            Continue to Checkout
          </button>

          <div className="pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)]" />
        </div>
      </aside>
    </>
  );
}
