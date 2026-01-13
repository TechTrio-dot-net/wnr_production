// src/routes/geo.ts
import { Router } from "express";
import { STATES, CITIES_BY_STATE } from "../data/indiaLocations";

const router = Router();

router.get("/states", (_req, res) => {
  // Sorted by name
  const list = [...STATES].sort((a, b) => a.name.localeCompare(b.name));
  res.json(list);
});

router.get("/cities", (req, res) => {
  const code = String(req.query.state || "").toUpperCase();
  if (!code || !CITIES_BY_STATE[code]) {
    return res.status(400).json({ message: "Invalid or missing state code" });
  }
  const list = [...CITIES_BY_STATE[code]].sort((a, b) => a.localeCompare(b));
  res.json({ state: code, cities: list });
});

export default router;
