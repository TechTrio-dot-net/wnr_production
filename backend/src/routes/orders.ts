import { Router } from "express";
import { Types } from "mongoose";
import { connectDB } from "../lib/db";
import OrderModel from "../modules/orders/Order";
import { requireUser } from "../middlewares/userAuth";
import { getStatusCategory, getStatusDescription } from "../modules/shipments/eshopbox-tracking";
import { TrackingStatus as TrackingStatusEnum } from "../types/eshopbox";

/**
 * Compute status category from a string status value
 * This ensures we properly categorize statuses even when they come as strings
 */
function computeStatusCategory(status: string | null | undefined): 'pending' | 'in-transit' | 'delivered' | 'issue' {
  if (!status) return 'pending';
  
  const normalized = String(status).toUpperCase().trim();
  
  // Delivered statuses
  const isDelivered = 
    normalized === 'DELIVERED' ||
    normalized === 'DELIVERED_WAREHOUSE' ||
    normalized === 'RTO_DELIVERED' ||
    normalized.startsWith('DELIVERED_') ||
    normalized.endsWith('_DELIVERED') ||
    (normalized.includes('DELIVERED') && !normalized.includes('DELIVERY'));
  
  if (isDelivered) {
    return 'delivered';
  }
  
  // Issue statuses
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

const router = Router();

/** Small helper to safely pick first image url from product.images (array of {url,...} or strings) */
function firstImageUrl(prod: any): string | undefined {
  const imgs = prod?.images;
  if (!Array.isArray(imgs) || imgs.length === 0) return undefined;
  const first = imgs[0];
  if (!first) return undefined;
  if (typeof first === "string") return first;
  if (typeof first?.url === "string") return first.url;
  return undefined;
}

// ✅ Use unified authentication middleware
router.use(requireUser);

/**
 * GET /api/orders
 * Returns a list of the signed-in user's orders.
 * Items are trimmed to a short preview w/ imageUrl.
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.userId!; // ✅ Set by requireUser middleware

    // Optimized: Add pagination support and limit fields
    const limit = Math.min(100, Number(req.query.limit) || 50); // Max 100, default 50
    const skip = Number(req.query.skip) || 0;

    const orders = await OrderModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("orderNumber total status createdAt items addressSnapshot payment shipment")
      .populate({
        path: "items.product",
        select: "images", // we only need images to derive imageUrl
      })
      .lean();

    const shaped = orders.map((o: any) => {
      // Preview items – include imageUrl derived from populated product
      const itemsPreview =
        Array.isArray(o.items) && o.items.length
          ? o.items.map((it: any) => ({
              name: it.name,
              price: it.price,
              qty: it.qty,
              imageUrl: firstImageUrl(it.product),
            }))
          : [];

      return {
        _id: String(o._id),
        orderNumber: o.orderNumber, // e.g. WNR_0001
        subtotal: o.subtotal,
        shipping: o.shipping,
        total: o.total,
        status: o.status,
        placedAt: o.placedAt ? new Date(o.placedAt).toISOString() : null,
        createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
        updatedAt: o.updatedAt ? new Date(o.updatedAt).toISOString() : null,
        payment: o.payment
          ? {
              method: o.payment.method,
              status: o.payment.status,
            }
          : undefined,
        shipment: (() => {
          if (!o.shipment) return undefined;
          
          // Compute statusCategory and statusDescription if missing
          const currentStatus = o.shipment.latest_status || o.shipment.status;
          let statusCategory = o.shipment.statusCategory;
          let statusDescription = o.shipment.statusDescription;
          
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
          
          return {
            trackingId: o.shipment.trackingId ?? null,
            courierName: o.shipment.courierName ?? null,
            status: o.shipment.status ?? null,
            latest_status: o.shipment.latest_status ?? null,
            status_updated_at: o.shipment.status_updated_at ?? null,
            statusDescription: statusDescription ?? null,
            statusCategory: statusCategory ?? null,
          };
        })(),
        items: itemsPreview,
      };
    });

    return res.json(shaped);
  } catch (e: any) {
    console.error("GET /api/orders error:", e);
    return res.status(500).json({ message: e?.message || "Failed to load orders" });
  }
});

/**
 * GET /api/orders/:id
 * Returns a single order with all items, each with imageUrl.
 */
router.get("/:id", async (req, res) => {
  try {
    const userId = req.userId!; // ✅ Set by requireUser middleware
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = await OrderModel.findOne({ _id: id, user: userId })
      .populate({
        path: "items.product",
        select: "images", // only need images
      })
      .lean();

    if (!order) return res.status(404).json({ message: "Order not found" });

    const items =
      Array.isArray(order.items) && order.items.length
        ? order.items.map((it: any) => ({
            product: it.product?._id ? String(it.product._id) : undefined,
            name: it.name,
            price: it.price,
            qty: it.qty,
            imageUrl: firstImageUrl(it.product),
          }))
        : [];

    const shaped = {
      _id: String(order._id),
      orderNumber: order.orderNumber, // e.g. WNR_0001
      user: String(order.user),
      items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      status: order.status,
      addressSnapshot: order.addressSnapshot
        ? {
            name: order.addressSnapshot.name ?? null,
            phone: order.addressSnapshot.phone ?? null,
            line1: order.addressSnapshot.line1,
            line2: order.addressSnapshot.line2 ?? null,
            city: order.addressSnapshot.city,
            state: order.addressSnapshot.state,
            pincode: order.addressSnapshot.pincode,
          }
        : undefined,
      payment: order.payment
        ? {
            method: order.payment.method,
            status: order.payment.status,
            razorpayOrderId: order.payment.razorpayOrderId,
            razorpayPaymentId: order.payment.razorpayPaymentId,
          }
        : undefined,
      shipment: (() => {
        if (!order.shipment) return undefined;
        
        // Compute statusCategory and statusDescription if missing
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
        
        return {
          trackingId: order.shipment.trackingId ?? null,
          courierName: order.shipment.courierName ?? null,
          labelUrl: order.shipment.labelUrl ?? null,
          status: order.shipment.status ?? null,
          latest_status: order.shipment.latest_status ?? null,
          status_updated_at: order.shipment.status_updated_at ?? null,
          statusDescription: statusDescription ?? null,
          statusCategory: statusCategory ?? null,
          eshopboxShipmentId: order.shipment.eshopboxShipmentId ?? null,
        };
      })(),
      placedAt: order.placedAt ? new Date(order.placedAt).toISOString() : null,
      createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : null,
      updatedAt: order.updatedAt ? new Date(order.updatedAt).toISOString() : null,
    };

    return res.json(shaped);
  } catch (e: any) {
    console.error("GET /api/orders/:id error:", e);
    return res.status(500).json({ message: e?.message || "Failed to load order" });
  }
});

export default router;
