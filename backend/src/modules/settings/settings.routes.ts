import { Router } from "express";
import { getSettings, updateSettings, patchSettings } from "./settings.controller";
import { requireAuth, requireAdmin } from "../../middlewares/auth";

const router = Router();

// All settings routes require admin authentication
router.use(requireAuth, requireAdmin);

router.get("/", getSettings);
router.put("/", updateSettings);
router.patch("/", patchSettings);

export default router;

