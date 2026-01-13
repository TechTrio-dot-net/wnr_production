// routes/adminOrders.ts
import { Router } from "express";
import { Types } from "mongoose";
import { connectDB } from "../lib/db";
import OrderModel from "../modules/orders/Order";
import { getStatusCategory, getStatusDescription, getTrackingDetails } from "../modules/shipments/eshopbox-tracking";
import { TrackingStatus as TrackingStatusEnum } from "../types/eshopbox";

/**
 * Compute status category from a string status value
 * This ensures we properly categorize statuses even when they come as strings
 * Order matters: check delivered first (most specific), then issues, then transit, then pending
 */
function computeStatusCategory(status: string | null | undefined): 'pending' | 'in-transit' | 'delivered' | 'issue' {
  if (!status) return 'pending';
  
  const normalized = String(status).toUpperCase().trim();
  
  // Delivered statuses - check for exact word "DELIVERED" (not part of "DELIVERY")
  // Also handle "SUCCESS" as delivered (common in some courier APIs)
  const isDelivered = 
    normalized === 'DELIVERED' ||
    normalized === 'DELIVERED_WAREHOUSE' ||
    normalized === 'RTO_DELIVERED' ||
    normalized === 'SUCCESS' || // SUCCESS typically means delivered
    normalized.startsWith('DELIVERED_') ||
    normalized.endsWith('_DELIVERED') ||
    (normalized.includes('DELIVERED') && !normalized.includes('DELIVERY')); // Has DELIVERED but not DELIVERY (like OUT_FOR_DELIVERY)
  
  if (isDelivered) {
    return 'delivered';
  }
  
  // Issue statuses - check before transit to catch FAILED_DELIVERY
  if (
    normalized === 'CANCELLED_ORDER' ||
    normalized === 'PICKUP_FAILED' ||
    normalized === 'LOST' ||
    normalized === 'DAMAGED' ||
    normalized === 'FAILED_DELIVERY' ||
    normalized === 'RTO_FAILED' ||
    normalized === 'SHIPMENT_HELD' ||
    normalized === 'CONTACT_CUSTOMER_CARE' ||
    normalized === 'RTO_CONTACT_CUSTOMER_CARE' ||
    normalized.includes('FAILED') ||
    normalized.includes('CANCELLED') ||
    normalized.includes('LOST') ||
    normalized.includes('DAMAGED') ||
    normalized.includes('HELD')
  ) {
    return 'issue';
  }
  
  // In-transit statuses
  if (
    normalized === 'PICKED_UP' ||
    normalized === 'INTRANSIT' ||
    normalized === 'OUT_FOR_DELIVERY' ||
    normalized === 'RTO' ||
    normalized === 'RTO_INTRANSIT' ||
    normalized === 'RTO_OUT_FOR_DELIVERY' ||
    normalized.includes('TRANSIT') ||
    normalized.includes('PICKED') ||
    normalized.includes('OUT_FOR_DELIVERY')
  ) {
    return 'in-transit';
  }
  
  // Everything else is pending
  return 'pending';
}

// ⬅️ use the shared cookie/JWT guard
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

// Connect DB first
router.use(async (_req, _res, next) => {
  await connectDB();
  next();
});

// ✅ This reads cookie "tt_session", verifies JWT, sets req.userRole, then enforces admin
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/orders
 */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "").trim();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();

    const filter: any = {};
    if (status && ["pending", "paid", "failed", "cancelled"].includes(status)) {
      filter.status = status;
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (q) {
      filter.$or = [
        { orderNumber: new RegExp(q, "i") },
        { "addressSnapshot.name": new RegExp(q, "i") },
        { "addressSnapshot.phone": new RegExp(q, "i") },
        { "payment.razorpayOrderId": new RegExp(q, "i") },
        { "payment.razorpayPaymentId": new RegExp(q, "i") },
      ];
    }

    const [items, total] = await Promise.all([
      OrderModel.find(filter)
        .select("orderNumber total status createdAt addressSnapshot payment shipment user")
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      OrderModel.countDocuments(filter),
    ]);

    const shaped = items.map((o: any) => {
      // Always recompute statusCategory from the current status to ensure accuracy
      // Use latest_status if available (most up-to-date), otherwise use status
      const currentStatus = o.shipment?.latest_status || o.shipment?.status;
      let statusCategory = o.shipment?.statusCategory;
      let statusDescription = o.shipment?.statusDescription;
      
      if (currentStatus) {
        // Always recompute category from current status for accuracy
        statusCategory = computeStatusCategory(currentStatus);
        
        // Log for debugging (can be removed later)
        if (statusCategory === 'pending' && (currentStatus.toLowerCase().includes('deliver') || currentStatus.toLowerCase().includes('complete'))) {
          console.log('[Status Debug] Order:', o.orderNumber, 'Status:', currentStatus, 'Computed Category:', statusCategory);
        }
        
        // Try to get description using the tracking module function
        try {
          const normalizedStatus = String(currentStatus).toUpperCase().trim();
          // Try to match against enum values
          if (Object.values(TrackingStatusEnum).includes(normalizedStatus as any)) {
            statusDescription = getStatusDescription(normalizedStatus as any);
          } else {
            statusDescription = statusDescription || currentStatus;
          }
        } catch (e) {
          // Fallback: use existing description or status
          statusDescription = statusDescription || currentStatus;
        }
      } else if (!statusCategory) {
        // No status at all, default to pending
        statusCategory = 'pending';
      }

      return {
      _id: String(o._id),
      orderNumber: o.orderNumber,
      subtotal: o.subtotal,
      shipping: o.shipping,
      total: o.total,
      status: o.status,
      deliverySpeed: o.deliverySpeed ?? null,
      customerName: o.addressSnapshot?.name ?? null,
      customerPhone: o.addressSnapshot?.phone ?? null,
      paymentMethod: o.payment?.method ?? null,
      shipment: o.shipment
        ? {
            trackingId: o.shipment.trackingId ?? null,
            courierName: o.shipment.courierName ?? null,
            labelUrl: o.shipment.labelUrl ?? null,
            status: o.shipment.status ?? null,
            latest_status: o.shipment.latest_status ?? null,
            status_updated_at: o.shipment.status_updated_at ?? null,
              statusDescription: statusDescription ?? null,
              statusCategory: statusCategory ?? null,
            eshopboxShipmentId: o.shipment.eshopboxShipmentId ?? null,
          }
        : null,
      placedAt: o.placedAt ? new Date(o.placedAt).toISOString() : null,
      createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
      updatedAt: o.updatedAt ? new Date(o.updatedAt).toISOString() : null,
      };
    });

    return res.json({
      ok: true,
      items: shaped,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (e: any) {
    console.error("GET /api/admin/orders error:", e);
    return res.status(500).json({ message: e?.message || "Failed to load orders" });
  }
});

/**
 * GET /api/admin/orders/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = await OrderModel.findById(id)
      .populate({ path: "items.product", select: "images name" })
      .lean();

    if (!order) return res.status(404).json({ message: "Order not found" });

    const items = Array.isArray(order.items)
      ? order.items.map((it: any) => ({
          product: it.product?._id ? String(it.product._id) : undefined,
          name: it.name,
          price: it.price,
          ...(it.originalPrice !== undefined ? { originalPrice: it.originalPrice } : {}),
          ...(it.discountPercentage !== undefined ? { discountPercentage: it.discountPercentage } : {}),
          ...(it.discountAmount !== undefined ? { discountAmount: it.discountAmount } : {}),
          qty: it.qty,
          imageUrl: Array.isArray(it.product?.images) && it.product.images.length
            ? (typeof it.product.images[0] === "string"
                ? it.product.images[0]
                : it.product.images[0]?.url)
            : undefined,
        }))
      : [];

    // Compute statusCategory and statusDescription for shipment if available
    let shipmentData = null;
    if (order.shipment) {
      const currentStatus = order.shipment.latest_status || order.shipment.status;
      let statusCategory = order.shipment.statusCategory;
      let statusDescription = order.shipment.statusDescription;
      
      if (currentStatus) {
        // Always recompute category from current status for accuracy
        statusCategory = computeStatusCategory(currentStatus);
        
        // Try to get description using the tracking module function
        try {
          const normalizedStatus = String(currentStatus).toUpperCase().trim();
          const matchingEnum = Object.values(TrackingStatusEnum).find(
            (enumVal) => String(enumVal).toUpperCase() === normalizedStatus
          ) as TrackingStatusEnum | undefined;
          
          if (matchingEnum) {
            statusDescription = getStatusDescription(matchingEnum);
          } else if (!statusDescription) {
            // Fallback: format the status string nicely
            statusDescription = normalizedStatus.replace(/_/g, ' ').toLowerCase()
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
        } catch (e) {
          console.error("Error computing status description:", e);
          if (!statusDescription) {
            statusDescription = String(currentStatus).replace(/_/g, ' ').toLowerCase()
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
        }
      } else if (!statusCategory) {
        // No status at all, default to pending
        statusCategory = 'pending';
      }

      shipmentData = {
        trackingId: order.shipment.trackingId ?? null,
        status: order.shipment.status ?? null,
        latest_status: order.shipment.latest_status ?? null,
        status_updated_at: order.shipment.status_updated_at ?? null,
        statusDescription: statusDescription ?? null,
        statusCategory: statusCategory ?? null,
        courierName: order.shipment.courierName ?? null,
        eshopboxShipmentId: order.shipment.eshopboxShipmentId ?? null,
      };
    }

    return res.json({
      ok: true,
      item: {
        _id: String(order._id),
        orderNumber: order.orderNumber,
        user: String(order.user),
        items,
        subtotal: order.subtotal,
        shipping: order.shipping,
        total: order.total,
        status: order.status,
        deliverySpeed: order.deliverySpeed || "standard",
        coupon: order.coupon ? {
          code: order.coupon.code,
          name: order.coupon.name,
          discountType: order.coupon.discountType,
          discountValue: order.coupon.discountValue,
          discountAmount: order.coupon.discountAmount,
        } : null,
        addressSnapshot: order.addressSnapshot ?? null,
        payment: order.payment ?? null,
        shipment: shipmentData,
        placedAt: order.placedAt ? new Date(order.placedAt).toISOString() : null,
        createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : null,
        updatedAt: order.updatedAt ? new Date(order.updatedAt).toISOString() : null,
      },
    });
  } catch (e: any) {
    console.error("GET /api/admin/orders/:id error:", e);
    return res.status(500).json({ message: e?.message || "Failed to load order" });
  }
});

/**
 * POST /api/admin/orders/:id/refresh-tracking
 * Refresh tracking status from Eshopbox API
 */
router.post("/:id/refresh-tracking", async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await OrderModel.findById(id).lean();
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!order.shipment?.trackingId) {
      return res.status(400).json({ message: "No tracking ID found for this order" });
    }

    // Fetch fresh tracking data from Eshopbox
    const trackingData = await getTrackingDetails(order.shipment.trackingId);
    if (!trackingData || trackingData.length === 0 || !trackingData[0]) {
      return res.status(404).json({ message: "Tracking data not found" });
    }

    const latestTracking = trackingData[0];
    
    // Extract status from multiple possible fields
    const rawStatus = latestTracking.status || 
                     latestTracking.latest_status || 
                     (latestTracking as any).currentStatus ||
                     (latestTracking as any).trackingStatus ||
                     '';
    
    if (!rawStatus) {
      console.error("No status found in tracking data:", JSON.stringify(latestTracking, null, 2));
      return res.status(400).json({ message: "Invalid tracking data received - no status field" });
    }

    // Normalize status to uppercase string for processing
    const normalizedStatus = String(rawStatus).toUpperCase().trim();
    
    console.log("Refreshing tracking status:", {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      trackingId: order.shipment.trackingId,
      rawStatus,
      normalizedStatus,
      trackingData: JSON.stringify(latestTracking, null, 2),
    });

    // Try to get status description and category
    // Handle both enum values and string statuses
    let statusDescription: string;
    let statusCategory: 'pending' | 'in-transit' | 'delivered' | 'issue';
    
    try {
      // First compute category using the string-based function
      statusCategory = computeStatusCategory(normalizedStatus);
      
      // Try to match against TrackingStatus enum for description
      const matchingEnum = Object.values(TrackingStatusEnum).find(
        (enumVal) => String(enumVal).toUpperCase() === normalizedStatus
      ) as TrackingStatusEnum | undefined;
      
      if (matchingEnum) {
        statusDescription = getStatusDescription(matchingEnum);
      } else {
        // Use a generic description based on category or formatted status
        statusDescription = normalizedStatus.replace(/_/g, ' ').toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    } catch (e) {
      console.error("Error computing status:", e);
      statusCategory = computeStatusCategory(normalizedStatus);
      statusDescription = normalizedStatus.replace(/_/g, ' ').toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    console.log("Computed status:", {
      statusCategory,
      statusDescription,
      normalizedStatus,
    });

    // Update order with fresh tracking info
    // Save computed statusCategory and statusDescription to database
    const shipmentUpdate: any = {
      ...(order.shipment || {}),
      trackingId: latestTracking.trackingID || order.shipment.trackingId,
      status: normalizedStatus,
      latest_status: latestTracking.latest_status || normalizedStatus,
      status_updated_at: latestTracking.status_updated_at || new Date().toISOString(),
      statusCategory, // Save computed category
      statusDescription, // Save computed description
      updatedAt: new Date(),
    };

    console.log("Updating shipment with:", {
      trackingId: shipmentUpdate.trackingId,
      status: shipmentUpdate.status,
      latest_status: shipmentUpdate.latest_status,
      statusCategory: shipmentUpdate.statusCategory,
      statusDescription: shipmentUpdate.statusDescription,
    });

    await OrderModel.updateOne(
      { _id: order._id },
      {
        $set: {
          shipment: shipmentUpdate,
        },
      }
    );

    return res.json({
      ok: true,
      message: "Tracking status refreshed",
      shipment: shipmentUpdate,
    });
  } catch (e: any) {
    console.error("POST /api/admin/orders/:id/refresh-tracking error:", e);
    return res.status(500).json({ message: e?.message || "Failed to refresh tracking" });
  }
});

export default router;
