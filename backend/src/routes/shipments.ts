import { Router } from "express";
import Shipment from "../modules/shipments/model";

const r = Router();

r.post("/", async (req, res) => {
  try {
    const doc = await Shipment.create(req.body);
    return res.status(201).json({ ok: true, id: doc._id });
  } catch (e: any) {
    // if duplicate shipmentId is retried, upsert-in-place is convenient
    if (e?.code === 11000 && e?.keyPattern?.shipmentId) {
      const updated = await Shipment.findOneAndUpdate(
        { shipmentId: req.body.shipmentId },
        { $set: req.body },
        { new: true }
      );
      return res.status(200).json({ ok: true, id: updated?._id, updated: true });
    }
    return res.status(400).json({ ok: false, error: e?.message || "Save failed" });
  }
});

export default r;
