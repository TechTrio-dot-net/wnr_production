// "use client" not needed here (pure functions)
import { buildUrl } from "@/lib/api";

export type MeUser = { id: string; email: string; role: "admin" | "user" };

/**
 * Decode the client-side JWT (stored under `wnr_admin_token`) and return a
 * lightweight user object without making a network request to `/admin/auth/me`.
 *
 * This avoids calling the backend `/me` endpoint from the client during
 * initialization and prevents server redirects caused by server-side fetches.
 */
export async function fetchMe(): Promise<MeUser | null> {
  try {
    if (typeof window === "undefined") return null;
    const token = window.localStorage.getItem("wnr_admin_token");
    if (!token) return null;

    // JWT: header.payload.signature
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];

    // base64url -> base64
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    // add padding
    const pad = b64.length % 4;
    const padded = pad === 0 ? b64 : b64 + "=".repeat(4 - pad);
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const obj = JSON.parse(json) as Record<string, unknown> | null;
    if (!obj) return null;

    const uid = typeof obj.uid === "string" ? obj.uid : typeof obj.sub === "string" ? obj.sub : null;
    const role = typeof obj.role === "string" ? obj.role : undefined;
    const email = typeof obj.email === "string" ? obj.email : "";
    if (!uid || !role) return null;
    return { id: uid, email, role: role === "admin" ? "admin" : "user" };
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    // clear client-side token
    if (typeof window !== "undefined") window.localStorage.removeItem("wnr_admin_token");
  } catch {}
  // inform backend to clear cookies if any
  await fetch(buildUrl("/admin/auth/logout"), {
    method: "POST",
  }).catch(() => {});
}
