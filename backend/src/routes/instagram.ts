// src/routes/instagram.ts
import { Router, Request, Response } from "express";

const router = Router();

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

class IGApiError extends Error {
  status: number;
  body?: any;
  url?: string;
  constructor(status: number, message: string, extra?: { body?: any; url?: string }) {
    super(message);
    this.status = status;
    if (extra?.body !== undefined) this.body = extra.body;
    if (extra?.url !== undefined) this.url = extra.url;
  }
}

async function igFetch<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, { cache: "no-store" });
  const txt = await res.text();
  let json: any;
  try {
    json = txt ? JSON.parse(txt) : {};
  } catch {
    json = { raw: txt };
  }
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || "Instagram API error";
    return Promise.reject(new IGApiError(res.status, msg, { body: json, url: `${BASE}${path}?${qs}` }));
  }
  return json as T;
}

function pickVideoUrl(n: MediaNode): string | undefined {
  return n.video_url || n.media_url || undefined;
}

/**
 * GET /api/instagram/stream/:id
 * 
 * Proxies Instagram video streaming through backend to avoid CORS and expired URLs.
 * Fetches fresh signed URLs from Instagram Graph API and streams the video.
 * 
 * Requires env vars:
 * - IG_USER_ID: Instagram Business Account ID (e.g., 17841...)
 * - IG_ACCESS_TOKEN: Facebook Page Access Token or Graph API token
 * - IG_GRAPH_VERSION: Optional, defaults to v21.0
 */
router.get("/stream/:id", async (req: Request<{ id: string }>, res: Response) => {
  if (!IG_USER_ID || !RAW_TOKEN) {
    return res.status(500).json({
      error: "Missing IG credentials",
      where: "server",
      hint: "Set IG_USER_ID (1784...) and IG_ACCESS_TOKEN (Graph/Page/IG Business token) in .env",
    });
  }

  const mediaId = req.params.id;
  if (!mediaId) {
    return res.status(400).json({ error: "Missing media id" });
  }

  try {
    // 1) Fetch a fresh signed URL from Instagram Graph API (avoids stale 403s)
    const fields = isBasicDisplay ? "id,media_type,media_url" : "id,media_type,media_url,video_url";
    const n = await igFetch<MediaNode>(`/${mediaId}`, { fields, access_token: RAW_TOKEN });

    if (n.media_type !== "VIDEO") {
      return res.status(415).json({ error: "Not a video" });
    }

    const src = pickVideoUrl(n);
    if (!src) {
      return res.status(502).json({ error: "No video url" });
    }

    // 2) Proxy the video with Range support (for video seeking)
    const range = req.headers.range;
    const fetchOptions: RequestInit = {
      redirect: "follow",
    };
    if (range) {
      fetchOptions.headers = { range };
    }
    const upstreamRes = await fetch(src, fetchOptions);

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      const errTxt = await upstreamRes.text().catch(() => "");
      return res.status(upstreamRes.status).json({
        error: `Upstream ${upstreamRes.status}`,
        where: "instagram-cdn",
        details: errTxt.slice(0, 2000),
      });
    }

    // 3) Copy headers from Instagram CDN response
    const copyHeader = (name: string) => {
      const value = upstreamRes.headers.get(name);
      if (value) res.setHeader(name, value);
    };

    copyHeader("content-type");
    copyHeader("content-length");
    copyHeader("content-range");
    copyHeader("accept-ranges");
    copyHeader("etag");
    copyHeader("last-modified");

    // Set caching headers
    res.setHeader("cache-control", "public, max-age=60, s-maxage=300, stale-while-revalidate=60");
    res.setHeader("x-proxy", "instagram-video");

    // Stream the video body using Express response
    res.status(upstreamRes.status); // 200 or 206 for partial content

    // Stream chunks from fetch response to Express response
    if (!upstreamRes.body) {
      return res.status(502).json({ error: "No response body from Instagram" });
    }

    try {
      const reader = upstreamRes.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            res.write(Buffer.from(value));
          }
        } catch (err: any) {
          if (!res.headersSent) {
            res.status(500).json({ error: "Stream error", details: err?.message });
          } else {
            res.end();
          }
        }
      };
      pump();
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to start stream", details: err?.message });
      }
    }
  } catch (e: any) {
    if (e instanceof IGApiError) {
      return res.status(e.status || 400).json({
        error: e.message,
        where: "instagram",
        details: e.body,
        request_url: e.url,
        token_kind: isBasicDisplay ? "basic-display:IG" : "graph:EAA",
        user_id: IG_USER_ID,
        graph_base: BASE,
        hint:
          "If this says 'Unsupported get request', ensure the media belongs to IG_USER_ID (1784…). " +
          "If your token starts with IG…, switch to a Graph (Page/IG Business) token.",
      });
    }
    return res.status(500).json({
      error: String(e?.message || e || "Stream error"),
      where: "server",
      hint: "Check .env and token/permissions.",
    });
  }
});

export default router;

