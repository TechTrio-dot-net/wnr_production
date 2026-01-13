// src/modules/inbox/service.ts
import { z } from "zod";
import crypto from "crypto";
import { ContactMessage } from "./model";
import type { ContactCreateInput } from "./types";

/* ========================== Validation ========================== */
export const contactCreateSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(190),
  phone: z.string().trim().min(5).max(30).optional().nullable(),
  subject: z.string().trim().max(200).optional().nullable(),
  message: z.string().min(10).max(1000),
  reason: z.enum([
    "Orders",
    "Product question",
    "Gifting / Corporate",
    "Collabs / Events",
    "Feedback",
  ]),
  interests: z.array(z.string()).max(12).optional(),
  meta: z
    .object({
      userAgent: z.string().optional(),
      referer: z.string().optional(),
      ip: z.string().optional(),
    })
    .optional(),
});

/* ============================ Utils ============================ */
function stripTags(s: string | null | undefined) {
  if (!s) return s ?? "";
  return s.replace(/<\/?[^>]+(>|$)/g, "");
}

function hashMessage(email: string, message: string) {
  return crypto.createHash("sha256").update(`${email}::${message}`).digest("hex");
}

/* ============================ Create =========================== */
export async function createContactMessage(input: ContactCreateInput) {
  const parsed = contactCreateSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    parsed.error.issues.forEach((i) => {
      const key = i.path.join(".") || "root";
      fields[key] = i.message;
    });
    return { ok: false as const, error: "ValidationError" as const, fields };
  }

  const v = parsed.data;
  const clean = {
    name: stripTags(v.name).trim(),
    email: v.email.toLowerCase().trim(),
    phone: v.phone ? stripTags(v.phone).trim() : null,
    subject: v.subject ? stripTags(v.subject).trim() : null,
    message: stripTags(v.message).trim(),
    reason: v.reason,
    interests: Array.isArray(v.interests) ? v.interests.slice(0, 12) : [],
    meta: {
      userAgent: v.meta?.userAgent,
      referer: v.meta?.referer,
      ip: v.meta?.ip,
    },
  };

  const messageHash = hashMessage(clean.email, clean.message);
  const doc = await ContactMessage.create({ ...clean, messageHash });
  return { ok: true as const, id: String(doc._id), status: "stored" as const };
}

/* ============================ List ============================= */
export async function listContactMessages(options: {
  page: number;
  pageSize: number;
  q?: string;
  reason?: string;
  status?: "open" | "confirmed" | "resolved" | "archived" | "all";
}) {
  const page = Math.max(1, Number(options.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize || 20)));

  const filter: Record<string, any> = {};

  // Text search (only if q is a non-empty string)
  if (typeof options.q === "string" && options.q.trim() !== "") {
    const q = options.q.trim();
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { subject: rx }, { message: rx }];
  }

  if (typeof options.reason === "string" && options.reason) {
    filter.reason = options.reason;
  }

  // Map UI status → model status (only when provided and not "all")
  if (typeof options.status === "string" && options.status !== "all") {
    const map: Record<"open" | "confirmed" | "resolved" | "archived", "new" | "seen" | "replied" | "archived"> = {
      open: "new",
      confirmed: "seen",
      resolved: "replied",
      archived: "archived",
    };
    const s = options.status as "open" | "confirmed" | "resolved" | "archived";
    filter.status = map[s];
  }

  const [items, total] = await Promise.all([
    (await ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()) as any[],
    ContactMessage.countDocuments(filter),
  ]);

  // Model → UI status
  const toUiStatus = (s: string): "open" | "confirmed" | "resolved" | "archived" => {
    if (s === "seen") return "confirmed";
    if (s === "replied") return "resolved";
    if (s === "archived") return "archived";
    return "open";
  };

  const shaped = items.map((d) => {
    // createdAt
    const createdAtIso: string =
      typeof d.createdAt === "string"
        ? d.createdAt
        : d.createdAt
        ? new Date(d.createdAt as Date | string | number).toISOString()
        : new Date().toISOString();

    // updatedAt
    const updatedAtIso: string =
      typeof d.updatedAt === "string"
        ? d.updatedAt
        : d.updatedAt
        ? new Date(d.updatedAt as Date | string | number).toISOString()
        : createdAtIso;

    // confirmedAt (optional)
    const confirmedAtIso: string | undefined = d.confirmedAt
      ? new Date(d.confirmedAt as Date | string | number).toISOString()
      : undefined;

    return {
      _id: String(d._id),
      name: d.name as string,
      email: d.email as string,
      phone: (d.phone ?? null) as string | null,
      subject: (d.subject ?? null) as string | null,
      message: d.message as string,
      reason: d.reason as any,
      interests: Array.isArray(d.interests) ? (d.interests as string[]) : [],
      status: toUiStatus(String(d.status)),
      meta: d.meta || {},
      createdAt: createdAtIso,
      updatedAt: updatedAtIso,
      confirmedAt: confirmedAtIso,
    };
  });

  return { ok: true as const, items: shaped, total, page, pageSize };
}

/* ============================ Update =========================== */
export async function updateContactMessage(
  id: string,
  input: {
    status?: "open" | "confirmed" | "resolved" | "archived";
    internalNote?: string;
    confirm?: boolean;
  }
) {
  // UI → model status
  const toModelStatus = (
    s: "open" | "confirmed" | "resolved" | "archived"
  ): "new" | "seen" | "replied" | "archived" => {
    if (s === "confirmed") return "seen";
    if (s === "resolved") return "replied";
    if (s === "archived") return "archived";
    return "new";
  };

  const update: Record<string, any> = {};

  if (typeof input.status === "string") {
    update.status = toModelStatus(input.status);
  }

  if (typeof input.internalNote === "string") {
    const trimmed = input.internalNote.trim();
    update.internalNote = trimmed.length ? trimmed : null;
  }

  // If confirm=true or status moves to "confirmed", set confirmedAt
  if (input.confirm === true || input.status === "confirmed") {
    update.confirmedAt = new Date();
    // If no explicit status provided, ensure it's at least "seen"
    if (typeof input.status !== "string") {
      update.status = "seen";
    }
  }

  const doc = await ContactMessage.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();

  if (!doc) return { ok: false as const, error: "NotFound" as const };

  // Model → UI
  const toUiStatus = (s: string): "open" | "confirmed" | "resolved" | "archived" => {
    if (s === "seen") return "confirmed";
    if (s === "replied") return "resolved";
    if (s === "archived") return "archived";
    return "open";
  };

  const shaped = {
    _id: String((doc as any)._id),
    name: (doc as any).name as string,
    email: (doc as any).email as string,
    phone: ((doc as any).phone ?? null) as string | null,
    subject: ((doc as any).subject ?? null) as string | null,
    message: (doc as any).message as string,
    reason: (doc as any).reason as any,
    interests: Array.isArray((doc as any).interests) ? ((doc as any).interests as string[]) : [],
    status: toUiStatus(String((doc as any).status)),
    meta: (doc as any).meta || {},
    createdAt:
      typeof (doc as any).createdAt === "string"
        ? (doc as any).createdAt
        : (doc as any).createdAt
        ? new Date((doc as any).createdAt as Date | string | number).toISOString()
        : new Date().toISOString(),
    updatedAt:
      typeof (doc as any).updatedAt === "string"
        ? (doc as any).updatedAt
        : (doc as any).updatedAt
        ? new Date((doc as any).updatedAt as Date | string | number).toISOString()
        : new Date().toISOString(),
    confirmedAt: (doc as any).confirmedAt
      ? new Date((doc as any).confirmedAt as Date | string | number).toISOString()
      : undefined,
  };

  return { ok: true as const, item: shaped };
}
