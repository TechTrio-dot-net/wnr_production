import { getAccessToken } from '../../lib/eshopbox';
import { logger } from '../../lib/logger';
import type {
  EshopboxCreateOrder,
  EshopboxOrderResponse,
  EshopboxErrorResponse,
} from '../../types/eshopbox';
import { EshopboxCreateOrderSchema } from '../../types/eshopbox';

/**
 * ============================================
 * ESHOPBOX ORDER SERVICE
 * ============================================
 * Handles order creation, shipment management
 * Uses the Wrapper API for quick orders
 */

const ESHOPBOX_BASE = process.env.ESHOPBOX_BASE || 'https://wms.eshopbox.com';

/**
 * Creates an order and shipment in one request using the Wrapper API
 * This handles: order creation, shipment creation, and label generation
 *
 * @param orderData - Order details
 * @returns Order response with tracking ID
 */
export async function createEshopboxOrder(
  orderData: Partial<EshopboxCreateOrder>,
): Promise<EshopboxOrderResponse> {
  try {
    logger.info('📦 Creating Eshopbox order...', {
      customerOrderId: orderData.customerOrderId,
      shipmentId: orderData.shipmentId,
    });

    // Validate request body
    const validatedData = EshopboxCreateOrderSchema.parse(orderData);

    // Get access token
    const accessToken = await getAccessToken();

    // Create order via Wrapper API
    const endpoint = `${ESHOPBOX_BASE}/api/v1/shipping/order`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(validatedData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('❌ Eshopbox order creation failed', {
        status: response.status,
        error: errorText,
      });

      throw new Error(
        `Eshopbox API error: ${response.status} - ${errorText}`,
      );
    }

    const result = await response.json();

    logger.info('✅ Eshopbox order created successfully', {
      customerOrderId: orderData.customerOrderId,
      trackingId: result.trackingID || result.trackingId,
      orderId: result.orderId || result.id,
    });

    return {
      status: 'success',
      orderId: result.orderId || result.id,
      shipmentId: result.shipmentId,
      trackingId: result.trackingID || result.trackingId,
      message: 'Order created successfully',
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('❌ Failed to create Eshopbox order', { error });
    throw error;
  }
}

/**
 * Get shipment details
 *
 * @param externalShipmentId - The shipment ID
 * @returns Shipment details
 */
export async function getShipment(
  externalShipmentId: string,
): Promise<Record<string, any>> {
  try {
    logger.info('📋 Fetching shipment details', { shipmentId: externalShipmentId });

    const accessToken = await getAccessToken();

    const endpoint = `${ESHOPBOX_BASE}/api/order/shipment/${externalShipmentId}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      logger.error('❌ Failed to fetch shipment', { status: response.status });
      throw new Error(`Failed to fetch shipment: ${response.status}`);
    }

    const shipment = await response.json();
    logger.info('✅ Shipment details retrieved', { shipmentId: externalShipmentId });
    return shipment;
  } catch (error) {
    logger.error('❌ Error fetching shipment', { error });
    throw error;
  }
}

/**
 * Get all shipments with pagination
 *
 * @param params - Query parameters (limit, offset, etc.)
 * @returns List of shipments
 */
export async function getAllShipments(params?: Record<string, any>): Promise<any[]> {
  try {
    logger.info('📋 Fetching all shipments', { params });

    const accessToken = await getAccessToken();

    const queryString = new URLSearchParams(params || {}).toString();
    const endpoint = `${ESHOPBOX_BASE}/api/order/shipment${queryString ? '?' + queryString : ''}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      logger.error('❌ Failed to fetch shipments', { status: response.status });
      throw new Error(`Failed to fetch shipments: ${response.status}`);
    }

    const shipments = await response.json();
    logger.info('✅ Shipments retrieved', { count: Array.isArray(shipments) ? shipments.length : 0 });
    return shipments;
  } catch (error) {
    logger.error('❌ Error fetching shipments', { error });
    throw error;
  }
}

/**
 * Update shipment status
 *
 * @param externalShipmentId - The shipment ID
 * @param status - New status (e.g., 'dispatched', 'cancelled')
 * @returns Update response
 */
export async function updateShipmentStatus(
  externalShipmentId: string,
  status: string,
): Promise<Record<string, any>> {
  try {
    logger.info('🔄 Updating shipment status', { shipmentId: externalShipmentId, status });

    const accessToken = await getAccessToken();

    const endpoint = `${ESHOPBOX_BASE}/api/order/shipment/${externalShipmentId}/mark/${status}`;

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      logger.error('❌ Failed to update shipment status', { status: response.status });
      throw new Error(`Failed to update shipment status: ${response.status}`);
    }

    const result = await response.json();
    logger.info('✅ Shipment status updated', {
      shipmentId: externalShipmentId,
      newStatus: status,
    });
    return result;
  } catch (error) {
    logger.error('❌ Error updating shipment status', { error });
    throw error;
  }
}

/**
 * Cancel a shipment/order
 *
 * @param externalShipmentId - The shipment ID
 * @returns Cancellation response
 */
export async function cancelShipment(externalShipmentId: string): Promise<Record<string, any>> {
  try {
    logger.warn('❌ Cancelling shipment', { shipmentId: externalShipmentId });

    const accessToken = await getAccessToken();

    const endpoint = `${ESHOPBOX_BASE}/api/order/shipment/${externalShipmentId}/mark/cancelled`;

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      logger.error('❌ Failed to cancel shipment', { status: response.status });
      throw new Error(`Failed to cancel shipment: ${response.status}`);
    }

    const result = await response.json();
    logger.info('✅ Shipment cancelled', { shipmentId: externalShipmentId });
    return result;
  } catch (error) {
    logger.error('❌ Error cancelling shipment', { error });
    throw error;
  }
}

/**
 * Build a complete order payload from your internal order data
 * Maps your DB order to Eshopbox format
 */
export function buildEshopboxOrderPayload(internalOrder: any): Partial<EshopboxCreateOrder> {
  const channelId = process.env.ESHOPBOX_CHANNEL_ID || '';
  const pickupLocationCode = process.env.ESHOPBOX_PICKUP_LOCATION_CODE || '';
  const shippingMode = process.env.ESHOPBOX_SHIPPING_MODE || 'Eshopbox Standard';
  const pkgType = process.env.ESHOPBOX_PKG_TYPE || 'box';
  const pkgLength = parseFloat(process.env.ESHOPBOX_PKG_LENGTH_CM || '12');
  const pkgBreadth = parseFloat(process.env.ESHOPBOX_PKG_BREADTH_CM || '8');
  const pkgHeight = parseFloat(process.env.ESHOPBOX_PKG_HEIGHT_CM || '9.5');
  const pkgWeight = parseFloat(process.env.ESHOPBOX_PKG_WEIGHT_G || '27');

  return {
    channelId,
    customerOrderId: internalOrder._id || internalOrder.orderId,
    shipmentId: `SHIP-${internalOrder._id}`,
    orderDate: internalOrder.createdAt
      ? new Date(internalOrder.createdAt).toISOString().replace('T', ' ').slice(0, 19)
      : new Date().toISOString().replace('T', ' ').slice(0, 19),
    isCOD: internalOrder.paymentMethod === 'COD' || internalOrder.isCOD === true,
    invoiceTotal: internalOrder.totalAmount || internalOrder.total || 0,
    balanceDue:
      internalOrder.paymentMethod === 'COD' ? internalOrder.totalAmount || 0 : 0,
    shippingMode,
    invoice: {
      number: `INV-${internalOrder._id}`,
      date: internalOrder.createdAt
        ? new Date(internalOrder.createdAt).toISOString().replace('T', ' ').slice(0, 19)
        : new Date().toISOString().replace('T', ' ').slice(0, 19),
    },
    shippingAddress: {
      customerName: internalOrder.shippingAddress?.name || internalOrder.user?.name || 'Customer',
      addressLine1: internalOrder.shippingAddress?.addressLine1 || '',
      addressLine2: internalOrder.shippingAddress?.addressLine2 || '',
      city: internalOrder.shippingAddress?.city || '',
      state: internalOrder.shippingAddress?.state || '',
      pincode: internalOrder.shippingAddress?.pincode || '',
      country: internalOrder.shippingAddress?.country || 'India',
      email: internalOrder.user?.email || '',
      contactPhone: internalOrder.shippingAddress?.phone || internalOrder.user?.phone || '',
    },
    billingIsShipping: true,
    items: (internalOrder.items || []).map((item: any) => ({
      itemID: item.product?._id || item.productId || item.sku || '',
      productTitle: item.product?.name || item.productName || '',
      quantity: item.quantity || 1,
      itemTotal: (item.price || 0) * (item.quantity || 1),
      mrp: item.product?.mrp || item.price || 0,
      discount: item.discount || 0,
      itemWeight: item.product?.weight || 100, // grams
    })),
    shipmentDimension: {
      length: pkgLength,
      breadth: pkgBreadth,
      height: pkgHeight,
      weight: pkgWeight,
    },
    pickupLocation: {
      locationCode: pickupLocationCode,
    },
    package: {
      type: pkgType,
    },
  };
}
