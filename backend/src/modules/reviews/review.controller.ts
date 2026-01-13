import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Review, ReviewDoc, ReviewStatus } from "./review.model";
import { Product } from "../catalog/products/product.model";
import User from "../users/User";

/* ------------------------- GET reviews for a product ------------------------- */
export async function getProductReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    // Check if product exists
    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Get approved reviews only, sorted by newest first
    const reviews = await Review.find({
      product: productId,
      status: "approved",
    })
      .populate({
        path: "user",
        select: "name email avatarUrl phone",
      })
      .sort({ createdAt: -1 })
      .lean();

    // Calculate average rating
    const ratings = reviews.map((r) => r.rating);
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;
    
    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    res.json({
      reviews,
      averageRating: Number(averageRating.toFixed(1)),
      totalReviews: reviews.length,
      ratingDistribution,
    });
  } catch (err) {
    next(err);
  }
}

/* ------------------------- POST create a review ------------------------- */
export async function createReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;

    if (!req.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    // Validate rating
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
    }

    // Validate comment
    if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
      return res.status(400).json({ error: "Comment is required" });
    }

    if (comment.trim().length > 1000) {
      return res.status(400).json({ error: "Comment must be 1000 characters or less" });
    }

    // Check if product exists
    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: req.userId,
    });

    if (existingReview) {
      return res.status(400).json({ error: "You have already reviewed this product" });
    }

    // Create review (status defaults to "pending")
    const review = await Review.create({
      product: productId,
      user: req.userId,
      rating: ratingNum,
      comment: comment.trim(),
      status: "pending", // Admin approval required
    });

    const populated = await Review.findById(review._id)
      .populate({
        path: "user",
        select: "name email avatarUrl phone",
      })
      .lean();

    res.status(201).json(populated);
  } catch (err: any) {
    if (err.code === 11000) {
      // Duplicate key error (one review per user per product)
      return res.status(400).json({ error: "You have already reviewed this product" });
    }
    next(err);
  }
}

/* ------------------------- PUT update own review ------------------------- */
export async function updateReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    if (!req.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!mongoose.isValidObjectId(reviewId)) {
      return res.status(400).json({ error: "Invalid review id" });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Check if user owns this review
    if (String(review.user) !== String(req.userId)) {
      return res.status(403).json({ error: "You can only update your own reviews" });
    }

    const updates: Partial<ReviewDoc> = {};

    if (rating !== undefined) {
      const ratingNum = Number(rating);
      if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
      }
      updates.rating = ratingNum;
      updates.status = "pending"; // Reset to pending when updated
    }

    if (comment !== undefined) {
      if (typeof comment !== "string" || comment.trim().length === 0) {
        return res.status(400).json({ error: "Comment cannot be empty" });
      }
      if (comment.trim().length > 1000) {
        return res.status(400).json({ error: "Comment must be 1000 characters or less" });
      }
      updates.comment = comment.trim();
      updates.status = "pending"; // Reset to pending when updated
    }

    const updated = await Review.findByIdAndUpdate(reviewId, updates, {
      new: true,
      runValidators: true,
    })
      .populate({
        path: "user",
        select: "name email avatarUrl phone",
      })
      .lean();

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/* ------------------------- DELETE own review ------------------------- */
export async function deleteReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { reviewId } = req.params;

    if (!req.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!mongoose.isValidObjectId(reviewId)) {
      return res.status(400).json({ error: "Invalid review id" });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Check if user owns this review
    if (String(review.user) !== String(req.userId)) {
      return res.status(403).json({ error: "You can only delete your own reviews" });
    }

    await Review.findByIdAndDelete(reviewId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/* ------------------------- ADMIN: Get all reviews ------------------------- */
export async function getAllReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, productId, page = "1", limit = "20" } = req.query;

    const query: any = {};
    
    if (status && ["pending", "approved", "rejected"].includes(status as string)) {
      query.status = status;
    }

    if (productId && mongoose.isValidObjectId(productId)) {
      query.product = productId;
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate({
          path: "product",
          select: "name images",
        })
        .populate({
          path: "user",
          select: "name email phone",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(query),
    ]);

    res.json({
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

/* ------------------------- ADMIN: Update review status ------------------------- */
export async function updateReviewStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { reviewId } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(reviewId)) {
      return res.status(400).json({ error: "Invalid review id" });
    }

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be pending, approved, or rejected" });
    }

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { status: status as ReviewStatus },
      { new: true, runValidators: true }
    )
      .populate({
        path: "product",
        select: "name images",
      })
      .populate({
        path: "user",
        select: "name email phone",
      })
      .lean();

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    res.json(review);
  } catch (err) {
    next(err);
  }
}

/* ------------------------- ADMIN: Delete review ------------------------- */
export async function adminDeleteReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { reviewId } = req.params;

    if (!mongoose.isValidObjectId(reviewId)) {
      return res.status(400).json({ error: "Invalid review id" });
    }

    const review = await Review.findByIdAndDelete(reviewId);
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/* ------------------------- Get user's review for a product ------------------------- */
export async function getUserReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;

    if (!req.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const review = await Review.findOne({
      product: productId,
      user: req.userId,
    })
      .populate({
        path: "user",
        select: "name email avatarUrl phone",
      })
      .lean();

    res.json(review || null);
  } catch (err) {
    next(err);
  }
}
