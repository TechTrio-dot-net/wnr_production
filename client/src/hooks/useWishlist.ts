// src/hooks/useWishlist.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildUrl as build } from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/** Normalize any incoming product id to a stable string */
const normId = (raw: unknown): string => {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (typeof o._id === "string") return o._id.trim();
    if (typeof o.id === "string") return o.id.trim();
  }
  return String(raw);
};

export function useWishlist() {
  const { user, loading: userLoading } = useUser();

  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Prevent spammy duplicate ops on the same product id
  const inFlight = useRef<Set<string>>(new Set());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const safeSet = useCallback(<T,>(updater: (prev: T) => T, setter: (val: T) => void) => {
    if (!mounted.current) return;
    setter(updater as any);
  }, []);

  /** Pull latest ids from the server (requires logged-in user) */
  const refresh = useCallback(async () => {
    if (!user || userLoading) {
      // not logged in or unknown yet
      safeSet<Set<string>>(() => new Set(), setIds);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithAuth(build("/api/wishlist/ids"), {
        cache: "no-store",
      });
      if (!res.ok) {
        // Keep optimistic state on transient server errors, but clear on 401
        if (res.status === 401) {
          safeSet<Set<string>>(() => new Set(), setIds);
        }
        return;
      }
      const data = (await res.json()) as { ids?: unknown[] };
      const normalized = new Set((data?.ids ?? []).map(normId).filter(Boolean) as string[]);
      safeSet(() => normalized, setIds);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [user, userLoading, safeSet]);

  // Load once user is known (and on user change)
  useEffect(() => {
    if (userLoading) return;
    void refresh();
  }, [user, userLoading, refresh]);

  const has = useCallback((id: string) => ids.has(normId(id)), [ids]);

  const add = useCallback(
    async (rawId: string) => {
      const id = normId(rawId);
      if (!id) return;
      if (!user) throw new Error("Please sign in to use wishlist.");
      if (inFlight.current.has(id)) return;
      inFlight.current.add(id);

      // optimistic
      safeSet<Set<string>>((prev) => {
        const n = new Set(prev);
        n.add(id);
        return n;
      }, setIds);

      try {
        const res = await fetchWithAuth(build("/api/wishlist"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: id }),
        });
        if (res.status === 401) {
          // revert
          safeSet<Set<string>>((prev) => {
            const n = new Set(prev);
            n.delete(id);
            return n;
          }, setIds);
          throw new Error("Please sign in to use wishlist.");
        }
        if (!res.ok) {
          // reconcile with server state
          await refresh();
          const msg = (await res.text().catch(() => "")) || "Failed to add to wishlist";
          throw new Error(msg);
        }
      } finally {
        inFlight.current.delete(id);
      }
    },
    [user, refresh, safeSet]
  );

  const remove = useCallback(
    async (rawId: string) => {
      const id = normId(rawId);
      if (!id) return;
      if (!user) throw new Error("Please sign in to use wishlist.");
      if (inFlight.current.has(id)) return;
      inFlight.current.add(id);

      // optimistic
      safeSet<Set<string>>((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      }, setIds);

      try {
        const res = await fetchWithAuth(build(`/api/wishlist/${encodeURIComponent(id)}`), {
          method: "DELETE",
        });
        if (res.status === 401) {
          // revert
          safeSet<Set<string>>((prev) => {
            const n = new Set(prev);
            n.add(id);
            return n;
          }, setIds);
          throw new Error("Please sign in to use wishlist.");
        }
        if (!res.ok) {
          await refresh();
          const msg = (await res.text().catch(() => "")) || "Failed to remove from wishlist";
          throw new Error(msg);
        }
      } finally {
        inFlight.current.delete(id);
      }
    },
    [user, refresh, safeSet]
  );

  const toggle = useCallback(
    async (rawId: string) => {
      const id = normId(rawId);
      if (!id) return;
      if (!user) throw new Error("Please sign in to use wishlist.");
      if (inFlight.current.has(id)) return;
      inFlight.current.add(id);

      // Determine current membership BEFORE optimistic flip (no stale read)
      const wasInWish = ids.has(id);

      // optimistic flip
      safeSet<Set<string>>((prev) => {
        const n = new Set(prev);
        if (wasInWish) n.delete(id);
        else n.add(id);
        return n;
      }, setIds);

      try {
        if (wasInWish) {
          const res = await fetchWithAuth(build(`/api/wishlist/${encodeURIComponent(id)}`), {
            method: "DELETE",
          });
          if (res.status === 401) {
            // revert delete
            safeSet<Set<string>>((prev) => {
              const n = new Set(prev);
              n.add(id);
              return n;
            }, setIds);
            throw new Error("Please sign in to use wishlist.");
          }
          if (!res.ok) await refresh();
        } else {
          const res = await fetchWithAuth(build("/api/wishlist"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: id }),
          });
          if (res.status === 401) {
            // revert add
            safeSet<Set<string>>((prev) => {
              const n = new Set(prev);
              n.delete(id);
              return n;
            }, setIds);
            throw new Error("Please sign in to use wishlist.");
          }
          if (!res.ok) await refresh();
        }
      } finally {
        inFlight.current.delete(id);
      }
    },
    [ids, user, refresh, safeSet]
  );

  return {
    loading: userLoading || loading,
    ids,
    has,
    add,
    remove,
    toggle,
    refresh,
    user,
  };
}
