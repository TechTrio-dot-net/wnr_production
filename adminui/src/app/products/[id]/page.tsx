// src/app/products/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getProduct,
  getCategories,
  type Product as ApiProduct,
  type Category,
} from "@/lib/api";
import { toast } from "sonner";
import { IoClose } from "react-icons/io5";
import { logger } from "@/lib/logger";
import imageCompression from "browser-image-compression";

/** Normalize API base; allow fallback to Next.js rewrite (/api) */
const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const API_BASE = RAW_BASE.replace(/\/+$/, "");
const buildUrl = (p: string) => {
  const path = p.startsWith("/") ? p : `/${p}`;
  if (API_BASE) return `${API_BASE}${path}`; // e.g. https://.../api/products
  // Fallback: require a rewrite from /api -> backend in next.config.js
  return `${window.location.origin}/api${path}`;
};

/* ----------------------------- helpers ----------------------------- */

type Status = "active" | "inactive" | "draft";

function extractCategoryId(cat: unknown): string {
  if (!cat) return "";
  if (typeof cat === "string") return cat;
  if (typeof cat === "object" && cat !== null) {
    const c = cat as Record<string, unknown>;
    if (typeof c._id === "string") return c._id;
    if (typeof c.id === "string") return c.id;
    return "";
  }
  return "";
}

function isStatus(v: string): v is Status {
  return v === "active" || v === "inactive" || v === "draft";
}
function toStatus(v: string, fallback: Status = "active"): Status {
  return isStatus(v) ? v : fallback;
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Unexpected error";
  }
}

/** Minimal shapes we need to read hover & optional text (no `any`) */
type HoverLike = { url?: string | null };
type ProductLikeWithHoverAndText = {
  hover?: HoverLike | null;
  hoverImage?: string | null;
  about?: string | null;
  ingredients?: string | null;
  description?: string | null;
  descriptionPoints?: string[] | null;
};
function getHoverUrl(prod: ProductLikeWithHoverAndText | null | undefined): string | undefined {
  if (!prod) return undefined;
  if (prod.hover && typeof prod.hover.url === "string" && prod.hover.url) return prod.hover.url;
  if (typeof prod.hoverImage === "string" && prod.hoverImage) return prod.hoverImage;
  return undefined;
}

/* ----------------------------- component ----------------------------- */

export default function UpsertProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params?.id ?? "";
  const isCreate = !productId || productId === "new";

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FORM FIELDS (primitives)
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [category, setCategory] = useState<string>(""); // must be a category _id
  const [stock, setStock] = useState<number>(0);
  const [status, setStatus] = useState<Status>("active");
  // eshopbox product id
  const [eshopboxProductId, setEshopboxProductId] = useState<string>("");

  // NEW text fields
  const [about, setAbout] = useState<string>("");
  const [ingredients, setIngredients] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  // We edit descriptionPoints as one textarea (one point per line)
  const [descriptionPointsText, setDescriptionPointsText] = useState<string>("");
  // Discount percentage (0-100)
  const [discountPercentage, setDiscountPercentage] = useState<number | undefined>(undefined);
  // Display Order (lower numbers appear first)
  const [displayOrder, setDisplayOrder] = useState<number | undefined>(undefined);

  // Existing images / hover (from server)
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingHoverUrl, setExistingHoverUrl] = useState<string | undefined>(undefined);
  // Track which existing images to remove
  const [removedImageIndices, setRemovedImageIndices] = useState<Set<number>>(new Set());

  // Replacement gallery files (optional)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // Replacement hover file (optional)
  const [hoverFile, setHoverFile] = useState<File | null>(null);

  // Previews for replacement gallery - detect if file is video
  const previews = useMemo(
    () => selectedFiles.map((f) => ({
      url: URL.createObjectURL(f),
      isVideo: f.type.startsWith("video/"),
      name: f.name,
    })),
    [selectedFiles]
  );
  // Preview for replacement hover
  const hoverPreview = useMemo(
    () => (hoverFile ? URL.createObjectURL(hoverFile) : null),
    [hoverFile]
  );

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
      if (hoverPreview) URL.revokeObjectURL(hoverPreview);
    };
  }, [previews, hoverPreview]);

  // Load categories and (if editing) the product
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [cats, prod] = await Promise.all([
          getCategories().catch(() => [] as Category[]),
          isCreate ? Promise.resolve(null) : getProduct(productId),
        ]);

        setCategories(cats);

        if (prod) {
          setProduct(prod);
          setName(prod.name);
          setPrice(prod.price);
          setCategory(extractCategoryId((prod as unknown as { category?: unknown })?.category));
          setStock(prod.stock);
          setStatus(toStatus(prod.status ?? "active"));

          // eshopbox id
          setEshopboxProductId(prod.eshopboxProductId ?? "");

          // Text fields - now properly typed from Product interface
          setAbout(prod.about ?? "");
          setIngredients(prod.ingredients ?? "");
          setDescription(prod.description ?? "");
          setDescriptionPointsText(
            Array.isArray(prod.descriptionPoints) ? prod.descriptionPoints.join("\n") : ""
          );
          setDiscountPercentage(prod.discountPercentage);
          setDisplayOrder(prod.displayOrder);

          // lib/api normalizes images to string[] (your api.ts does this)
          setExistingImages(Array.isArray(prod.images) ? prod.images : []);
          
          // Get hover image from product (it's stored as hoverImage in the Product interface)
          const ptx = prod as unknown as ProductLikeWithHoverAndText;
          setExistingHoverUrl(getHoverUrl(ptx));
        } else {
          // default category to first if available (prevents invalid id)
          setCategory((prev) => prev || (cats[0]?._id ?? ""));
        }
      } catch (e) {
        const msg = errorMessage(e);
        setError("Failed to load data");
        if (!isCreate) toast.error(msg || "Failed to load product.");
      } finally {
        setLoading(false);
      }
    })();
  }, [productId, isCreate]);

  /* ----------------------------- file handlers ----------------------------- */

  async function compressImage(file: File): Promise<File> {
    // Only compress if file is larger than 8MB
    const MAX_SIZE = 8 * 1024 * 1024; // 8MB
    if (file.size <= MAX_SIZE) {
      return file; // No need to compress
    }
    
    // Validate file type before compression
    if (!file.type || !file.type.startsWith("image/")) {
      console.warn("Invalid file type for compression:", file.type);
      return file;
    }
    
    const options = {
      maxSizeMB: 8, // Target 8MB (under Cloudinary's 10MB limit)
      maxWidthOrHeight: 1920, // Max dimension
      useWebWorker: true,
      fileType: file.type,
      preserveExif: false, // Don't preserve EXIF to reduce size
    };
    
    try {
      const compressedBlob = await imageCompression(file, options);
      
      // Validate the compressed blob
      if (!compressedBlob || compressedBlob.size === 0) {
        console.warn("Compression resulted in empty file, using original");
        return file;
      }
      
      // Create a new File object with the correct name and type
      const compressedFile = new File([compressedBlob], file.name, {
        type: file.type,
        lastModified: Date.now(),
      });
      
      // Ensure the file has valid properties
      if (!compressedFile.type || compressedFile.size === 0) {
        console.warn("Compressed file is invalid, using original");
        return file;
      }
      
      return compressedFile;
    } catch (error) {
      console.error("Compression failed:", error);
      // If compression fails, return original file
      return file;
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Filter to only accept images and videos
    const validFiles = Array.from(files).filter((file) => {
      const type = file.type;
      return type.startsWith("image/") || type.startsWith("video/");
    });
    
    if (validFiles.length !== files.length) {
      toast.error("Only images and videos are allowed.");
    }
    
    // Process files: compress images, check video sizes
    const processedFiles: File[] = [];
    
    for (const file of validFiles) {
      if (file.type.startsWith("image/")) {
        // Compress images
        toast.loading(`Compressing ${file.name}...`, { id: `compress-${file.name}` });
        try {
          const compressed = await compressImage(file);
          toast.success(`${file.name} compressed`, { id: `compress-${file.name}` });
          processedFiles.push(compressed);
        } catch {
          toast.error(`Failed to compress ${file.name}`, { id: `compress-${file.name}` });
          // Add original if compression fails
          processedFiles.push(file);
        }
      } else if (file.type.startsWith("video/")) {
        // Check video size (10MB limit for Cloudinary free tier)
        const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_VIDEO_SIZE) {
          toast.warning(`${file.name} is ${(file.size / 1024 / 1024).toFixed(2)}MB. Videos over 10MB may fail to upload. Consider compressing the video first.`);
        }
        processedFiles.push(file);
      }
    }
    
    setSelectedFiles((prev) => {
      const combined = [...prev, ...processedFiles];
      // Limit to 7 total files
      if (combined.length > 7) {
        toast.error("Maximum 7 files allowed. Only the first 7 will be kept.");
        return combined.slice(0, 7);
      }
      return combined;
    });
    
    // Reset input value safely
    if (e.currentTarget) {
      e.currentTarget.value = "";
    }
  }
  function removeSelected(idx: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  }
  function moveSelected(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    setSelectedFiles((prev) => {
      if (j < 0 || j >= prev.length) return prev;
      const clone = [...prev];
      [clone[idx], clone[j]] = [clone[j], clone[idx]];
      return clone;
    });
  }

  async function handleHoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    
    // Compress if it's an image
    let processedFile = f;
    if (f.type.startsWith("image/")) {
      toast.loading(`Compressing hover image...`, { id: "compress-hover" });
      try {
        processedFile = await compressImage(f);
        toast.success("Hover image compressed", { id: "compress-hover" });
      } catch {
        toast.error("Failed to compress hover image", { id: "compress-hover" });
        // Use original if compression fails
      }
    }
    
    if (hoverPreview) URL.revokeObjectURL(hoverPreview);
    setHoverFile(processedFile);
    
    // Reset input value safely
    if (e.currentTarget) {
      e.currentTarget.value = "";
    }
  }
  function clearHoverFile() {
    if (hoverPreview) URL.revokeObjectURL(hoverPreview);
    setHoverFile(null);
  }

  function removeExistingImage(index: number) {
    setRemovedImageIndices((prev) => new Set([...prev, index]));
  }

  function restoreExistingImage(index: number) {
    setRemovedImageIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }

  // Get the images that should be kept (not removed)
  const keptExistingImages = useMemo(() => {
    return existingImages.filter((_, i) => !removedImageIndices.has(i));
  }, [existingImages, removedImageIndices]);

  /* ----------------------------- helpers ----------------------------- */

  async function readError(res: Response): Promise<string> {
    try {
      const text = await res.text();
      try {
        const json = JSON.parse(text) as { error?: string; message?: string };
        return json?.error || json?.message || text || `${res.status}`;
      } catch {
        return text || `${res.status}`;
      }
    } catch {
      return `${res.status}`;
    }
  }

  function linesToPoints(raw: string): string[] {
    // Split on newlines, trim bullets if present, remove empties
    return raw
      .split("\n")
      .map((s) => s.trim().replace(/^•\s*/, ""))
      .filter(Boolean);
  }

  /* ----------------------------- create/update ----------------------------- */

  async function createProductMultipart(): Promise<ApiProduct> {
    if (selectedFiles.length < 3 || selectedFiles.length > 7) {
      throw new Error("Please attach 3–7 images/videos for a new product.");
    }
    const fd = new FormData();
    fd.append("name", name.trim());
    if (eshopboxProductId.trim()) fd.append("eshopboxProductId", eshopboxProductId.trim());
    fd.append("price", String(price));
    fd.append("category", category); // MUST be category _id
    fd.append("stock", String(stock));
    fd.append("status", status);

    // New text fields
    if (about.trim()) fd.append("about", about.trim());
    if (ingredients.trim()) fd.append("ingredients", ingredients.trim());
    if (description.trim()) fd.append("description", description.trim());
    if (discountPercentage !== undefined && discountPercentage > 0) {
      fd.append("discountPercentage", String(discountPercentage));
    }
    if (displayOrder !== undefined && Number.isFinite(displayOrder)) {
      fd.append("displayOrder", String(displayOrder));
    }
    const pts = linesToPoints(descriptionPointsText);
    pts.forEach((p) => fd.append("descriptionPoints", p)); // multiple fields in multipart

    // Files
    selectedFiles.forEach((file) => fd.append("images", file)); // must be 'images'
    if (hoverFile) fd.append("hover", hoverFile);

    const url = buildUrl("/api/products");
    const res = await fetch(url, { method: "POST", body: fd });
    if (!res.ok) throw new Error(await readError(res));
    return (await res.json()) as ApiProduct;
  }

  async function updateProductSmart(): Promise<ApiProduct> {
    const hasRemovedImages = removedImageIndices.size > 0;
    const hasNewFiles = selectedFiles.length > 0 || !!hoverFile;
    
    // Calculate total final image count (kept existing + new files)
    const totalFinalCount = keptExistingImages.length + selectedFiles.length;
    
    // Validate total count only if we're modifying images
    if (hasRemovedImages || hasNewFiles) {
      if (totalFinalCount < 3 || totalFinalCount > 7) {
        throw new Error(`You need 3–7 images/videos total. Currently: ${keptExistingImages.length} kept + ${selectedFiles.length} new = ${totalFinalCount}. Please adjust.`);
      }
    }

    const needsMultipart = hasNewFiles || hasRemovedImages;

    if (needsMultipart) {
      // Validate total count (kept + new) is 3-7
      if (totalFinalCount < 3 || totalFinalCount > 7) {
        throw new Error(`Total images/videos must be 3–7. Currently: ${totalFinalCount} (${keptExistingImages.length} kept + ${selectedFiles.length} new).`);
      }
      
      const fd = new FormData();
      fd.append("name", name.trim());
      if (eshopboxProductId.trim()) fd.append("eshopboxProductId", eshopboxProductId.trim());
      fd.append("price", String(price));
      fd.append("category", category); // keep as id
      fd.append("stock", String(Math.floor(Number(stock))));
      fd.append("status", status);

      // New text fields
      fd.append("about", about.trim());
      fd.append("ingredients", ingredients.trim());
      fd.append("description", description.trim());
      if (discountPercentage !== undefined && discountPercentage > 0) {
        fd.append("discountPercentage", String(discountPercentage));
      }
      if (displayOrder !== undefined && Number.isFinite(displayOrder)) {
        fd.append("displayOrder", String(displayOrder));
      }
      const pts = linesToPoints(descriptionPointsText);
      // If user cleared them, still send empty to overwrite
      if (pts.length === 0) {
        fd.append("descriptionPoints", ""); // will coerce to []
      } else {
        pts.forEach((p) => fd.append("descriptionPoints", p));
      }

      // If removing images without adding new ones, send the kept image URLs
      if (hasRemovedImages && selectedFiles.length === 0) {
        keptExistingImages.forEach((url) => {
          fd.append("keepImages", url); // Send URLs of images to keep
        });
      }

      // Files - append all selected files (images and videos) as "images"
      selectedFiles.forEach((file) => fd.append("images", file));
      if (hoverFile) fd.append("hover", hoverFile);

      const url = buildUrl(`/api/products/${productId}`);
      const res = await fetch(url, { method: "PUT", body: fd });
      if (!res.ok) throw new Error(await readError(res));
      return (await res.json()) as ApiProduct;
    }

    // No files — use JSON (category as id string, descriptionPoints as string[])
    const url = buildUrl(`/api/products/${productId}`);
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eshopboxProductId: eshopboxProductId.trim(),
        name: name.trim(),
        price: Number(price),
        category, // id string
        stock: Math.floor(Number(stock)),
        status,
        about: about.trim(),
        ingredients: ingredients.trim(),
        description: description.trim(),
        descriptionPoints: linesToPoints(descriptionPointsText),
        ...(discountPercentage !== undefined && discountPercentage > 0 ? { discountPercentage } : {}),
        ...(displayOrder !== undefined && Number.isFinite(displayOrder) ? { displayOrder } : {}),
      }),
    });
    if (!res.ok) throw new Error(await readError(res));
    return (await res.json()) as ApiProduct;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      logger.warn(isCreate ? "product_create" : "product_update", "Validation failed: Product name is required");
      return toast.error("Product name is required.");
    }
    if (!category) {
      logger.warn(isCreate ? "product_create" : "product_update", "Validation failed: Category is required");
      return toast.error("Please select a category.");
    }
    if (!eshopboxProductId.trim()) {
      logger.warn(isCreate ? "product_create" : "product_update", "Validation failed: Eshopbox Product ID is required");
      return toast.error("Eshopbox Product ID is required.");
    }
    if (price < 0) {
      logger.warn(isCreate ? "product_create" : "product_update", "Validation failed: Price must be ≥ 0");
      return toast.error("Price must be ≥ 0.");
    }
    const stockNum = Number(stock);
    if (isNaN(stockNum) || !Number.isInteger(stockNum) || stockNum < 0) {
      logger.warn(isCreate ? "product_create" : "product_update", "Validation failed: Stock must be a non-negative integer");
      return toast.error("Stock must be a non-negative integer.");
    }

    // Guard: tell the dev if API base is missing and no rewrite fallback probable
    if (!API_BASE && !window?.location?.origin) {
      toast.error("API base is not configured.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isCreate) {
        const createdPromise = createProductMultipart();
        await toast.promise(createdPromise, {
          loading: "Creating product…",
          success: "Product created.",
          error: (err) => errorMessage(err) || "Failed to create product.",
        });
        // Log successful creation
        const product = await createdPromise;
        if (product) {
          const productId = product.id || "";
          logger.success("product_create", `Product "${name}" created successfully`, {
            resourceType: "product",
            resourceId: productId,
            metadata: { name, price, stock, category, eshopboxProductId },
          });
        }
      } else {
        const updatedPromise = updateProductSmart();
        await toast.promise(updatedPromise, {
          loading: "Saving changes…",
          success: "Product updated.",
          error: (err) => errorMessage(err) || "Failed to update product.",
        });
        // Log successful update
        const updated = await updatedPromise;
        if (updated) {
          logger.success("product_update", `Product "${name}" updated successfully`, {
            resourceType: "product",
            resourceId: productId,
            metadata: {
              name,
              price,
              stock,
              category,
              eshopboxProductId,
              imagesRemoved: removedImageIndices.size,
              imagesAdded: selectedFiles.length,
            },
          });
        }
      }
      router.push("/products");
    } catch (e) {
      console.error(e);
      const errMsg = errorMessage(e) || "Save failed";
      setError(errMsg);
      toast.error(errMsg);
      // Log error
      logger.error(isCreate ? "product_create" : "product_update", errMsg, {
        resourceType: "product",
        resourceId: isCreate ? undefined : productId,
        metadata: { error: errMsg, name, price, stock },
      });
    } finally {
      setSaving(false);
    }
  }

  /* ----------------------------- render ----------------------------- */

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-6" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error && !isCreate && !product) {
    return (
      <div className="p-6">
        <div className="text-center space-y-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => router.push("/products")}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {isCreate ? "Add Product" : "Edit Product"}
        </h1>
        <button
          onClick={() => router.push("/products")}
          className="px-4 py-2 rounded-lg bg-muted text-foreground border border-border hover:bg-muted/80 transition"
        >
          Back to Products
        </button>
      </div>

      <div className="bg-card text-card-foreground shadow rounded-lg p-6 border border-border">
        {error && (
          <div className="mb-4 p-4 rounded-md border border-red-500/20 bg-red-500/10">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Product Metadata - Read Only */}
        {!isCreate && product && (
          <div className="mb-6 p-4 rounded-md border border-border bg-muted/30">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Product Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Product ID:</span>
                <span className="ml-2 font-mono text-xs">{product.id}</span>
              </div>
              {product.createdAt && (
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <span className="ml-2">
                    {new Date(product.createdAt).toLocaleString()}
                  </span>
                </div>
              )}
              {product.updatedAt && (
                <div>
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="ml-2">
                    {new Date(product.updatedAt).toLocaleString()}
                  </span>
                </div>
              )}
              {product.eshopboxProductId && (
                <div>
                  <span className="text-muted-foreground">Eshopbox ID:</span>
                  <span className="ml-2 font-mono">{product.eshopboxProductId}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Top grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Product Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            {/* Eshopbox ID */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Eshopbox Product ID
              </label>
              <input
                type="text"
                value={eshopboxProductId}
                onChange={(e) => setEshopboxProductId(e.target.value)}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. EB-12345"
                required
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Price (₹)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                min={0}
                step={0.01}
                required
              />
            </div>

            {/* Discount Percentage */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Discount Percentage (%)
              </label>
              <input
                type="number"
                value={discountPercentage ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? undefined : Number(e.target.value);
                  if (val === undefined || (val >= 0 && val <= 100)) {
                    setDiscountPercentage(val);
                  }
                }}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                min={0}
                max={100}
                step={1}
                placeholder="e.g., 10 for 10% off"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional: Enter a discount percentage (0-100). A badge will be shown on the product.
              </p>
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Display Order
              </label>
              <input
                type="number"
                value={displayOrder ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? undefined : Number(e.target.value);
                  if (val === undefined || Number.isFinite(val)) {
                    setDisplayOrder(val);
                  }
                }}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                min={0}
                step={1}
                placeholder="e.g., 1, 2, 3... (lower numbers appear first)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional: Lower numbers appear first in product listings. Leave empty for auto-assignment (appears last).
              </p>
            </div>

            {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Category
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const fresh = await getCategories();
                      setCategories(fresh);
                      // If current selected category no longer exists, set a safe default
                      if (!fresh.find((c) => c._id === category) && fresh[0]?._id) {
                        setCategory(fresh[0]._id);
                      }
                      toast.success("Categories refreshed");
                    } catch (e) {
                      toast.error(errorMessage(e) || "Failed to refresh categories");
                    }
                  }}
                  className="text-xs px-2 py-1 rounded border border-border bg-muted hover:bg-muted/80"
                  title="Reload categories"
                >
                  Reload
                </button>
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                required
                disabled={!categories.length}
              >
                <option value="" disabled>
                  {categories.length ? "Select a category" : "No categories found"}
                </option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Saved as the category <em>id</em> behind the scenes to keep the API valid.
              </p>
            </div>

            {/* Stock */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Stock Quantity
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || val === null || val === undefined) {
                    setStock(0);
                  } else {
                    const num = Number(val);
                    if (!isNaN(num) && num >= 0) {
                      setStock(num);
                    }
                  }
                }}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                min={0}
                required
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(toStatus(e.target.value, status))}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Text sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* About */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                About (optional)
              </label>
              <textarea
                rows={4}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Short paragraph about the product…"
              />
            </div>

            {/* Ingredients */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Ingredients (optional)
              </label>
              <textarea
                rows={4}
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="List the ingredients…"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Product Description (optional)
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Longer description…"
              />
            </div>

            {/* Description Points */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Description Points (one per line)
              </label>
              <textarea
                rows={5}
                value={descriptionPointsText}
                onChange={(e) => setDescriptionPointsText(e.target.value)}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={`• first point\n• second point\n• third point`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                We’ll save these as an array of bullet points.
              </p>
            </div>
          </div>

          {/* Existing Gallery */}
          {!isCreate && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Current Gallery {removedImageIndices.size > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({removedImageIndices.size} marked for removal)
                  </span>
                )}
              </label>
              {existingImages.length > 0 ? (
                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {existingImages.map((src, i) => {
                    const isRemoved = removedImageIndices.has(i);
                    const position = i + 1;
                    const isVideo = src.includes(".mp4") || src.includes(".webm") || src.includes(".mov");
                    return (
                      <li
                        key={`existing-${i}`}
                        className={`relative border rounded-lg overflow-hidden ${
                          isRemoved ? "opacity-50 border-red-500" : "border-border"
                        }`}
                      >
                        {/* Position number badge */}
                        <div className="absolute top-1 left-1 z-10 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                          {position}{position === 1 ? "st" : position === 2 ? "nd" : position === 3 ? "rd" : "th"}
                        </div>
                        {isVideo ? (
                          <video src={src} className="w-full h-28 object-cover" muted />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={src} alt={`existing-${i}`} className="w-full h-28 object-cover" />
                        )}
                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isRemoved) {
                              restoreExistingImage(i);
                            } else {
                              removeExistingImage(i);
                            }
                          }}
                          className={`absolute top-1 right-1 z-10 flex items-center justify-center w-7 h-7 rounded-full transition ${
                            isRemoved
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : "bg-red-600 hover:bg-red-700 text-white"
                          }`}
                          title={isRemoved ? "Restore" : "Remove"}
                        >
                          {isRemoved ? (
                            <span className="text-xs font-bold">↺</span>
                          ) : (
                            <IoClose className="w-4 h-4" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No images/videos found.</p>
              )}
            </div>
          )}

          {/* Replace Gallery */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {isCreate
                ? "Upload Gallery Images/Videos (3–7 required)"
                : `Add New Images/Videos (${keptExistingImages.length} kept, need ${Math.max(0, 3 - keptExistingImages.length)}–${Math.max(0, 7 - keptExistingImages.length)} more for 3–7 total)`}
            </label>

            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Accepted: Images (jpg, png, etc.) and Videos (mp4, webm, mov, etc.)
            </p>

            {previews.length > 0 && (
              <>
                <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {previews.map((preview, i) => {
                    const position = keptExistingImages.length + i + 1;
                    return (
                      <li
                        key={`${preview.url}-${i}`}
                        className="relative border border-border rounded-lg overflow-hidden"
                      >
                        {/* Position number badge */}
                        <div className="absolute top-1 left-1 z-10 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                          {position}{position === 1 ? "st" : position === 2 ? "nd" : position === 3 ? "rd" : "th"}
                        </div>
                        {preview.isVideo ? (
                          <video src={preview.url} className="w-full h-28 object-cover" muted />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={preview.url} alt={`preview-${i}`} className="w-full h-28 object-cover" />
                        )}
                        <div className="absolute top-1 right-1 flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveSelected(i, -1)}
                            className="px-2 py-1 text-xs rounded bg-muted/80 border border-border hover:bg-muted"
                            title="Move left"
                            disabled={i === 0}
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSelected(i, 1)}
                            className="px-2 py-1 text-xs rounded bg-muted/80 border border-border hover:bg-muted"
                            title="Move right"
                            disabled={i === previews.length - 1}
                          >
                            →
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSelected(i)}
                            className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                        {/* File type indicator */}
                        <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                          {preview.isVideo ? "VIDEO" : "IMAGE"}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedFiles.length} new file(s) selected • Total: {keptExistingImages.length + selectedFiles.length} / 3–7 required
                </p>
              </>
            )}
          </div>

          {/* Hover Image (current + replace) */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Hover Image {isCreate ? "(optional)" : "(optional; replaces current if provided)"}
            </label>

            {/* Current hover */}
            {!isCreate && existingHoverUrl && !hoverPreview && (
              <div className="mb-2">
                <p className="text-xs text-muted-foreground mb-1">Current</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={existingHoverUrl}
                  alt="current-hover"
                  className="h-28 w-28 object-cover rounded-md border"
                />
              </div>
            )}

            {/* Replacement picker */}
            <input
              type="file"
              accept="image/*"
              onChange={handleHoverChange}
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {/* Replacement preview */}
            {hoverPreview && (
              <div className="mt-3 relative inline-block border border-border rounded-md overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hoverPreview} alt="hover-preview" className="h-28 w-28 object-cover" />
                <button
                  type="button"
                  onClick={clearHoverFile}
                  className="absolute top-1 right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/products")}
              className="px-6 py-2 rounded bg-muted text-foreground border border-border hover:bg-muted/80 transition"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="px-6 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
              disabled={saving}
            >
              {saving
                ? isCreate
                  ? "Creating..."
                  : "Saving..."
                : isCreate
                  ? "Create"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
