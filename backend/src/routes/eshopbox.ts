import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth';
import { logger } from '../lib/logger';
import {
  createEshopboxOrder,
  getShipment,
  getAllShipments,
  updateShipmentStatus,
  cancelShipment,
  buildEshopboxOrderPayload,
} from '../modules/shipments/eshopbox-orders';
import { getTrackingDetails, getTrackedStatus } from '../modules/shipments/eshopbox-tracking';
import { getAccessToken, getTokenInfo } from '../lib/eshopbox';

/**
 * ============================================
 * ESHOPBOX MANAGEMENT API ROUTES
 * ============================================
 * Admin endpoints for managing orders and shipments
 */

const router = Router();

// Middleware: Most routes require auth, but tracking endpoints are accessible to users too
// We'll apply requireAuth per route where needed

/**
 * POST /api/eshopbox/orders/create
 * Create an order in Eshopbox
 * Requires authentication
 * 
 * Body:
 * {
 *   "orderData": { ...EshopboxCreateOrder }
 * }
 */
router.post('/orders/create', requireAuth, async (req: Request, res: Response) => {
  try {
    logger.info('📦 Creating Eshopbox order via API');

    const { orderData } = req.body;

    if (!orderData) {
      return res.status(400).json({
        error: 'orderData is required',
      });
    }

    const result = await createEshopboxOrder(orderData);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error creating Eshopbox order', { error });
    res.status(500).json({
      error: 'Failed to create order',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/eshopbox/orders/create-from-internal
 * Create Eshopbox order from internal order data
 * Requires authentication
 * 
 * Body:
 * {
 *   "internalOrder": { ...internal order object }
 * }
 */
router.post('/orders/create-from-internal', requireAuth, async (req: Request, res: Response) => {
  try {
    logger.info('📦 Creating Eshopbox order from internal order');

    const { internalOrder } = req.body;

    if (!internalOrder) {
      return res.status(400).json({
        error: 'internalOrder is required',
      });
    }

    // Build Eshopbox payload from internal order
    const orderPayload = buildEshopboxOrderPayload(internalOrder);

    const result = await createEshopboxOrder(orderPayload);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error creating Eshopbox order from internal data', { error });
    res.status(500).json({
      error: 'Failed to create order',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/eshopbox/shipments/:shipmentId
 * Get shipment details
 * Requires authentication
 */
router.get('/shipments/:shipmentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { shipmentId } = req.params;

    if (!shipmentId) {
      return res.status(400).json({
        error: 'shipmentId is required',
      });
    }

    const shipment = await getShipment(shipmentId!);

    res.json({
      success: true,
      data: shipment,
    });
  } catch (error) {
    logger.error('Error fetching shipment', { error });
    res.status(500).json({
      error: 'Failed to fetch shipment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/eshopbox/shipments
 * Get all shipments with pagination
 * Requires authentication
 * 
 * Query params:
 * ?limit=50&offset=0
 */
router.get('/shipments', requireAuth, async (req: Request, res: Response) => {
  try {
    const { limit, offset, ...otherParams } = req.query;

    const params = {
      ...(limit && { limit }),
      ...(offset && { offset }),
      ...otherParams,
    };

    const shipments = await getAllShipments(params);

    res.json({
      success: true,
      count: Array.isArray(shipments) ? shipments.length : 0,
      data: shipments,
    });
  } catch (error) {
    logger.error('Error fetching shipments', { error });
    res.status(500).json({
      error: 'Failed to fetch shipments',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/eshopbox/shipments/:shipmentId/status
 * Update shipment status
 * Requires authentication
 * 
 * Body:
 * {
 *   "status": "dispatched" | "cancelled" | etc.
 * }
 */
router.put('/shipments/:shipmentId/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { shipmentId } = req.params;
    const { status } = req.body;

    if (!shipmentId) {
      return res.status(400).json({
        error: 'shipmentId is required',
      });
    }

    if (!status) {
      return res.status(400).json({
        error: 'status is required',
      });
    }

    const result = await updateShipmentStatus(shipmentId!, status);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error updating shipment status', { error });
    res.status(500).json({
      error: 'Failed to update shipment status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/eshopbox/shipments/:shipmentId
 * Cancel a shipment
 * Requires authentication
 */
router.delete('/shipments/:shipmentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { shipmentId } = req.params;

    if (!shipmentId) {
      return res.status(400).json({
        error: 'shipmentId is required',
      });
    }

    const result = await cancelShipment(shipmentId!);

    res.json({
      success: true,
      message: 'Shipment cancelled',
      data: result,
    });
  } catch (error) {
    logger.error('Error cancelling shipment', { error });
    res.status(500).json({
      error: 'Failed to cancel shipment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/eshopbox/tracking
 * Get tracking details for multiple shipments
 * Public endpoint - users can track their orders
 * 
 * Body:
 * {
 *   "trackingIds": ["track1", "track2", ...]
 * }
 */
router.post('/tracking', async (req: Request, res: Response) => {
  try {
    const { trackingIds } = req.body;

    if (!trackingIds || !Array.isArray(trackingIds) || trackingIds.length === 0) {
      return res.status(400).json({
        error: 'trackingIds array is required',
      });
    }

    const tracking = await getTrackingDetails(trackingIds);

    res.json({
      success: true,
      count: tracking.length,
      data: tracking,
    });
  } catch (error) {
    logger.error('Error fetching tracking details', { error });
    res.status(500).json({
      error: 'Failed to fetch tracking details',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/eshopbox/tracking/:trackingId
 * Get tracking status from cache or API
 * Public endpoint - users can track their orders
 * If not in cache, fetches from Eshopbox API
 */
router.get('/tracking/:trackingId', async (req: Request, res: Response) => {
  try {
    const { trackingId } = req.params;

    if (!trackingId) {
      return res.status(400).json({
        error: 'trackingId is required',
      });
    }

    // First check cache
    let tracking = getTrackedStatus(trackingId!);

    // If not in cache, fetch from Eshopbox API
    if (!tracking) {
      try {
        const trackingData = await getTrackingDetails(trackingId!);
        tracking = trackingData[0] || null;
      } catch (fetchError) {
        logger.warn('Failed to fetch tracking from API, returning 404', {
          trackingId,
          error: fetchError,
        });
      }
    }

    if (!tracking) {
      return res.status(404).json({
        error: 'Tracking not found',
        message: 'No tracking data available for this ID',
      });
    }

    res.json({
      success: true,
      data: tracking,
    });
  } catch (error) {
    logger.error('Error fetching tracking status', { error });
    res.status(500).json({
      error: 'Failed to fetch tracking status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/eshopbox/status
 * Get current Eshopbox integration status
 * Requires authentication
 */
router.get('/status', requireAuth, (req: Request, res: Response) => {
  try {
    const tokenInfo = getTokenInfo();

    res.json({
      success: true,
      data: {
        token: tokenInfo,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error fetching status', { error });
    res.status(500).json({
      error: 'Failed to fetch status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/eshopbox/webhook/register
 * Register webhook URL with Eshopbox
 * Requires authentication
 * 
 * Body:
 * {
 *   "webhookUrl": "https://yourdomain.com/api/webhooks/eshopbox/tracking",
 *   "webhookHeaders": { "x-api-key": "your-key" } // optional
 * }
 */
router.post('/webhook/register', requireAuth, async (req: Request, res: Response) => {
  try {
    const { 
      webhookUrl, 
      webhookHeaders, 
      registerReturns = false,
      externalChannelID,
      registerInventory = false,
    } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({
        error: 'webhookUrl is required',
      });
    }

    const { registerShipmentWebhook, registerReturnWebhook, registerInventoryWebhook } = await import('../lib/eshopbox-webhook-register');

    const shipmentResult = await registerShipmentWebhook(webhookUrl, webhookHeaders, externalChannelID);
    
    let returnResult = null;
    if (registerReturns) {
      returnResult = await registerReturnWebhook(webhookUrl, webhookHeaders, externalChannelID);
    }

    let inventoryResult = null;
    if (registerInventory) {
      inventoryResult = await registerInventoryWebhook(webhookUrl, webhookHeaders, externalChannelID);
    }

    res.json({
      success: shipmentResult.success && (!registerReturns || returnResult?.success) && (!registerInventory || inventoryResult?.success),
      shipment: shipmentResult,
      return: returnResult,
      inventory: inventoryResult,
    });
  } catch (error) {
    logger.error('Error registering webhook', { error });
    res.status(500).json({
      error: 'Failed to register webhook',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
