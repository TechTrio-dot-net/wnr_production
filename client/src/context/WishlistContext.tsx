// src/context/WishlistContext.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { buildUrl } from "@/lib/api";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { hasToken } from "@/lib/token";

type WishCtx = {
  ids: Set<string>;
  /** true only for the very first load */
  initializing: boolean;
  /** true for background updates after actions (no UX spinner recommended) */
  syncing: boolean;
  /** deprecated alias kept for backwards compatibility — maps to initializing */
  loading: boolean;

  /** helpers */
  has: (productId: string) => boolean;

  /** actions */
  add: (productId: string) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  toggle: (productId: string) => Promise<void>;
  /**
   * Refresh from server.
   * - defaults to "smart": uses `initializing` for the very first call, otherwise `syncing`
   * - pass `{silent:true}` to avoid toggling either flag (no UI effects)
   */
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
};

const Ctx = createContext<WishCtx | null>(null);

/* ---------- Local mirror + broadcast ---------- */
const WISHLIST_KEY = "wnr:wishlist";
const EVT = "wnr:wishlist:changed";

const readLocalIds = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown[]) : [];
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
};
const writeLocalIds = (ids: Iterable<string>) => {
  if (typeof window === "undefined") return;
  try {
    const out = Array.from(ids);
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(out));
  } catch {}
};
const broadcast = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVT));
};
/* -------------------------------------------- */

/* ---------- helpers ---------- */
const normId = (raw: unknown): string => {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "object") {
    const anyObj = raw as Record<string, unknown>;
    if (typeof anyObj._id === "string") return anyObj._id.trim();
    if (typeof anyObj.id === "string") return anyObj.id.trim();
  }
  return String(raw);
};

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());

  // New: two distinct flags
  const [initializing, setInitializing] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Track if we've done the first fetch already
  const hasInitializedRef = useRef(false);

  // Prevent spamming the same id while an action is inflight
  const inFlight = useRef<Set<string>>(new Set());

  const doFetch = useCallback(async () => {
    // Only fetch if user has a token (is authenticated)
    if (!hasToken()) {
      setIds(new Set());
      return true;
    }
    
    try {
      const res = await fetchWithAuth(buildUrl("/api/wishlist/ids"), { cache: "no-store" });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const serverIds: string[] = Array.isArray((data as any)?.ids)
          ? (data as any).ids.map((x: any) => normId(x))
          : [];
        setIds(new Set(serverIds));
        return true;
      }
      if (res.status === 401) {
        setIds(new Set());
        return true;
      }
      return false;
    } catch {
      // Silently handle network errors
      return false;
    }
  }, []);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);

      // Decide which flag to use
      const firstTime = !hasInitializedRef.current;
      if (!silent) {
        if (firstTime) setInitializing(true);
        else setSyncing(true);
      }

      try {
        await doFetch();
      } catch {
        // Keep optimistic state on network errors
      } finally {
        if (!silent) {
          if (firstTime) {
            setInitializing(false);
            hasInitializedRef.current = true;
          } else {
            setSyncing(false);
          }
        } else if (firstTime) {
          // If silent is true on first-ever refresh, still finalize initializing.
          setInitializing(false);
          hasInitializedRef.current = true;
        }
      }
    },
    [doFetch]
  );

  // Initial fetch (once)
  useEffect(() => {
    void refresh(); // first call will use `initializing`
  }, [refresh]);

  /* ---------- Mirror context->localStorage and broadcast on every state change ---------- */
  const prevJsonRef = useRef<string>("[]");
  useEffect(() => {
    // Avoid noisy writes: only write/broadcast if content changed
    const json = JSON.stringify(Array.from(ids));
    if (json !== prevJsonRef.current) {
      prevJsonRef.current = json;
      writeLocalIds(ids);
      broadcast();
    }
  }, [ids]);

  // Also listen for global changes (other tabs / other components writing localStorage)
  useEffect(() => {
    const reconcileFromLocal = () => {
      const local = readLocalIds();
      // shallow compare sets to avoid loops
      const cur = Array.from(ids);
      if (local.length !== cur.length || local.some((id, i) => id !== cur[i])) {
        setIds(new Set(local));
      }
    };

    const onChanged = () => reconcileFromLocal();
    const onStorage = (e: StorageEvent) => {
      if (e.key === WISHLIST_KEY) reconcileFromLocal();
    };

    window.addEventListener(EVT, onChanged as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVT, onChanged as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [ids]);
  /* ------------------------------------------------------------------------------------- */

  const has = useCallback((productId: string) => {
    return ids.has(normId(productId));
  }, [ids]);

  const add = useCallback(
    async (rawId: string) => {
      const productId = normId(rawId);
      if (!productId) return;
      if (inFlight.current.has(productId)) return;
      inFlight.current.add(productId);

      // optimistic
      setIds((prev) => {
        const n = new Set(prev);
        n.add(productId);
        return n;
      });

      try {
        const res = await fetchWithAuth(buildUrl("/api/wishlist"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (res.status === 401) {
          // revert optimistic add
          setIds((prev) => {
            const n = new Set(prev);
            n.delete(productId);
            return n;
          });
        } else if (!res.ok) {
          // silent server-reconcile (no UI flicker)
          await refresh({ silent: true });
        }
      } catch {
        await refresh({ silent: true });
      } finally {
        inFlight.current.delete(productId);
      }
    },
    [refresh]
  );

  const remove = useCallback(
    async (rawId: string) => {
      const productId = normId(rawId);
      if (!productId) return;
      if (inFlight.current.has(productId)) return;
      inFlight.current.add(productId);

      // optimistic
      setIds((prev) => {
        const n = new Set(prev);
        n.delete(productId);
        return n;
      });

      try {
        const res = await fetchWithAuth(buildUrl(`/api/wishlist/${encodeURIComponent(productId)}`), {
          method: "DELETE",
        });
        if (res.status === 401) {
          // revert optimistic remove
          setIds((prev) => {
            const n = new Set(prev);
            n.add(productId);
            return n;
          });
        } else if (!res.ok) {
          await refresh({ silent: true });
        }
      } catch {
        await refresh({ silent: true });
      } finally {
        inFlight.current.delete(productId);
      }
    },
    [refresh]
  );

  const toggle = useCallback(
    async (rawId: string) => {
      const productId = normId(rawId);
      if (!productId) return;
      if (inFlight.current.has(productId)) return;
      inFlight.current.add(productId);

      const wasInWish = ids.has(productId);

      // optimistic flip
      setIds((prev) => {
        const n = new Set(prev);
        if (wasInWish) n.delete(productId);
        else n.add(productId);
        return n;
      });

      try {
        if (wasInWish) {
          const res = await fetchWithAuth(buildUrl(`/api/wishlist/${encodeURIComponent(productId)}`), {
            method: "DELETE",
          });
          if (res.status === 401) {
            // revert delete
            setIds((prev) => {
              const n = new Set(prev);
              n.add(productId);
              return n;
            });
          } else if (!res.ok) {
            await refresh({ silent: true });
          }
        } else {
          const res = await fetchWithAuth(buildUrl("/api/wishlist"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          });
          if (res.status === 401) {
            // revert add
            setIds((prev) => {
              const n = new Set(prev);
              n.delete(productId);
              return n;
            });
          } else if (!res.ok) {
            await refresh({ silent: true });
          }
        }
      } catch {
        await refresh({ silent: true });
      } finally {
        inFlight.current.delete(productId);
      }
    },
    [ids, refresh]
  );

  const value = useMemo<WishCtx>(
    () => ({
      ids,
      initializing,
      syncing,
      // keep old name around so existing UI doesn't break
      loading: initializing,

      has,
      add,
      remove,
      toggle,
      refresh,
    }),
    [ids, initializing, syncing, has, add, remove, toggle, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWishlist(): WishCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWishlist must be used within <WishlistProvider>");
  return v;
}
