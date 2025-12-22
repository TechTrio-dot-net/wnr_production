// src/lib/cloudinary.ts
import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from "cloudinary";

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER,
} = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  throw new Error(
    "Cloudinary env missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
  );
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

export type CloudinaryUpload = {
  url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
};

export function uploadBufferToCloudinary(
  buffer: Buffer,
  options: UploadApiOptions = {}
): Promise<UploadApiResponse> {
  const opts: UploadApiOptions = {
    folder: CLOUDINARY_FOLDER || "uploads",
    resource_type: "image",
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    ...options,
  };

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(opts, (err, result) => {
      if (err || !result) return reject(err || new Error("Upload failed"));
      resolve(result);
    });
    stream.end(buffer);
  });
}

export async function destroyCloudinaryPublicId(publicId: string) {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
}

/* =========================
   NEW: Utilities & Helpers
   ========================= */

/** Extract mime/base64 from a data URL with strict guards */
export function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  // e.g. data:image/png;base64,iVBORw0KGgoAAA...
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  const base64 = match[2];
  if (!mime || !base64) return null; // ensure both are defined strings
  return { mime, base64 };
}

/** Convert a base64 data URL to a Node Buffer */
export function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  try {
    return Buffer.from(parsed.base64, "base64");
  } catch {
    return null;
  }
}

/** Type-predicate: http/https URL */
export function isHttpUrl(s: string | null | undefined): s is string {
  return typeof s === "string" && /^https?:\/\//i.test(s);
}

/** Type-predicate: data URL */
export function isDataUrl(s: string | null | undefined): s is string {
  return typeof s === "string" && /^data:/i.test(s);
}

/**
 * Upload a data URL (base64) to Cloudinary.
 * Returns CloudinaryUpload with strict string fields.
 */
export async function uploadDataUrlToCloudinary(
  dataUrl: string,
  options: UploadApiOptions = {}
): Promise<CloudinaryUpload> {
  const buffer = dataUrlToBuffer(dataUrl);
  if (!buffer) throw new Error("Invalid data URL for image upload.");

  const result = await uploadBufferToCloudinary(buffer, options);

  const urlCandidate = result.secure_url ?? result.url;
  if (typeof urlCandidate !== "string" || urlCandidate.length === 0) {
    throw new Error("Cloudinary did not return a URL for the uploaded image.");
  }
  const ensuredUrl: string = urlCandidate;

  const publicIdCandidate = result.public_id;
  if (typeof publicIdCandidate !== "string" || publicIdCandidate.length === 0) {
    throw new Error("Cloudinary did not return a public_id for the uploaded image.");
  }
  const ensuredPublicId: string = publicIdCandidate;

  return {
    url: ensuredUrl,
    public_id: ensuredPublicId,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

/**
 * OPTIONAL: Upload a remote image URL directly (Cloudinary fetch).
 */
export async function uploadRemoteUrlToCloudinary(
  url: string,
  options: UploadApiOptions = {}
): Promise<CloudinaryUpload> {
  const opts: UploadApiOptions = {
    folder: CLOUDINARY_FOLDER || "uploads",
    resource_type: "image",
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    ...options,
  };

  const result = await cloudinary.uploader.upload(url, opts);

  const finalUrlCandidate = result.secure_url ?? result.url;
  if (typeof finalUrlCandidate !== "string" || finalUrlCandidate.length === 0) {
    throw new Error("Cloudinary did not return a URL for the uploaded image.");
  }
  const finalUrl: string = finalUrlCandidate;

  const publicIdCandidate = result.public_id;
  if (typeof publicIdCandidate !== "string" || publicIdCandidate.length === 0) {
    throw new Error("Cloudinary did not return a public_id for the uploaded image.");
  }
  const ensuredPublicId: string = publicIdCandidate;

  return {
    url: finalUrl,
    public_id: ensuredPublicId,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

/**
 * Extract Cloudinary public_id from a Cloudinary URL (best-effort).
 */
export function getPublicIdFromCloudinaryUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const uploadIdx = parts.findIndex((p) => p === "upload");
    if (uploadIdx === -1) return null;

    const afterUpload = parts.slice(uploadIdx + 1);
    if (afterUpload.length === 0) return null; // guard

    const first = afterUpload[0] ?? "";
    const rest = /^\bv\d+/.test(first) ? afterUpload.slice(1) : afterUpload;
    if (!rest.length) return null;

    const publicIdWithExt = rest.join("/");
    const dot = publicIdWithExt.lastIndexOf(".");
    return dot > 0 ? publicIdWithExt.slice(0, dot) : publicIdWithExt;
  } catch {
    return null;
  }
}

/**
 * High-level helper for services:
 * - data URL → upload, return hosted URL
 * - http(s) URL → return as-is (or switch to forced-hosting if you prefer)
 * - anything else → return unchanged
 */
export async function maybeUploadImage(
  image?: string | null,
  options: UploadApiOptions = {}
): Promise<string | null | undefined> {
  if (!image) return image;

  if (isDataUrl(image)) {
    const uploaded = await uploadDataUrlToCloudinary(image, options);
    return uploaded.url;
  }

  if (isHttpUrl(image)) {
    // To enforce hosting:
    // const uploaded = await uploadRemoteUrlToCloudinary(image, options);
    // return uploaded.url;
    return image;
  }

  return image;
}
