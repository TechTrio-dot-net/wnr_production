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
                const lineTotal = p.price * it.qty;
                const rawImg =
                  Array.isArray(p.images) && p.images.length ? p.images[0] : undefined;
                const imgUrl = toImageUrl(rawImg);

                return (
                  <li
                    key={it._id}
                    className="rounded-xl border border-black/5 p-3 flex gap-3"
                  >
                    <button
                      className="block relative w-16 h-16 shrink-0 rounded-lg overflow-hidden ring-1 ring-black/5"
                      onClick={() => navigate(`/products/${p._id}`)}
                      aria-label={`View ${p.name}`}
                    >
                      <Image
                        src={imgUrl}
                        alt={p.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/products/${p._id}`)}
                        className="font-semibold line-clamp-1 hover:text-[var(--wnr-berry)] text-left"
                      >
                        {p.name}
                      </button>
                      <p className="text-sm text-neutral-600">
                        ₹ {p.price.toFixed(2)}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="inline-flex items-center rounded-full border border-black/10 overflow-hidden">
                          <button
                            type="button"
                            className="px-3 py-1 text-sm hover:bg-black/5"
                            onClick={async () => {
                              if (it.qty > 1) await update(it._id, it.qty - 1);
                            }}
                          >
                            –
                          </button>
                          <span className="px-3 py-1 text-sm tabular-nums">
                            {it.qty}
                          </span>
                          <button
                            type="button"
                            className="px-3 py-1 text-sm hover:bg-black/5"
                            onClick={async () => {
                              await update(it._id, it.qty + 1);
                            }}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className="px-3 py-1 text-sm rounded-full hover:bg-black/5"
                          onClick={async () => {
                            await remove(it._id);
                            toast("Removed from cart");
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="self-start font-semibold">
                      {money(lineTotal)}
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
