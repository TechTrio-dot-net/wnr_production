import { Request, Response, NextFunction } from "express";
import { Content, ContentDoc, ContentType } from "./content.model";

export async function createContent(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, key, title, content, metadata, isActive, order } = req.body;

    if (!type || !key || content === undefined) {
      return res.status(400).json({ error: "type, key, and content are required" });
    }

    const doc = await Content.create({
      type,
      key,
      title,
      content,
      metadata: metadata || {},
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0,
    });

    res.status(201).json(doc);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Content with this type and key already exists" });
    }
    next(err);
  }
}

export async function getContent(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, key, activeOnly } = req.query;

    const filter: any = {};
    if (type) filter.type = type;
    if (key) filter.key = key;
    if (activeOnly === "true") filter.isActive = true;

    const contents = await Content.find(filter)
      .sort({ type: 1, order: 1, createdAt: -1 })
      .lean();

    res.json(contents);
  } catch (err) {
    next(err);
  }
}

export async function getContentById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const content = await Content.findById(id).lean();
    if (!content) return res.status(404).json({ error: "Content not found" });
    res.json(content);
  } catch (err) {
    next(err);
  }
}

export async function updateContent(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { title, content, metadata, isActive, order } = req.body;

    const updates: Partial<ContentDoc> = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (metadata !== undefined) updates.metadata = metadata;
    if (isActive !== undefined) updates.isActive = isActive;
    if (order !== undefined) updates.order = order;

    const updated = await Content.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updated) return res.status(404).json({ error: "Content not found" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteContent(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const deleted = await Content.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Content not found" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// Bulk operations
export async function getContentByType(req: Request, res: Response, next: NextFunction) {
  try {
    const { type } = req.params;
    const activeOnly = req.query.activeOnly === "true";

    const filter: any = { type };
    if (activeOnly) filter.isActive = true;

    const contents = await Content.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.json(contents);
  } catch (err) {
    next(err);
  }
}
