import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { IngredientsStripModel } from "../modules/ingredientsStrip/ingredientsStrip.model";

const router = Router();

// GET /api/admin/ingredients-strip
router.get("/", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    let doc = await IngredientsStripModel.findOne().lean();
    if (!doc) {
      const created = await IngredientsStripModel.create({});
      doc = created.toObject() as any;
    }
    const enabled = Boolean(doc?.enabled);
    const text = typeof doc?.text === "string" ? doc.text : "";
    const speed = typeof doc?.speed === "number" && doc.speed >= 5 && doc.speed <= 60 ? doc.speed : 20;
    res.json({ enabled, text, speed });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/ingredients-strip
router.put("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { enabled, text, speed } = req.body ?? {};
    const safeEnabled = Boolean(enabled);
    const safeText = typeof text === "string" ? text : "";
    const safeSpeed = typeof speed === "number" && speed >= 5 && speed <= 60 ? speed : 20;

    const updated = await IngredientsStripModel.findOneAndUpdate(
      {},
      { $set: { enabled: safeEnabled, text: safeText, speed: safeSpeed } },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    res.json({
      enabled: Boolean(updated?.enabled),
      text: typeof updated?.text === "string" ? updated.text : "",
      speed: typeof updated?.speed === "number" && updated.speed >= 5 && updated.speed <= 60 ? updated.speed : 20,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

