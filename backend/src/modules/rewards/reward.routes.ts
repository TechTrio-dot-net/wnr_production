import { Router } from "express";
import {
  getBalance,
  redeem,
  getTransactions,
  getTiers,
  updateTier,
  getAllUserRewards,
  adminAwardCoins,
} from "./reward.controller";
import { requireUser } from "../../middlewares/userAuth";
import { requireAuth, requireAdmin } from "../../middlewares/auth";

const router = Router();

// User routes (require authentication)
router.use(requireUser);
router.get("/balance", getBalance);
router.get("/transactions", getTransactions);
router.post("/redeem", redeem);

// Admin routes
router.use(requireAuth);
router.use(requireAdmin);
router.get("/admin/tiers", getTiers);
router.put("/admin/tiers/:tier", updateTier);
router.get("/admin/users", getAllUserRewards);
router.post("/admin/award", adminAwardCoins);

export default router;
