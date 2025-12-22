import { Router } from "express";
import { connectDB } from "../lib/db";
import OrderModel from "../modules/orders/Order";
import { Product } from "../modules/catalog/products/product.model";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

router.use(requireAuth, requireAdmin);

/**
 * GET /api/dashboard
 * Returns dashboard statistics with optional date range filtering
 */
router.get("/", async (req, res) => {
  try {
    await connectDB();

    // Parse date range from query params
    const days = Number(req.query.days) || 7;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date();
    toDate.setHours(23, 59, 59, 999);

    // Total Sales (sum of all paid orders in date range)
    const salesAggregation = await OrderModel.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: fromDate, $lte: toDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
        },
      },
    ]);
    const totalSales = salesAggregation[0]?.total || 0;

    // Total Orders (count of all orders in date range)
    const totalOrders = await OrderModel.countDocuments({
      createdAt: { $gte: fromDate, $lte: toDate },
    });

    // Total Customers (unique users who placed orders)
    const uniqueCustomers = await OrderModel.distinct("user", {
      createdAt: { $gte: fromDate, $lte: toDate },
    });
    const totalCustomers = uniqueCustomers.length;

    // Low Stock Alerts (products with stock <= 10) - Optimized: Query database directly instead of loading all products
    const lowStockAlerts = await Product.countDocuments({
      status: "active",
      stock: { $lte: 10 },
    });

    // Sales Trend (daily breakdown for the date range)
    const salesTrendData = await OrderModel.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: fromDate, $lte: toDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          total: { $sum: "$total" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Fill in missing days with 0
    const labels: string[] = [];
    const data: number[] = [];
    const currentDate = new Date(fromDate);
    
    while (currentDate <= toDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const found = salesTrendData.find((d) => d._id === dateStr);
      labels.push(
        currentDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
      );
      data.push(found?.total || 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Additional metrics
    const paidOrders = await OrderModel.countDocuments({
      status: "paid",
      createdAt: { $gte: fromDate, $lte: toDate },
    });

    const pendingOrders = await OrderModel.countDocuments({
      status: "pending",
      createdAt: { $gte: fromDate, $lte: toDate },
    });

    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Recent orders (last 5)
    const recentOrders = await OrderModel.find({
      createdAt: { $gte: fromDate, $lte: toDate },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("orderNumber total status createdAt addressSnapshot.name")
      .lean();

    // Top products by quantity sold
    const topProducts = await OrderModel.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: fromDate, $lte: toDate },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          totalQuantity: { $sum: "$items.qty" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.qty"] } },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      totalSales,
      totalOrders,
      totalCustomers,
      lowStockAlerts,
      salesTrend: {
        labels,
        data,
      },
      additionalMetrics: {
        paidOrders,
        pendingOrders,
        averageOrderValue,
        conversionRate: totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0,
      },
      recentOrders: recentOrders.map((o) => ({
        orderNumber: o.orderNumber,
        total: o.total,
        status: o.status,
        customerName: o.addressSnapshot?.name || "N/A",
        date: o.createdAt,
      })),
      topProducts: topProducts.map((p) => ({
        name: p._id,
        quantity: p.totalQuantity,
        revenue: p.totalRevenue,
      })),
    });
  } catch (error: any) {
    console.error("[dashboard] Error:", error);
    res.status(500).json({
      message: "Failed to fetch dashboard data",
      error: error?.message || "Unknown error",
    });
  }
});

export default router;

