import { Request, Response, NextFunction } from "express";
import { Category } from "./category.model";

export async function createCategory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "'name' is required" });
    }
    
    // Get the highest order value to set the new category's order
    const maxOrderDoc = await Category.findOne().sort({ order: -1 }).lean();
    const nextOrder = maxOrderDoc && typeof maxOrderDoc.order === "number" ? maxOrderDoc.order + 1 : 0;
    
    const doc = await Category.create({ name: name.trim(), order: nextOrder });
    return res.status(201).json(doc);
  } catch (err: unknown) {
    const error = err as { code?: number };
    if (error?.code === 11000) {
      return res.status(409).json({ error: "Category name must be unique" });
    }
    next(err);
  }
}

export async function listCategories(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Sort by order first, then by name as fallback
    const docs = await Category.find().sort({ order: 1, name: 1 }).lean();
    res.json(docs);
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { name, order } = req.body;
    
    const updates: { name?: string; order?: number } = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "'name' must be a non-empty string" });
      }
      updates.name = name.trim();
    }
    if (order !== undefined) {
      if (typeof order !== "number") {
        return res.status(400).json({ error: "'order' must be a number" });
      }
      updates.order = order;
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }
    
    const updated = await Category.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
    
    if (!updated) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    res.json(updated);
  } catch (err: unknown) {
    const error = err as { code?: number };
    if (error?.code === 11000) {
      return res.status(409).json({ error: "Category name must be unique" });
    }
    next(err);
  }
}

export async function reorderCategories(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "'ids' must be a non-empty array" });
    }
    
    // Update each category's order based on its position in the array
    const updatePromises = ids.map((id: string, index: number) => {
      return Category.findByIdAndUpdate(id, { order: index }, { new: true });
    });
    
    await Promise.all(updatePromises);
    
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Not Found" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
