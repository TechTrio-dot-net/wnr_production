// src/lib/auth.ts

import { getAuthHeader, clearToken, hasToken } from "./token";

export type UserMe = {
  _id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
};
export type Me = UserMe | null;

// Default to same-origin to avoid cross-site cookie issues
const BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
const build = (p: string) => {
  const path = p.startsWith("/") ? p : `/${p}`;
  return BASE ? `${BASE}${path}` : path;
};

export async function fetchMe(noStoreOrForce: boolean = true): Promise<Me> {
  // Check if token exists before making request
  if (!hasToken()) {
    return null;
  }

  try {
    const headers = getAuthHeader();
    const res = await fetch(build("/api/users/me"), {
      cache: noStoreOrForce ? "no-store" : "default",
      headers,
    });
    
    if (!res.ok) {
      // Clear token on 401 (Unauthorized)
      if (res.status === 401) {
        clearToken();
      }
      return null;
    }
    
    const obj = (await res.json()) as Partial<UserMe>;
    if (obj && typeof obj === "object" && obj._id) {
      return {
        _id: String(obj._id),
        name: obj.name ?? null,
        email: obj.email ?? null,
        phone: obj.phone ?? null,
        avatarUrl: (obj as any).avatarUrl ?? null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function refreshMe(): Promise<Me> {
  try {
    await fetch(build("/api/auth/refresh"), { method: "POST", credentials: "include" });
  } catch {}
  return fetchMe(true);
}

export async function logout(opts?: { redirectTo?: string }): Promise<void> {
  try {
    const headers = getAuthHeader();
    await fetch(build("/api/auth/logout"), { method: "POST", headers });
  } catch {}
  
  if (typeof window !== "undefined") {
    // Clear token from localStorage
    clearToken();
    
    // Dispatch logout event for other components
    window.dispatchEvent(new CustomEvent("wnr:logout"));
    
    // Redirect to login
    window.location.href = opts?.redirectTo ?? "/login";
  }
}

export async function isLoggedIn(): Promise<boolean> {
  const me = await fetchMe(true);
  return !!me;
}

export function currentPathWithQuery(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname + window.location.search;
}
