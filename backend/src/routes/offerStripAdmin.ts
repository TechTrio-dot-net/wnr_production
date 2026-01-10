import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { OfferStripModel } from "../modules/offerStrip/offerStrip.model";

const router = Router();

// GET /api/admin/offer-strip
router.get("/", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    let doc = await OfferStripModel.findOne().lean();
    if (!doc) {
      const created = await OfferStripModel.create({});
      doc = created.toObject() as any;
    }
    const enabled = Boolean(doc?.enabled);
    const text = typeof doc?.text === "string" ? doc.text : "";
    const speed = typeof doc?.speed === "number" && doc.speed >= 5 && doc.speed <= 60 ? doc.speed : 20;
    const enabled2 = Boolean(doc?.enabled2);
    const text2 = typeof doc?.text2 === "string" ? doc.text2 : "";
    const speed2 = typeof doc?.speed2 === "number" && doc.speed2 >= 5 && doc.speed2 <= 60 ? doc.speed2 : 20;
    res.json({ enabled, text, speed, enabled2, text2, speed2 });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/offer-strip
router.put("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { enabled, text, speed, enabled2, text2, speed2 } = req.body ?? {};
    const safeEnabled = Boolean(enabled);
    const safeText = typeof text === "string" ? text : "";
    const safeSpeed = typeof speed === "number" && speed >= 5 && speed <= 60 ? speed : 20;
    const safeEnabled2 = Boolean(enabled2);
    const safeText2 = typeof text2 === "string" ? text2 : "";
    const safeSpeed2 = typeof speed2 === "number" && speed2 >= 5 && speed2 <= 60 ? speed2 : 20;

    const updated = await OfferStripModel.findOneAndUpdate(
      {},
      { $set: { enabled: safeEnabled, text: safeText, speed: safeSpeed, enabled2: safeEnabled2, text2: safeText2, speed2: safeSpeed2 } },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    res.json({
      enabled: Boolean(updated?.enabled),
      text: typeof updated?.text === "string" ? updated.text : "",
      speed: typeof updated?.speed === "number" && updated.speed >= 5 && updated.speed <= 60 ? updated.speed : 20,
      enabled2: Boolean(updated?.enabled2),
      text2: typeof updated?.text2 === "string" ? updated.text2 : "",
      speed2: typeof updated?.speed2 === "number" && updated.speed2 >= 5 && updated.speed2 <= 60 ? updated.speed2 : 20,
    });
  } catch (err) {
    next(err);
  }
});

export default router;


