import { Router } from "express";
import {
  getTestimonials,
  getAllTestimonials,
  getTestimonial,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from "./testimonial.controller";
import { requireAuth, requireAdmin } from "../../middlewares/auth";
import { uploadImages } from "../../lib/upload";

const router = Router();

// Public routes
router.get("/", getTestimonials);

// Admin routes
router.get("/admin", requireAuth, requireAdmin, getAllTestimonials);
router.get("/admin/:id", requireAuth, requireAdmin, getTestimonial);

// Upload middleware for product image (single file)
const uploadProductImage = uploadImages.single("productImage");

router.post("/admin", requireAuth, requireAdmin, uploadProductImage, createTestimonial);
router.put("/admin/:id", requireAuth, requireAdmin, uploadProductImage, updateTestimonial);
router.delete("/admin/:id", requireAuth, requireAdmin, deleteTestimonial);

export default router;
