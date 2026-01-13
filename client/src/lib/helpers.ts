// src/lib/helpers.ts (append)
export function toggleWishlist(id: string): "added" | "removed" {
  if (typeof window === "undefined") return "removed";
  try {
    const raw = window.localStorage.getItem("wnr:wishlist");
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    const i = ids.indexOf(id);
    if (i >= 0) {
      ids.splice(i, 1);
      window.localStorage.setItem("wnr:wishlist", JSON.stringify(ids));
      return "removed";
    }
    ids.unshift(id);
    window.localStorage.setItem("wnr:wishlist", JSON.stringify(ids));
    return "added";
  } catch {
    return "removed";
  }
}
