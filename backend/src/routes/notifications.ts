// routes/notifications.ts
import { Router } from "express";
import { connectDB } from "../lib/db";
import OrderModel from "../modules/orders/Order";
import { Review } from "../modules/reviews/review.model";
import { Product } from "../modules/catalog/products/product.model";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

/**
 * GET /api/admin/notifications
 * Get notification counts and recent notifications
 */
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    await connectDB();

    // Get counts for different notification types
    const [
      newOrdersCount,
      pendingReviewsCount,
      shipmentIssuesCount,
      lowStockCount,
    ] = await Promise.all([
      // New orders (paid in last 24 hours)
      OrderModel.countDocuments({
        status: "paid",
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      
      // Pending reviews
      Review.countDocuments({ status: "pending" }),
      
      // Shipment issues (orders with issue status)
      OrderModel.countDocuments({
        "shipment.statusCategory": "issue",
      }),
      
      // Low stock products (stock <= 10)
      Product.countDocuments({
        stock: { $lte: 10 },
        status: "active",
      }),
    ]);

    const totalCount = newOrdersCount + pendingReviewsCount + shipmentIssuesCount + lowStockCount;

    // Get recent notifications (last 10)
    const recentOrders = await OrderModel.find({
      status: "paid",
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("orderNumber createdAt total")
      .lean();

    const recentReviews = await Review.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("product", "name")
      .lean();

    const recentIssues = await OrderModel.find({
      "shipment.statusCategory": "issue",
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("orderNumber shipment")
      .lean();

    const lowStockProducts = await Product.find({
      stock: { $lte: 10 },
      status: "active",
    })
      .sort({ stock: 1 })
      .limit(5)
      .select("name stock")
      .lean();

    const notifications = [
      ...recentOrders.map((order: any) => ({
        id: `order-${order._id}`,
        type: "new_order",
        title: "New Order",
        message: `Order ${order.orderNumber} - ₹${order.total}`,
        timestamp: order.createdAt,
        link: `/orders?orderNumber=${order.orderNumber}`,
        read: false,
      })),
      ...recentReviews.map((review: any) => ({
        id: `review-${review._id}`,
        type: "pending_review",
        title: "Pending Review",
        message: `Review for ${review.product?.name || "Product"}`,
        timestamp: review.createdAt,
        link: "/reviews",
        read: false,
      })),
      ...recentIssues.map((order: any) => ({
        id: `issue-${order._id}`,
        type: "shipment_issue",
        title: "Shipment Issue",
        message: `Issue with order ${order.orderNumber}`,
        timestamp: order.updatedAt,
        link: `/shipping`,
        read: false,
      })),
      ...lowStockProducts.map((product: any) => ({
        id: `stock-${product._id}`,
        type: "low_stock",
        title: "Low Stock Alert",
        message: `${product.name} - Only ${product.stock} left`,
        timestamp: new Date().toISOString(),
        link: `/products`,
        read: false,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return res.json({
      counts: {
        newOrders: newOrdersCount,
        pendingReviews: pendingReviewsCount,
        shipmentIssues: shipmentIssuesCount,
        lowStock: lowStockCount,
        total: totalCount,
      },
      notifications,
    });
  } catch (error: unknown) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      message: (error as Error)?.message || "Failed to fetch notifications",
      counts: { newOrders: 0, pendingReviews: 0, shipmentIssues: 0, lowStock: 0, total: 0 },
      notifications: [],
    });
  }
});

export default router;
