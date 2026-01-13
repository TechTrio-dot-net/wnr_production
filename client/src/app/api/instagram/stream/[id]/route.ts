// app/api/instagram/stream/[id]/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IG_USER_ID = (process.env.IG_USER_ID || "").trim();
const RAW_TOKEN = (process.env.IG_ACCESS_TOKEN || "").trim().replace(/^"+|"+$/g, "");
const IG_GRAPH_VERSION = process.env.IG_GRAPH_VERSION?.trim() || "v21.0";

const isBasicDisplay = RAW_TOKEN.startsWith("IG");
const BASE = isBasicDisplay
  ? "https://graph.instagram.com"
  : `https://graph.facebook.com/${IG_GRAPH_VERSION}`;

type MediaNode = {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  video_url?: string;
};

async function igFetch<T>(path: string, params: Record<string, string | number>) {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, { cache: "no-store" });
  const txt = await res.text();
  let json: any;
  try { json = txt ? JSON.parse(txt) : {}; } catch { json = { raw: txt }; }
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || "Instagram API error";
    // return actionable JSON to the client
    return Promise.reject(new IGApiError(res.status, msg, { body: json, url: `${BASE}${path}?${qs}` }));
  }
  return json as T;
}

class IGApiError extends Error {
  status: number;
  body?: any;
  url?: string;
  constructor(status: number, message: string, extra?: { body?: any; url?: string }) {
    super(message);
    this.status = status;
    this.body = extra?.body;
    this.url = extra?.url;
  }
}

function pickVideoUrl(n: MediaNode) {
  return n.video_url || n.media_url || undefined;
}

/**
 * NOTE: Next.js 15 route handler context uses `Promise` for `params` on dynamic routes.
 * So the signature is:
 *   (req: NextRequest, ctx: { params: Promise<{ id: string }> })
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!IG_USER_ID || !RAW_TOKEN) {
    return new Response(JSON.stringify({
      error: "Missing IG credentials",
      where: "server",
      hint: "Set IG_USER_ID (1784...) and IG_ACCESS_TOKEN (Graph/Page/IG Business token) in .env"
    }), { status: 500, headers: { "content-type": "application/json" } });
  }

  const { id: mediaId } = await ctx.params; // ← v15 requires awaiting params
  if (!mediaId) {
    return new Response(JSON.stringify({ error: "Missing media id" }), {
      status: 400, headers: { "content-type": "application/json" }
    });
  }

  try {
    // 1) fetch a fresh signed url (avoid stale 403s)
    const fields = isBasicDisplay ? "id,media_type,media_url" : "id,media_type,media_url,video_url";
    const n = await igFetch<MediaNode>(`/${mediaId}`, { fields, access_token: RAW_TOKEN });

    if (n.media_type !== "VIDEO") {
      return new Response(JSON.stringify({ error: "Not a video" }), {
        status: 415, headers: { "content-type": "application/json" }
      });
    }
    const src = pickVideoUrl(n);
    if (!src) {
      return new Response(JSON.stringify({ error: "No video url" }), {
        status: 502, headers: { "content-type": "application/json" }
      });
    }

    // 2) proxy with Range support
    const range = req.headers.get("range") ?? undefined;
    const upstream = await fetch(src, {
      headers: range ? { range } : undefined,
      redirect: "follow",
    });

    if (!upstream.ok && upstream.status !== 206) {
      const errTxt = await upstream.text().catch(() => "");
      return new Response(JSON.stringify({
        error: `Upstream ${upstream.status}`,
        where: "instagram-cdn",
        details: errTxt.slice(0, 2000)
      }), {
        status: upstream.status,
        headers: { "content-type": "application/json" }
      });
    }

    const headers = new Headers();
    const copy = (h: string) => {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    };

    copy("content-type");
    copy("content-length");
    copy("content-range");
    copy("accept-ranges");
    copy("etag");
    copy("last-modified");
    headers.set("cache-control", "public, max-age=60, s-maxage=300, stale-while-revalidate=60");
    headers.set("x-proxy", "instagram-video");

    return new Response(upstream.body, {
      status: upstream.status, // 200 or 206
      headers,
    });
  } catch (e: any) {
    if (e instanceof IGApiError) {
      return new Response(JSON.stringify({
        error: e.message,
        where: "instagram",
        details: e.body,
        request_url: e.url,
        token_kind: isBasicDisplay ? "basic-display:IG" : "graph:EAA",
        user_id: IG_USER_ID,
        graph_base: BASE,
        hint:
          "If this says 'Unsupported get request', ensure the media belongs to IG_USER_ID (1784…). " +
          "If your token starts with IG…, switch to a Graph (Page/IG Business) token."
      }), {
        status: e.status || 400,
        headers: { "content-type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      error: String(e?.message || e || "Stream error"),
      where: "server",
      hint: "Check .env and token/permissions."
    }), { status: 500, headers: { "content-type": "application/json" } });
  }
}
