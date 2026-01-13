// app/api/instagram/reels/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IG_USER_ID = (process.env.IG_USER_ID || "").trim();
const RAW_TOKEN = (process.env.IG_ACCESS_TOKEN || "").trim().replace(/^"+|"+$/g, "");
const IG_GRAPH_VERSION = process.env.IG_GRAPH_VERSION?.trim() || "v21.0";

const isBasicDisplay = RAW_TOKEN.startsWith("IG");
const BASE = isBasicDisplay ? "https://graph.instagram.com" : `https://graph.facebook.com/${IG_GRAPH_VERSION}`;

type ReelItem = {
  id: string;
  video?: string;
  poster?: string;
  url?: string;
  author?: string;
  caption?: string;
};

type MediaNode = {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_product_type?: string;
  media_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  caption?: string;
  username?: string;
  timestamp?: string;
  children?: { data: MediaNode[] };
};

class IGApiError extends Error {
  status: number;
  url: string;
  body?: unknown;
  constructor(status: number, message: string, url: string, body?: unknown) {
    super(message);
    this.name = "IGApiError";
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

function tokenKind() {
  const prefix = RAW_TOKEN ? RAW_TOKEN.slice(0, 3) : "";
  return RAW_TOKEN ? (isBasicDisplay ? `basic-display:${prefix}` : `graph:${prefix}`) : "none";
}

async function igFetch<T>(path: string, params: Record<string, string | number>) {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const url = `${BASE}${path}?${qs}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  const txt = await res.text();
  let json: any = undefined;
  try { json = txt ? JSON.parse(txt) : undefined; } catch { /* keep txt */ }

  if (!res.ok) {
    const msg =
      (json?.error?.message as string) ||
      (json?.message as string) ||
      (txt && txt.slice(0, 200)) ||
      "Instagram API error";
    throw new IGApiError(res.status, msg, url, json ?? txt);
  }
  return (json ?? {}) as T;
}

function pickVideoUrl(n: Pick<MediaNode, "media_url" | "video_url">) {
  return n.media_url || n.video_url || undefined;
}

function toVideoItem(n: MediaNode): ReelItem | null {
  if (n.media_type !== "VIDEO") return null;
  const src = pickVideoUrl(n);
  if (!src) return null;
  return {
    id: n.id,
    video: src,
    poster: n.thumbnail_url,
    url: n.permalink,
    author: n.username,
    caption: n.caption,
  };
}

export async function GET(request: Request) {
  if (!IG_USER_ID || !RAW_TOKEN) {
    return NextResponse.json(
      {
        error: "Missing IG_USER_ID or IG_ACCESS_TOKEN",
        where: "env",
        hint:
          "Set IG_USER_ID and IG_ACCESS_TOKEN in .env.local. Restart dev server after changes.",
        token_kind: tokenKind(),
        user_id: IG_USER_ID || "none",
        graph_base: BASE,
      },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") || 9);
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(25, limitParam)) : 9;

  try {
    let nodes: MediaNode[] = [];

    if (isBasicDisplay) {
      // Basic Display
      const baseFields = "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp";
      const base = await igFetch<{ data: MediaNode[] }>(`/${IG_USER_ID}/media`, {
        fields: baseFields,
        access_token: RAW_TOKEN,
        limit: Math.max(limit, 12),
      });

      const enriched = await Promise.all(
        (base.data || []).map(async (m) => {
          if (m.media_type === "CAROUSEL_ALBUM") {
            try {
              const kids = await igFetch<{ data: MediaNode[] }>(`/${m.id}/children`, {
                fields: "id,media_type,media_url,thumbnail_url,video_url",
                access_token: RAW_TOKEN,
              });
              m.children = { data: kids.data || [] };
            } catch { /* ignore individual child error */ }
          }
          return m;
        })
      );

      nodes = enriched;
    } else {
      // Facebook Graph
      const fieldsInline =
        "id,media_type,media_product_type,media_url,video_url,thumbnail_url,permalink,caption,username,timestamp,children{media_type,media_url,video_url,thumbnail_url}";
      let resp: { data: MediaNode[] };

      try {
        resp = await igFetch<{ data: MediaNode[] }>(`/${IG_USER_ID}/media`, {
          fields: fieldsInline,
          access_token: RAW_TOKEN,
          limit: Math.max(limit, 12),
        });
      } catch (e: any) {
        // Fallback (no children)
        if (!(e instanceof IGApiError)) throw e;
        const baseFields =
          "id,media_type,media_product_type,media_url,video_url,thumbnail_url,permalink,caption,username,timestamp";
        const base = await igFetch<{ data: MediaNode[] }>(`/${IG_USER_ID}/media`, {
          fields: baseFields,
          access_token: RAW_TOKEN,
          limit: Math.max(limit, 12),
        });
        const enriched = await Promise.all(
          (base.data || []).map(async (m) => {
            if (m.media_type === "CAROUSEL_ALBUM") {
              try {
                const kids = await igFetch<{ data: MediaNode[] }>(`/${m.id}/children`, {
                  fields: "id,media_type,media_url,video_url,thumbnail_url",
                  access_token: RAW_TOKEN,
                });
                m.children = { data: kids.data || [] };
              } catch { /* ignore */ }
            }
            return m;
          })
        );
        resp = { data: enriched };
      }

      nodes = resp.data || [];
    }

    // Keep only reels/videos
    const out: ReelItem[] = [];
    for (const n of nodes) {
      if (n.media_type === "VIDEO") {
        if (!isBasicDisplay && n.media_product_type && n.media_product_type !== "REELS") continue;
        const r = toVideoItem(n);
        if (r) out.push(r);
        continue;
      }
      if (n.media_type === "CAROUSEL_ALBUM" && n.children?.data?.length) {
        const vid = n.children.data.find((c) => c.media_type === "VIDEO");
        const src = vid && pickVideoUrl(vid);
        if (src) {
          out.push({
            id: n.id,
            video: src,
            poster: vid.thumbnail_url || n.thumbnail_url,
            url: n.permalink,
            author: n.username,
            caption: n.caption,
          });
        }
      }
    }

    const data = out.slice(0, limit);

    return new NextResponse(JSON.stringify({ data }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (e: any) {
    if (e instanceof IGApiError) {
      // Surface Instagram’s own status + message
      return NextResponse.json(
        {
          error: e.message,
          where: "instagram",
          details: e.body,
          request_url: e.url,
          token_kind: tokenKind(),
          user_id: IG_USER_ID,
          graph_base: BASE,
          hint:
            isBasicDisplay
              ? "Token starts with IG… (Basic Display). Ensure IG_USER_ID is the BD user id from the same auth."
              : "Token is a Page/Graph token. Ensure IG_USER_ID is the Instagram Business ID (1784…) linked to the Page.",
        },
        { status: e.status || 400 }
      );
    }
    // Unknown internal error
    return NextResponse.json(
      {
        error: e?.message || "Failed to fetch IG reels",
        where: "server",
        token_kind: tokenKind(),
        user_id: IG_USER_ID,
        graph_base: BASE,
      },
      { status: 500 }
    );
  }
}
