// src/lib/instagram.ts
export type ReelItem = {
  id: string;
  video?: string;
  poster?: string;
  url?: string;
  author?: string;
  caption?: string;
};

export async function fetchReels(limit = 9): Promise<ReelItem[]> {
  const res = await fetch(`/api/instagram/reels?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) {
    let payload: any = undefined;
    try { payload = await res.json(); } catch { /* ignore */ }
    const msg = payload?.error || `HTTP ${res.status}`;
    throw new Error(`Reels API failed: ${msg}`);
  }
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json?.data) ? (json.data as ReelItem[]) : [];
}
