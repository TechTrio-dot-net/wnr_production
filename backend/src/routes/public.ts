// src/routes/public.ts
import { Router } from "express";
import {
  listPublishedBlogsPublic,
  getPublishedBlogPublic,
} from "../modules/cms/blog/public.controller";
import { OfferStripModel } from "../modules/offerStrip/offerStrip.model";
import { IngredientsStripModel } from "../modules/ingredientsStrip/ingredientsStrip.model";

const router = Router();

// GET /public/blogs?limit=&page=
router.get("/blogs", listPublishedBlogsPublic);
// GET /public/blogs/:idOrSlug
router.get("/blogs/:idOrSlug", getPublishedBlogPublic);

// GET /public/offer-strip
// Returns a minimal, non-sensitive config for the top offer strip
router.get("/offer-strip", async (_req, res, next) => {
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

// GET /public/ingredients-strip
// Returns a minimal, non-sensitive config for the ingredients strip
router.get("/ingredients-strip", async (_req, res, next) => {
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

export default router;
