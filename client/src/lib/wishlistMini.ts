

// src/lib/wishlistMini.ts
"use client";

/** Single source of truth for local wishlist badge state */
const KEY = "wnr:wishlist";
const EVT = "wnr:wishlist:changed";

/* ---- internal helpers ---- */
function dispatchChanged() {
  try {
    window.dispatchEvent(new Event(EVT));
  } catch {
    /* no-op */
  }
}

export function readLocalIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr as string[]) : [];
  } catch {
    return [];
  }
}

/* ---- exports used by your page + navbar ---- */

/** Overwrite full ID list and notify navbar */
export function writeLocalIds(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* no-op */
  }
  dispatchChanged();
}

/** Add/remove deltas and notify navbar */
export function applyDelta({
  add = [],
  remove = [],
}: {
  add?: string[];
  remove?: string[];
}) {
  const set = new Set(readLocalIds());
  for (const id of add) set.add(id);
  for (const id of remove) set.delete(id);
  writeLocalIds([...set]); // also dispatches
}

/** Clear local state and notify navbar */
export function clearLocalWishlist() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
  dispatchChanged();
}

/**
 * Small helper for heart buttons:
 * Call this right after your API succeeds (or optimistically before).
 */
export function pingWishlistBadge(productId: string, adding: boolean) {
  const set = new Set(readLocalIds());
  if (adding) set.add(productId);
  else set.delete(productId);
  writeLocalIds([...set]); // also dispatches
}


