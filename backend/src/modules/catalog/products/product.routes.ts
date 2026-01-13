import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "./product.controller";
import { uploadImages } from "../../../lib/upload";
import { mediumCache } from "../../../middlewares/cache";

const router = Router();

router.get("/health", (_req, res) => res.json({ ok: true }));

// Add caching for public product endpoints (5 minute cache)
router.get("/", mediumCache, listProducts);
router.get("/:id", mediumCache, getProduct);

// Accept BOTH gallery (images[]) and a single hover file
const uploadFields = uploadImages.fields([
  { name: "images", maxCount: 7 },
  { name: "hover", maxCount: 1 },
]);

router.post("/", uploadFields, createProduct);
router.put("/:id", uploadFields, updateProduct);
router.delete("/:id", deleteProduct);

export default router;
