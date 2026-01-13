"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { buildUrl as build } from "@/lib/api";
import { writeLocalIds, applyDelta } from "@/lib/wishlistMini";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

type WLItem = {
  _id: string;
  name: string;
  price?: number;
  imageUrl?: string;
};

export default function WishlistPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { add } = useCart();

  const [items, setItems] = useState<WLItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const money = (n?: number) => (typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : "—");

  /* 🚫 Block page for unauthenticated users */
  useEffect(() => {
    if (!userLoading && !user) {
      toast.warning("Please sign in to use the wishlist");
      router.replace("/login");
    }
  }, [user, userLoading, router]);

  /* ✅ Load wishlist from API if logged in */
  useEffect(() => {
    if (userLoading || !user) return;

    let aborted = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetchWithAuth(build("/api/wishlist"), {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as { items: WLItem[] };
        if (aborted) return;

        const list = data.items ?? [];
        setItems(list);
        setSelected(new Set());
        writeLocalIds(list.map((i) => i._id));
      } catch (e: any) {
        if (aborted) return;
        setErr(e?.message || "Failed to load wishlist");
        setItems([]);
        setSelected(new Set());
        writeLocalIds([]);
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
      controller.abort();
    };
  }, [user, userLoading]);

  /* 🧮 Selection + actions logic */
  const allSelected = items.length > 0 && items.every((i) => selected.has(i._id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i._id)));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const removeOne = useCallback(
    async (id: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i._id !== id);
        applyDelta({ remove: [id] });
        return next;
      });

      try {
        const res = await fetchWithAuth(build(`/api/wishlist/${encodeURIComponent(id)}`), {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(await res.text());
        toast("Removed from wishlist");

        setItems((cur) => {
          writeLocalIds(cur.map((i) => i._id));
          return cur;
        });
      } catch (e: any) {
        toast.error(e?.message || "Remove failed");
      }
    },
    []
  );

  const clearAll = useCallback(async () => {
    setItems([]);
    setSelected(new Set());
    writeLocalIds([]);

    try {
      const res = await fetchWithAuth(build("/api/wishlist"), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      toast("Wishlist cleared");
    } catch (e: any) {
      toast.error(e?.message || "Clear failed");
    }
  }, []);

  const moveToCart = useCallback(
    async (id: string, name?: string) => {
      try {
        await add(id, 1);
        await removeOne(id);
        toast.success("Moved to cart", { description: name });
      } catch (e: any) {
        toast.error(e?.message || "Could not move to cart");
      }
    },
    [add, removeOne]
  );

  const moveSelectedToCart = useCallback(async () => {
    if (selected.size === 0) return;
    for (const id of Array.from(selected)) {
      const product = items.find((i) => i._id === id);
      // eslint-disable-next-line no-await-in-loop
      await moveToCart(id, product?.name);
    }
    setSelected(new Set());
  }, [selected, items, moveToCart]);

  if (userLoading) {
    return (
      <main className="wnr-container py-10">
        <div>Checking session…</div>
      </main>
    );
  }

  /* ✅ Only logged-in users reach this UI */
  return (
    <main className="wnr-container py-10 mt-28">
      <div className="my-6">
        <div className="eyebrow">Saved items</div>
        <h1 className="font-title">Wishlist</h1>
      </div>

      {loading && <div className="text-sm text-neutral-600">Loading wishlist…</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      {items.length > 0 && (
        <div className="sticky top-[64px] z-10 -mx-2 md:mx-0 mb-4">
          <div className="bg-white/80 backdrop-blur border rounded-xl px-3 py-2 md:px-4 md:py-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="accent-[var(--wnr-berry)]"
              />
              <span>
                {selected.size > 0
                  ? `${selected.size} selected`
                  : `You have ${items.length} item${items.length === 1 ? "" : "s"}`}
              </span>
            </label>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={moveSelectedToCart}
                disabled={selected.size === 0}
                className="btn btn-primary disabled:opacity-50"
              >
                Move selected to cart
              </button>
              <button
                onClick={() => setSelected(new Set())}
                disabled={selected.size === 0}
                className="btn btn-outline disabled:opacity-50"
              >
                Unselect
              </button>
              <button onClick={clearAll} className="btn btn-outline">
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card card-pad text-center">
          <h3 className="font-title text-xl">No favorites yet</h3>
          <p className="muted mt-2">Tap the heart on any product to save it to your wishlist.</p>
          <div className="mt-4">
            <Link href="/products" className="btn btn-primary">
              Browse products
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((p) => {
            const sel = selected.has(p._id);
            return (
              <div
                key={p._id}
                className="group relative rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm hover:shadow-md transition"
              >
                {/* select */}
                <label className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-white/80 backdrop-blur rounded-full px-2 py-1">
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => toggleOne(p._id)}
                    className="accent-[var(--wnr-berry)]"
                  />
                  <span className="text-[11px]">Select</span>
                </label>

                <Link href={`/products/${p._id}`} className="block">
                  <div className="relative aspect-[4/3] ring-1 ring-black/5">
                    <Image
                      src={p.imageUrl || "/product-placeholder.png"}
                      alt={p.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute bottom-2 left-2 inline-flex rounded-full border border-black/10 px-2 py-0.5 text-[11px] bg-white/80">
                      {money(p.price)}
                    </div>
                  </div>
                </Link>

                <div className="p-3">
                  <Link href={`/products/${p._id}`} className="block">
                    <h3 className="font-semibold text-base line-clamp-1 group-hover:text-[var(--wnr-berry)] transition-colors">
                      {p.name}
                    </h3>
                  </Link>
                </div>

                <div className="px-3 pb-3 flex items-center gap-2">
                  <button
                    className="btn btn-primary flex-1"
                    onClick={() => moveToCart(p._id, p.name)}
                  >
                    Move to cart
                  </button>
                  <button className="btn btn-outline" onClick={() => removeOne(p._id)}>
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-8 text-center">
          <Link href="/products" className="btn btn-outline">
            Continue shopping
          </Link>
        </div>
      )}
    </main>
  );
}
