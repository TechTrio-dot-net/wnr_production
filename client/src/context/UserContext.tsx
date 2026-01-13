// src/context/UserContext.tsx
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
import { fetchMe, refreshMe, logout, type Me } from "@/lib/auth";
import { hasToken } from "@/lib/token";

type Ctx = {
  user: Me;
  loading: boolean;                 // initial load / explicit refresh() only
  refresh: () => Promise<void>;     // keeps existing signature/semantics
  logout: (opts?: { redirectTo?: string }) => Promise<void>;
};

const UserContext = createContext<Ctx>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me>(null);
  const [loading, setLoading] = useState(true);

  // Track mount + throttle background refreshes
  const mountedRef = useRef(true);
  const lastBgRef = useRef(0);
  const BG_MIN_INTERVAL_MS = 20_000; // throttle background refreshes on focus/visibility

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Safely set state only if still mounted
  const safeSetUser = useCallback((u: Me) => {
    if (!mountedRef.current) return;
    setUser(u);
  }, []);
  const safeSetLoading = useCallback((v: boolean) => {
    if (!mountedRef.current) return;
    setLoading(v);
  }, []);

  // Initial load (shows loading)
  const load = useCallback(async () => {
    safeSetLoading(true);
    try {
      // ✅ Check if token exists before making API call
      if (!hasToken()) {
        // No token = not logged in
        safeSetUser(null);
        safeSetLoading(false);
        return;
      }
      const me = await fetchMe(true); // Force fresh fetch
      safeSetUser(me);
    } finally {
      safeSetLoading(false);
    }
  }, [safeSetLoading, safeSetUser]);

  // Explicit refresh (keeps your original behavior, shows loading)
  const refresh = useCallback(async () => {
    safeSetLoading(true);
    try {
      const me = await refreshMe();
      safeSetUser(me);
    } finally {
      safeSetLoading(false);
    }
  }, [safeSetLoading, safeSetUser]);

  // Background refresh used on tab focus/visibility change — DOES NOT toggle `loading`
  const backgroundRefresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastBgRef.current < BG_MIN_INTERVAL_MS) return; // throttle
    lastBgRef.current = now;

    // ✅ Only refresh if token exists
    if (!hasToken()) {
      safeSetUser(null);
      return;
    }

    try {
      const me = await fetchMe(false);
      safeSetUser(me);
    } catch {
      // Swallow background errors; keep last known user state
    }
  }, [safeSetUser]);

  const doLogout = useCallback(async (opts?: { redirectTo?: string }) => {
    await logout(opts);
    // logout() may redirect; clear local user immediately
    safeSetUser(null);
  }, [safeSetUser]);

  useEffect(() => {
    // initial read (shows loading)
    void load();

    // Gentle background refreshes (no loading flicker)
    const onVis = () => {
      if (document.visibilityState === "visible") void backgroundRefresh();
    };
    const onFocus = () => void backgroundRefresh();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);

    // 🔔 React immediately to auth changes from LoginClient
    const onAuthChanged = () => {
      // Refetch the current user without toggling the loading spinner
      void (async () => {
        // Only fetch if token exists
        if (!hasToken()) {
          safeSetUser(null);
          return;
        }
        
        try {
          const me = await fetchMe(false);
          safeSetUser(me);
        } catch {
          // ignore
        }
      })();
    };

    // Optional: react to global logout event if you ever dispatch it
    const onLoggedOut = () => {
      safeSetUser(null);
    };

    window.addEventListener("wnr:auth:changed", onAuthChanged);
    window.addEventListener("wnr:logout", onLoggedOut);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("wnr:auth:changed", onAuthChanged);
      window.removeEventListener("wnr:logout", onLoggedOut);
    };
  }, [load, backgroundRefresh, safeSetUser]);

  const value = useMemo<Ctx>(
    () => ({ user, loading, refresh, logout: doLogout }),
    [user, loading, refresh, doLogout]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): Ctx {
  return useContext(UserContext);
}
