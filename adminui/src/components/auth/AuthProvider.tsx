"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { fetchMe as fetchCurrentUser } from "@/lib/authClient";

type Role = "admin" | "user";
export type User = { id?: string; email: string; role: Role } | null;

type AuthCtx = {
  user: User;
  setUser: (u: User) => void;
  refreshUser: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  setUser: () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(Ctx);

export default function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: User;
}) {
  const [user, setUser] = useState<User>(initialUser ?? null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const u = await fetchCurrentUser();
      setUser(u);
    } catch {
      setUser(null);
    }
  }, []);

  // Optional: keep session fresh when tab regains focus
  useEffect(() => {
    const onFocus = () => { void refreshUser(); };
    window.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshUser]);

  // On mount, attempt to refresh user from token in localStorage
  useEffect(() => {
    void (async () => {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If not loading and no user, redirect to login (client-side)
  useEffect(() => {
    if (!loading && !user) {
      // don't redirect if already on login page
      if (!pathname?.startsWith("/login")) {
        router.replace("/login");
      }
    }
  }, [loading, user, router, pathname]);

  return (
    <Ctx.Provider value={{ user, setUser, refreshUser }}>
      {children}
    </Ctx.Provider>
  );
}
