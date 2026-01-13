import { Router } from "express";
import {
  createCategory,
  listCategories,
  updateCategory,
  reorderCategories,
  deleteCategory,
} from "./category.controller";

const router = Router();

router.get("/", listCategories);
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.put("/order", reorderCategories);
router.delete("/:id", deleteCategory);

export default router;
