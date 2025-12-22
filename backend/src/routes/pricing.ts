import { Router } from "express";
import { priceCart } from "../modules/pricing/service";
import type { PricingInput } from "../modules/pricing/service";

const router = Router();

/** Mounted at /api/cart/price — so define POST "/" here */
router.post("/", async (req, res) => {
  try {
    const body = (req.body || {}) as PricingInput;

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).send("No items provided");
    }

    const priced = await priceCart(body);
    res.json(priced);
  } catch (e: any) {
    res.status(500).send(e?.message || "Pricing failed");
  }
});

export default router;
