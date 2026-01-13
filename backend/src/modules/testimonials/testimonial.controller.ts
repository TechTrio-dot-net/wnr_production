import { Request, Response } from "express";
import TestimonialModel from "./testimonial.model";
import { Types } from "mongoose";
import { uploadBufferToCloudinary } from "../../lib/cloudinary";

/**
 * GET /api/testimonials
 * Get all active testimonials (public)
 */
export async function getTestimonials(req: Request, res: Response) {
  try {
    const testimonials = await (TestimonialModel as any).find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();
    return res.json({ testimonials });
  } catch (error: unknown) {
    console.error("Get testimonials error:", error);
    return res.status(500).json({ message: (error as Error)?.message || "Failed to fetch testimonials" });
  }
}

/**
 * GET /api/admin/testimonials
 * Get all testimonials (admin)
 */
export async function getAllTestimonials(req: Request, res: Response) {
  try {
    const testimonials = await (TestimonialModel as any).find({})
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();
    return res.json({ testimonials });
  } catch (error: unknown) {
    console.error("Get all testimonials error:", error);
    return res.status(500).json({ message: (error as Error)?.message || "Failed to fetch testimonials" });
  }
}

/**
 * GET /api/admin/testimonials/:id
 * Get single testimonial (admin)
 */
export async function getTestimonial(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid testimonial ID" });
    }

    const testimonial = await (TestimonialModel as any).findById(id).lean();
    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found" });
    }

    return res.json({ testimonial });
  } catch (error: unknown) {
    console.error("Get testimonial error:", error);
    return res.status(500).json({ message: (error as Error)?.message || "Failed to fetch testimonial" });
  }
}

/**
 * POST /api/admin/testimonials
 * Create a new testimonial (admin)
 */
export async function createTestimonial(req: Request, res: Response) {
  try {
    const { name, headline, quote, rating, productImageUrl, countryCode, isActive, displayOrder } = req.body;

    if (!name || !headline || !quote) {
      return res.status(400).json({ message: "Name, headline, and quote are required" });
    }

    // Handle image upload if file is provided
    let finalImageUrl = productImageUrl;
    const file = (req as any).file;
    if (file) {
      try {
        const uploadResult = await uploadBufferToCloudinary(file.buffer, {
          folder: process.env.CLOUDINARY_FOLDER || "uploads/testimonials",
        });
        finalImageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({ message: "Failed to upload image to Cloudinary" });
      }
    }

    const testimonial = new (TestimonialModel as any)({
      name,
      headline,
      quote,
      rating: rating || 5,
      productImageUrl: finalImageUrl,
      countryCode,
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0,
    });

    await testimonial.save();
    return res.json({ testimonial });
  } catch (error: unknown) {
    console.error("Create testimonial error:", error);
    if ((error as any)?.code === 11000) {
      return res.status(400).json({ message: "Testimonial already exists" });
    }
    return res.status(500).json({ message: (error as Error)?.message || "Failed to create testimonial" });
  }
}

/**
 * PUT /api/admin/testimonials/:id
 * Update a testimonial (admin)
 */
export async function updateTestimonial(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid testimonial ID" });
    }

    const updateData: any = { ...req.body };

    // Handle image upload if file is provided
    const file = (req as any).file;
    if (file) {
      try {
        const uploadResult = await uploadBufferToCloudinary(file.buffer, {
          folder: process.env.CLOUDINARY_FOLDER || "uploads/testimonials",
        });
        updateData.productImageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({ message: "Failed to upload image to Cloudinary" });
      }
    }

    const testimonial = await (TestimonialModel as any).findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found" });
    }

    return res.json({ testimonial });
  } catch (error: unknown) {
    console.error("Update testimonial error:", error);
    return res.status(500).json({ message: (error as Error)?.message || "Failed to update testimonial" });
  }
}

/**
 * DELETE /api/admin/testimonials/:id
 * Delete a testimonial (admin)
 */
export async function deleteTestimonial(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid testimonial ID" });
    }

    await (TestimonialModel as any).findByIdAndDelete(id).exec();
    return res.json({ message: "Testimonial deleted" });
  } catch (error: unknown) {
    console.error("Delete testimonial error:", error);
    return res.status(500).json({ message: (error as Error)?.message || "Failed to delete testimonial" });
  }
}
