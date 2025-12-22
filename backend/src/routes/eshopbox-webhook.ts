import { Router, Request, Response } from 'express';
import { handleTrackingWebhook, getStatusDescription, getStatusCategory } from '../modules/shipments/eshopbox-tracking';
import { logger } from '../lib/logger';
import OrderModel from '../modules/orders/Order';
import { connectDB } from '../lib/db';
import { Types } from 'mongoose';
import { TrackingStatus as TrackingStatusEnum } from '../types/eshopbox';

/**
 * Compute status category from a string status value
 * This ensures we properly categorize statuses even when they come as strings
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
    (normalized.includes('DELIVERED') && !normalized.includes('DELIVERY'));
  
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

/**
 * ============================================
 * ESHOPBOX WEBHOOK HANDLER
 * ============================================
 * Receives real-time tracking updates from Eshopbox
 * Updates order status in database
 */

const router = Router();

/**
 * POST /api/webhooks/eshopbox/tracking
 * Receives tracking updates from Eshopbox
 *
 * Webhook events include:
 * - Tracking status changes (PICKUP_PENDING, INTRANSIT, DELIVERED, etc.)
 * - RTO (Return to Origin) updates
 * - Delivery failures and issues
 * 
 * Expected payload structure (from Eshopbox docs):
 * {
 *   "customerOrderNumber": "WNR_0001" or "SHIP_WNR_0001",
 *   "trackingID": "8476711506610",
 *   "status": "DELIVERED" | "INTRANSIT" | etc.,
 *   "latest_status": "Delivered",
 *   "status_updated_at": "2025-09-03 15:25:41",
 *   "courierName": "Delhivery",
 *   ...other fields
 * }
 */
router.post('/tracking', async (req: Request, res: Response) => {
  try {
    const event = req.body;

    logger.info('📩 Received Eshopbox webhook', {
      customerOrderNumber: event.customerOrderNumber,
      status: event.status,
      trackingID: event.trackingID,
      vendorOrderNumber: event.vendorOrderNumber,
    });

    // Connect to database first
    await connectDB();

    // Process the webhook (validates and caches)
    // Note: handleTrackingWebhook may throw if validation fails, but we still want to process the event
    let processedEvent: any = event;
    try {
      processedEvent = await handleTrackingWebhook(event);
    } catch (validationError) {
      // If validation fails, still try to process with raw event data
      logger.warn('⚠️ Webhook validation failed, using raw event data', { error: validationError });
      processedEvent = {
        trackingID: event.trackingID || event.trackingId,
        status: event.status || event.eventSubType || '',
        latest_status: event.latest_status || event.status || event.eventSubType || '',
        status_updated_at: event.status_updated_at || event.status_log?.updated_at || new Date().toISOString(),
      };
    }

    // Find order by customerOrderNumber or shipmentId
    // Eshopbox sends customerOrderNumber which could be:
    // - Order number (WNR_0001)
    // - Shipment ID (SHIP_WNR_0001)
    // - Internal order ID
    let order = null;
    
    if (event.customerOrderNumber) {
      // Try to find by orderNumber first
      order = await OrderModel.findOne({ 
        orderNumber: event.customerOrderNumber 
      });

      // If not found, try by shipmentId (remove SHIP_ prefix if present)
      if (!order && event.customerOrderNumber.startsWith('SHIP_')) {
        const orderNum = event.customerOrderNumber.replace(/^SHIP_/, '');
        order = await OrderModel.findOne({ orderNumber: orderNum });
      }

      // If still not found, try by _id (if it's a valid ObjectId)
      if (!order && Types.ObjectId.isValid(event.customerOrderNumber)) {
        order = await OrderModel.findById(event.customerOrderNumber);
      }
    }

    // Also try vendorOrderNumber if available
    if (!order && event.vendorOrderNumber) {
      order = await OrderModel.findOne({ orderNumber: event.vendorOrderNumber });
    }

    // Also try to find by trackingID if available (for existing shipments)
    if (!order && event.trackingID) {
      order = await OrderModel.findOne({ 
        "shipment.trackingId": event.trackingID 
      });
    }

    // Try by externalShipmentID if available
    if (!order && event.externalShipmentID) {
      order = await OrderModel.findOne({ 
        "shipment.eshopboxShipmentId": event.externalShipmentID 
      });
    }

    // If order found, update shipment tracking info
    if (order) {
      // Extract status from webhook payload (could be in status field or eventSubType)
      const rawWebhookStatus = processedEvent.status || event.status || event.eventSubType || '';
      const webhookStatus = String(rawWebhookStatus).toUpperCase().trim();
      
      console.log('Webhook: Processing status update', {
        orderNumber: order.orderNumber,
        rawStatus: rawWebhookStatus,
        normalizedStatus: webhookStatus,
        eventKeys: Object.keys(event),
      });
      
      // Compute status category and description for saving to database
      let statusDescription: string;
      let statusCategory: 'pending' | 'in-transit' | 'delivered' | 'issue';
      
      try {
        // Use computeStatusCategory for robust string matching
        statusCategory = computeStatusCategory(webhookStatus);
        
        // Try to match against TrackingStatus enum for description
        const matchingEnum = Object.values(TrackingStatusEnum).find(
          (enumVal) => String(enumVal).toUpperCase() === webhookStatus
        ) as TrackingStatusEnum | undefined;
        
        if (matchingEnum) {
          statusDescription = getStatusDescription(matchingEnum);
        } else {
          // Fallback: format the status string nicely
          statusDescription = webhookStatus.replace(/_/g, ' ').toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      } catch (e) {
        console.error('Error computing webhook status:', e);
        statusCategory = computeStatusCategory(webhookStatus);
        statusDescription = webhookStatus.replace(/_/g, ' ').toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      
      console.log('Webhook: Computed status', {
        statusCategory,
        statusDescription,
        webhookStatus,
      });

      // Extract tracking ID from multiple possible fields
      const trackingId = processedEvent.trackingID || 
                        event.trackingID || 
                        event.trackingId || 
                        event.track_payload?.[0]?.trackingID ||
                        order.shipment?.trackingId;

      // Extract courier name if available
      const courierName = event.courierName || 
                         event.courier_account || 
                         order.shipment?.courierName;

      const shipmentUpdate: any = {
        trackingId,
        status: webhookStatus,
        latest_status: processedEvent.latest_status || webhookStatus,
        status_updated_at: processedEvent.status_updated_at || 
                          event.status_updated_at || 
                          event.status_log?.updated_at || 
                          event.updated_at ||
                          new Date().toISOString(),
        statusCategory, // Save computed category to database
        statusDescription, // Save computed description to database
        updatedAt: new Date(),
      };

      // Update courier name if provided
      if (courierName) {
        shipmentUpdate.courierName = courierName;
      }

      // Preserve existing shipment data
      if (order.shipment) {
        shipmentUpdate.eshopboxShipmentId = order.shipment.eshopboxShipmentId || event.externalShipmentID;
        shipmentUpdate.courierName = event.courierName || order.shipment.courierName;
        shipmentUpdate.labelUrl = order.shipment.labelUrl;
        shipmentUpdate.routingCode = event.routingCode || order.shipment.routingCode;
        shipmentUpdate.shippingMode = event.shippingMode || order.shipment.shippingMode;
        shipmentUpdate.gstin = event.gstin || order.shipment.gstin;
        shipmentUpdate.transporterID = event.transporterID || order.shipment.transporterID;
        shipmentUpdate.createdAt = order.shipment.createdAt || new Date();
      } else {
        // First time setting shipment data
        shipmentUpdate.eshopboxShipmentId = event.externalShipmentID;
        shipmentUpdate.courierName = event.courierName;
        shipmentUpdate.routingCode = event.routingCode;
        shipmentUpdate.shippingMode = event.shippingMode;
        shipmentUpdate.gstin = event.gstin;
        shipmentUpdate.transporterID = event.transporterID;
        shipmentUpdate.createdAt = new Date();
      }

      // Store full webhook payload in raw field
      shipmentUpdate.raw = event;

      // Update order with shipment tracking info
      await OrderModel.updateOne(
        { _id: order._id },
        { 
          $set: { 
            shipment: shipmentUpdate 
          } 
        }
      );

      logger.info('✅ Order updated with tracking info', {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        trackingId: shipmentUpdate.trackingId,
        status: shipmentUpdate.status,
        latest_status: shipmentUpdate.latest_status,
      });
      
      console.log('✅ Webhook: Order shipment updated', {
        orderNumber: order.orderNumber,
        status: shipmentUpdate.status,
        latest_status: shipmentUpdate.latest_status,
      });

      // 🔔 TODO: Send notification to customer (email/SMS)
      // await notifyCustomer(order, processedEvent);
    } else {
      logger.warn('⚠️ Order not found for webhook', {
        customerOrderNumber: event.customerOrderNumber,
        vendorOrderNumber: event.vendorOrderNumber,
        trackingID: event.trackingID,
      });
    }

    // Respond immediately to acknowledge receipt (Eshopbox expects quick response)
    res.status(200).json({
      success: true,
      message: 'Webhook processed',
      trackingID: processedEvent.trackingID,
      status: processedEvent.status,
      orderFound: !!order,
    });

    logger.info('✅ Webhook processed successfully', {
      trackingID: processedEvent.trackingID,
      orderFound: !!order,
    });
  } catch (error) {
    logger.error('❌ Error processing webhook', { error });
    // Still return 200 to Eshopbox to prevent retries for invalid payloads
    // But log the error for debugging
    res.status(200).json({
      success: false,
      message: 'Error processing webhook',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/webhooks/eshopbox/health
 * Health check for webhook integration
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    service: 'eshopbox-webhook',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/webhooks/eshopbox/verify
 * Verify webhook payload (optional - can add signature verification)
 */
router.post('/verify', (req: Request, res: Response) => {
  try {
    logger.info('🔍 Verifying webhook', { body: req.body });

    // TODO: Add webhook signature verification
    // Eshopbox may send custom headers for verification
    // const signature = req.headers['x-eshopbox-signature'];
    // const apiKey = req.headers['x-api-key'];
    // const isValid = verifyWebhookSignature(req.body, signature, apiKey);
    // if (!isValid) {
    //   return res.status(401).json({ valid: false });
    // }

    res.json({ valid: true, message: 'Webhook verified' });
  } catch (error) {
    logger.error('❌ Error verifying webhook', { error });
    res.status(400).json({ valid: false, error });
  }
});

export default router;
