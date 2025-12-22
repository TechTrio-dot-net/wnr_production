import { Router } from "express";
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  getUserReview,
  getAllReviews,
  updateReviewStatus,
  adminDeleteReview,
} from "./review.controller";
import { requireUser } from "../../middlewares/userAuth";
import { requireAuth, requireAdmin } from "../../middlewares/auth";

const router = Router();

// Public routes
router.get("/product/:productId", getProductReviews);

// User routes (require authentication)
router.use(requireUser);
router.get("/product/:productId/my-review", getUserReview);
router.post("/product/:productId", createReview);
router.put("/:reviewId", updateReview);
router.delete("/:reviewId", deleteReview);

// Admin routes
router.use(requireAuth);
router.use(requireAdmin);
router.get("/admin/all", getAllReviews);
router.put("/admin/:reviewId/status", updateReviewStatus);
router.delete("/admin/:reviewId", adminDeleteReview);

export default router;
