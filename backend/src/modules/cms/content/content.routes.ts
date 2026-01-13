import { Router } from "express";
import {
  createContent,
  getContent,
  getContentById,
  updateContent,
  deleteContent,
  getContentByType,
} from "./content.controller";
import { requireAuth, requireAdmin } from "../../../middlewares/auth";

const router = Router();

// Public routes (for client to fetch content)
router.get("/", getContent);
router.get("/type/:type", getContentByType);
router.get("/:id", getContentById);

// Admin routes (require authentication)
router.post("/", requireAuth, requireAdmin, createContent);
router.put("/:id", requireAuth, requireAdmin, updateContent);
router.delete("/:id", requireAuth, requireAdmin, deleteContent);

export default router;
