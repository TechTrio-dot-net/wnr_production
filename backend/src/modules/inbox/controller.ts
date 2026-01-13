// src/modules/inbox/controller.ts
import { Request, Response } from "express";
import {
  createContactMessage,
  listContactMessages,
  updateContactMessage,
} from "./service";
import type { ContactCreateInput, ReasonOption } from "./types";

/** POST /api/contact — create from public form */
export async function postContact(req: Request, res: Response) {
  try {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      undefined;

    const ua = req.headers["user-agent"] as string | undefined;
    const ref = req.headers["referer"] as string | undefined;

    // Build meta only with defined keys (avoid passing `meta: undefined`)
    const meta = (() => {
      const m: NonNullable<ContactCreateInput["meta"]> = {};
      if (ua) m.userAgent = ua;
      if (ref) m.referer = ref;
      if (ip) m.ip = ip;
      return Object.keys(m).length ? m : undefined;
    })();

    const base = {
      name: req.body?.name as string,
      email: req.body?.email as string,
      phone: (req.body?.phone ?? null) as string | null,
      subject: (req.body?.subject ?? null) as string | null,
      message: req.body?.message as string,
      reason: req.body?.reason as ReasonOption,
      interests: Array.isArray(req.body?.interests)
        ? (req.body.interests as string[])
        : typeof req.body?.interests === "string"
        ? (req.body.interests as string)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    } satisfies Omit<ContactCreateInput, "meta"> & { meta?: ContactCreateInput["meta"] };

    const payload: ContactCreateInput = {
      ...base,
      ...(meta ? { meta } : {}), // only include when defined
    };

    const result = await createContactMessage(payload);

    if (!result.ok) {
      if (result.error === "ValidationError") {
        return res
          .status(400)
          .json({ ok: false, error: "ValidationError", fields: result.fields });
      }
      return res.status(400).json({ ok: false, error: "BadRequest" });
    }

    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ ok: false, error: "ServerError" });
  }
}

/** GET /api/contact — list for admin inbox */
export async function getContactList(req: Request, res: Response) {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const q = typeof req.query.q === "string" && req.query.q.trim() ? req.query.q : undefined;
    const reason = typeof req.query.reason === "string" ? req.query.reason : undefined;
    const status =
      typeof req.query.status === "string"
        ? (req.query.status as "open" | "confirmed" | "resolved" | "archived" | "all")
        : undefined;

    // With exactOptionalPropertyTypes, do NOT pass keys with `undefined`.
    const opts: {
      page: number;
      pageSize: number;
      q?: string;
      reason?: string;
      status?: "open" | "confirmed" | "resolved" | "archived" | "all";
    } = { page, pageSize };

    if (q !== undefined) opts.q = q;
    if (reason !== undefined) opts.reason = reason;
    if (status !== undefined) opts.status = status;

    const data = await listContactMessages(opts);
    return res.status(200).json(data);
  } catch {
    return res.status(500).json({ ok: false, error: "ServerError" });
  }
}

/** PATCH /api/contact/:id — confirm/resolve/archive + note */
export async function patchContact(req: Request, res: Response) {
  try {
    const idParam = req.params?.id;
    if (!idParam) {
      return res.status(400).json({ ok: false, error: "BadRequest" });
    }
    const id = String(idParam); // ensure it's a definite string

    const { status, internalNote, confirm } = (req.body ?? {}) as {
      status?: "open" | "confirmed" | "resolved" | "archived";
      internalNote?: string;
      confirm?: boolean;
    };

    const data = await updateContactMessage(id, {
      ...(status ? { status } : {}),
      ...(typeof internalNote === "string" ? { internalNote } : {}),
      ...(confirm === true ? { confirm: true } : {}),
    });

    if (!data.ok) {
      if (data.error === "NotFound") return res.status(404).json({ ok: false, error: "NotFound" });
      return res.status(400).json({ ok: false, error: "BadRequest" });
    }

    return res.status(200).json(data);
  } catch {
    return res.status(500).json({ ok: false, error: "ServerError" });
  }
}
