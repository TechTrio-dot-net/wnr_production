// src/components/common/AddToCartButton.tsx
"use client";

import React from "react";
import { useCart } from "@/context/CartContext";

type Props = {
  productId: string;
  qty?: number;
  className?: string;
  children?: React.ReactNode;
};

export default function AddToCartButton({ productId, qty = 1, className, children }: Props) {
  const { add, loading } = useCart();

  const handleClick = async () => {
    await add(productId, qty);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className ?? "rounded-full px-4 py-2 bg-black text-white"}
      aria-busy={loading}
    >
      {children ?? (loading ? "Adding…" : "Add to cart")}
    </button>
  );
}
