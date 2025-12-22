import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Product, ProductDoc, ImageInfo } from "./product.model";
import { Category } from "../categories/category.model";
import {
  destroyCloudinaryPublicId,
  uploadBufferToCloudinary,
} from "../../../lib/cloudinary";

/* ------------------------- helpers ------------------------- */

function toPoints(input: unknown): string[] | undefined {
  // Accept: array, single string, or newline-separated block (frontend sends multiple fields)
  if (Array.isArray(input)) {
    return input.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    // If it came as multiple fields but framework merged -> comma-separated; also support newlines
    const raw = input.includes("\n") ? input.split("\n") : input.split(",");
    return raw.map((s) => s.trim().replace(/^•\s*/, "")).filter(Boolean);
  }
  return undefined;
}

function strOrUndef(v: unknown): string | undefined {
  if (typeof v === "string") {
    const s = v.trim();
    return s ? s : undefined;
  }
  return undefined;
}

// Upload a batch of files (buffers) to Cloudinary and return ImageInfo[]
async function uploadFilesToCloudinary(
  files?: Express.Multer.File[],
  alts?: string[]
): Promise<ImageInfo[]> {
  if (!files?.length) return [];
  const uploads = await Promise.all(
    files.map(async (file, idx) => {
      const res = await uploadBufferToCloudinary(file.buffer, {
        folder: process.env.CLOUDINARY_FOLDER || "uploads",
      });
      const item: ImageInfo = {
        url: res.secure_url,
        public_id: res.public_id,
        width: res.width,
        height: res.height,
        format: res.format,
        bytes: res.bytes,
      };
      if (alts && alts[idx]) item.alt = String(alts[idx]);
      return item;
    })
  );
  return uploads;
}

// Upload a single file and return ImageInfo (or undefined)
async function uploadOne(file?: Express.Multer.File, alt?: string): Promise<ImageInfo | undefined> {
  if (!file) return undefined;
  const res = await uploadBufferToCloudinary(file.buffer, {
    folder: process.env.CLOUDINARY_FOLDER || "uploads",
  });
  const info: ImageInfo = {
    url: res.secure_url,
    public_id: res.public_id,
    width: res.width,
    height: res.height,
    format: res.format,
    bytes: res.bytes,
  };
  if (alt) info.alt = alt;
  return info;
}

/* ------------------------- controllers ------------------------- */

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    // Optimized: Only fetch active products by default, filter by status if provided
    const status = req.query.status as string | undefined;
    const filter = status ? { status } : { status: "active" };
    
    // Optimized: Select only needed fields for list view (including hover for sachet/pack image)
    const docs = await Product.find(filter)
      .select("name price images hover stock status category createdAt eshopboxProductId")
      .populate({ path: "category", select: "name" })
      .sort({ createdAt: -1 })
      .lean();
    res.json(docs);
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }
    const doc = await Product.findById(id)
      .populate({ path: "category", select: "name" })
      .lean();
    if (!doc) return res.status(404).json({ error: "Not Found" });
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, price, category, stock, status } = req.body || {};
    const alts: string[] | undefined =
      Array.isArray(req.body?.alts) ? req.body.alts : undefined;

    // Eshopbox product id (new required key)
    const eshopboxProductId = strOrUndef(req.body?.eshopboxProductId);

    // NEW text fields
    const about = strOrUndef(req.body?.about);
    const ingredients = strOrUndef(req.body?.ingredients);
    const description = strOrUndef(req.body?.description);
    const descriptionPoints = toPoints(req.body?.descriptionPoints);

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "'name' is required" });
    }

    // Validate eshopboxProductId (required)
    if (!eshopboxProductId) {
      return res.status(400).json({ error: "'eshopboxProductId' is required" });
    }

    // Ensure uniqueness before proceeding (nice error message before heavy uploads)
    const existingByEshop = await Product.findOne({ eshopboxProductId }).lean();
    if (existingByEshop) {
      return res.status(400).json({ error: "eshopboxProductId already exists" });
    }

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: "'price' must be a non-negative number" });
    }

    if (!mongoose.isValidObjectId(category)) {
      return res.status(400).json({ error: "Invalid 'category' id" });
    }
    const cat = await Category.findById(category).lean();
    if (!cat) return res.status(400).json({ error: "Category does not exist" });

    const stockNum = Number(stock);
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      return res.status(400).json({ error: "'stock' must be a non-negative integer" });
    }

    // Multer.fields -> req.files is a map { images?: File[]; hover?: File[] }
    const filesMap = (req.files as Record<string, Express.Multer.File[]>) || {};
    const imageFiles = filesMap.images || [];
    const hoverFiles = filesMap.hover || [];

    // Require 3–5 images for create
    const images = await uploadFilesToCloudinary(imageFiles, alts);
    if (images.length < 3 || images.length > 5) {
      await Promise.all(images.map((img) => destroyCloudinaryPublicId(img.public_id)));
      return res.status(400).json({ error: "Provide between 3 and 5 images" });
    }

    const hoverAlt = Array.isArray(req.body?.hoverAlt) ? req.body.hoverAlt[0] : req.body?.hoverAlt;
    const hover = await uploadOne(hoverFiles[0], typeof hoverAlt === "string" ? hoverAlt : undefined);

    const doc = await Product.create({
      name: name.trim(),
      price: priceNum,
      category,
      eshopboxProductId,
      stock: stockNum,
      status: status || "active",
      images,
      ...(hover ? { hover } : {}),

      // NEW text fields
      ...(about ? { about } : {}),
      ...(ingredients ? { ingredients } : {}),
      ...(description ? { description } : {}),
      ...(descriptionPoints?.length ? { descriptionPoints } : {}),
    });

    return res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const updates: Partial<ProductDoc> = {};

    // Basic fields
    if (typeof req.body.name === "string" && req.body.name.trim()) {
      updates.name = req.body.name.trim();
    }

    if (req.body.price !== undefined) {
      const priceNum = Number(req.body.price);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        return res.status(400).json({ error: "'price' must be a non-negative number" });
      }
      updates.price = priceNum;
    }

    if (req.body.category !== undefined) {
      const catId = String(req.body.category);
      if (!mongoose.isValidObjectId(catId)) {
        return res.status(400).json({ error: "Invalid 'category' id" });
      }
      const exists = await Category.findById(catId).lean();
      if (!exists) return res.status(400).json({ error: "Category does not exist" });
      updates.category = new mongoose.Types.ObjectId(catId) as any;
    }

    // Allow updating eshopboxProductId (ensure uniqueness)
    if (req.body.eshopboxProductId !== undefined) {
      const val = strOrUndef(req.body.eshopboxProductId);
      if (!val) return res.status(400).json({ error: "Invalid 'eshopboxProductId'" });
      // ensure no other product has this id
      const dup = await Product.findOne({ eshopboxProductId: val, _id: { $ne: id } }).lean();
      if (dup) return res.status(400).json({ error: "eshopboxProductId already in use" });
      updates.eshopboxProductId = val as any;
    }

    if (req.body.stock !== undefined) {
      const stockNum = Number(req.body.stock);
      if (!Number.isInteger(stockNum) || stockNum < 0) {
        return res.status(400).json({ error: "'stock' must be a non-negative integer" });
      }
      updates.stock = stockNum;
    }

    if (req.body.status !== undefined) {
      const allowed = ["active", "inactive", "draft"];
      if (!allowed.includes(String(req.body.status))) {
        return res.status(400).json({ error: "Invalid 'status' value" });
      }
      updates.status = String(req.body.status) as any;
    }

    // NEW text fields (optional in update)
    const about = strOrUndef(req.body?.about);
    const ingredients = strOrUndef(req.body?.ingredients);
    const description = strOrUndef(req.body?.description);
    const descriptionPoints = toPoints(req.body?.descriptionPoints);

    if (about !== undefined) updates.about = about;
    if (ingredients !== undefined) updates.ingredients = ingredients;
    if (description !== undefined) updates.description = description;
    if (descriptionPoints !== undefined) updates.descriptionPoints = descriptionPoints;

    // Files (multer.fields)
    const filesMap = (req.files as Record<string, Express.Multer.File[]>) || {};
    const incomingImages = filesMap.images || [];
    const incomingHover = filesMap.hover || [];

    // Handle image removal/keeping (keepImages field from FormData)
    // FormData with multiple fields of same name can come as array or single value
    let keepImagesUrls: string[] = [];
    if (req.body?.keepImages) {
      if (Array.isArray(req.body.keepImages)) {
        keepImagesUrls = req.body.keepImages.map((url: unknown) => String(url).trim()).filter(Boolean);
      } else if (typeof req.body.keepImages === "string") {
        keepImagesUrls = [req.body.keepImages.trim()].filter(Boolean);
      }
    }

    // If gallery images provided, enforce 3–5 and replace them
    if (incomingImages.length > 0) {
      if (incomingImages.length < 3 || incomingImages.length > 5) {
        return res.status(400).json({ error: "Provide between 3 and 5 images when replacing" });
      }

      const existing = await Product.findById(id);
      if (!existing) return res.status(404).json({ error: "Not Found" });

      const newImages = await uploadFilesToCloudinary(incomingImages);
      if (newImages.length < 3 || newImages.length > 5) {
        await Promise.all(newImages.map((img) => destroyCloudinaryPublicId(img.public_id)));
        return res.status(400).json({ error: "Provide between 3 and 5 images when replacing" });
      }

      // Destroy old gallery AFTER successful upload
      await Promise.all((existing.images || []).map((img) => destroyCloudinaryPublicId(img.public_id)));
      updates.images = newImages;
    } else if (keepImagesUrls.length > 0) {
      // Handle image removal: keep only specified images
      const existing = await Product.findById(id);
      if (!existing) return res.status(404).json({ error: "Not Found" });

      const existingImages = existing.images || [];
      
      // Normalize URLs for comparison (remove trailing slashes, etc.)
      const normalizedKeepUrls = keepImagesUrls.map((url) => url.trim());
      
      // Filter to keep only images whose URLs match keepImagesUrls
      const imagesToKeep = existingImages.filter((img) =>
        normalizedKeepUrls.some((url: string) => {
          const imgUrl = img.url.trim();
          return imgUrl === url || imgUrl.endsWith(url) || url.endsWith(imgUrl);
        })
      );
      
      // Validate count
      if (imagesToKeep.length < 3 || imagesToKeep.length > 5) {
        return res.status(400).json({
          error: `After removing images, you need 3–5 images total. Currently: ${imagesToKeep.length}`,
        });
      }

      // Find images to remove (those not in keepImagesUrls)
      const imagesToRemove = existingImages.filter(
        (img) => !normalizedKeepUrls.some((url: string) => {
          const imgUrl = img.url.trim();
          return imgUrl === url || imgUrl.endsWith(url) || url.endsWith(imgUrl);
        })
      );

      // Destroy removed images from Cloudinary
      if (imagesToRemove.length > 0) {
        await Promise.all(imagesToRemove.map((img) => destroyCloudinaryPublicId(img.public_id)));
      }

      updates.images = imagesToKeep;
    }

    // If hover file provided, replace hover independently
    if (incomingHover.length > 0) {
      const existing = await Product.findById(id);
      if (!existing) return res.status(404).json({ error: "Not Found" });

      const newHover = await uploadOne(incomingHover[0]);
      if (!newHover) {
        return res.status(400).json({ error: "Hover upload failed" });
      }

      // Delete old hover if present
      if (existing.hover?.public_id) {
        await destroyCloudinaryPublicId(existing.hover.public_id);
      }

      updates.hover = newHover;
    }

    const updated = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ error: "Not Found" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Not Found" });

    // Clean up Cloudinary assets (gallery + hover)
    await Promise.all(
      (deleted.images || []).map((img) => destroyCloudinaryPublicId(img.public_id))
    );
    if (deleted.hover?.public_id) {
      await destroyCloudinaryPublicId(deleted.hover.public_id);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
