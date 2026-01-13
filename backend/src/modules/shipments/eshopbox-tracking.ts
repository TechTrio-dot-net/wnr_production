import { getAccessToken } from '../../lib/eshopbox';
import { logger } from '../../lib/logger';
import type { EshopboxTrackingResponse, TrackingStatus } from '../../types/eshopbox';
import { EshopboxWebhookEventSchema, TrackingStatus as TrackingStatusEnum } from '../../types/eshopbox';

/**
 * ============================================
 * ESHOPBOX TRACKING SERVICE
 * ============================================
 * Handles real-time tracking status updates
 * Supports both polling and webhook-based updates
 */

const ESHOPBOX_BASE = process.env.ESHOPBOX_BASE || 'https://wms.eshopbox.com';

// In-memory store for tracking updates (in production, use MongoDB)
const trackingCache: Map<string, EshopboxTrackingResponse> = new Map();

/**
 * Get tracking details for one or multiple shipments
 * Supports up to 50 tracking IDs per request
 *
 * @param trackingIds - Array of tracking IDs (max 50)
 * @returns Array of tracking details
 */
export async function getTrackingDetails(
  trackingIds: string | string[],
): Promise<EshopboxTrackingResponse[]> {
  try {
    const ids = Array.isArray(trackingIds) ? trackingIds : [trackingIds];

    if (ids.length === 0) {
      throw new Error('At least one tracking ID is required');
    }

    if (ids.length > 50) {
      throw new Error('Maximum 50 tracking IDs allowed per request');
    }

    logger.info('📍 Fetching tracking details', { count: ids.length });

    const accessToken = await getAccessToken();

    const queryString = new URLSearchParams({
      trackingIds: ids.join(','),
    }).toString();

    const endpoint = `${ESHOPBOX_BASE}/api/v1/shipping/trackingDetails?${queryString}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      logger.error('❌ Failed to fetch tracking details', {
        status: response.status,
        trackingIds: ids,
      });
      throw new Error(`Failed to fetch tracking details: ${response.status}`);
    }

    const trackingData = await response.json();
    const results = Array.isArray(trackingData) ? trackingData : [trackingData];

    logger.info('✅ Tracking details retrieved', { count: results.length });

    // Cache the results
    results.forEach((tracking: EshopboxTrackingResponse) => {
      if (tracking.trackingID) {
        trackingCache.set(tracking.trackingID, tracking);
      }
    });

    return results;
  } catch (error) {
    logger.error('❌ Error fetching tracking details', { error });
    throw error;
  }
}

/**
 * Get tracking status from cache (useful after webhook updates)
 */
export function getTrackedStatus(trackingId: string): EshopboxTrackingResponse | null {
  return trackingCache.get(trackingId) || null;
}

/**
 * Handle webhook event from Eshopbox
 * Called when Eshopbox sends tracking updates
 *
 * @param event - Webhook event payload
 */
export async function handleTrackingWebhook(event: any) {
  try {
    logger.info('🎯 Received Eshopbox webhook event', {
      status: event.status,
      trackingId: event.trackingID,
      customerOrderNumber: event.customerOrderNumber,
    });

    // Validate webhook event
    const validatedEvent = EshopboxWebhookEventSchema.parse(event);

    // Update cache
    if (validatedEvent.trackingID) {
      trackingCache.set(validatedEvent.trackingID, {
        trackingID: validatedEvent.trackingID,
        status: validatedEvent.status,
        latest_status: validatedEvent.latest_status || validatedEvent.status,
        status_updated_at: validatedEvent.status_updated_at || new Date().toISOString(),
      });
    }

    logger.info('✅ Webhook event processed', {
      trackingId: validatedEvent.trackingID,
      status: validatedEvent.status,
    });

    return validatedEvent;
  } catch (error) {
    logger.error('❌ Error processing webhook event', { error, event });
    throw error;
  }
}

/**
 * Get human-readable status description
 */
export function getStatusDescription(status: TrackingStatus): string {
  const descriptions: Record<TrackingStatus, string> = {
    [TrackingStatusEnum.PICKUP_PENDING]: 'Awaiting pickup by carrier',
    [TrackingStatusEnum.PICKUP_FAILED]: 'Pickup failed - rescheduling required',
    [TrackingStatusEnum.CANCELLED_ORDER]: 'Order cancelled',
    [TrackingStatusEnum.OUT_FOR_PICKUP]: 'Out for pickup',
    [TrackingStatusEnum.PICKED_UP]: 'Picked up by carrier',
    [TrackingStatusEnum.INTRANSIT]: 'In transit',
    [TrackingStatusEnum.OUT_FOR_DELIVERY]: 'Out for delivery',
    [TrackingStatusEnum.SHIPMENT_DELAYED]: 'Shipment delayed',
    [TrackingStatusEnum.CONTACT_CUSTOMER_CARE]: 'Contact customer care',
    [TrackingStatusEnum.SHIPMENT_HELD]: 'Shipment held',
    [TrackingStatusEnum.LOST]: 'Shipment lost',
    [TrackingStatusEnum.DAMAGED]: 'Shipment damaged',
    [TrackingStatusEnum.FAILED_DELIVERY]: 'Delivery failed - rescheduling required',
    [TrackingStatusEnum.RTO_REQUESTED]: 'Return requested',
    [TrackingStatusEnum.RTO]: 'Returning to origin',
    [TrackingStatusEnum.RTO_OUT_FOR_DELIVERY]: 'RTO out for delivery',
    [TrackingStatusEnum.RTO_INTRANSIT]: 'RTO in transit',
    [TrackingStatusEnum.RTO_CONTACT_CUSTOMER_CARE]: 'RTO - Contact customer care',
    [TrackingStatusEnum.RTO_SHIPMENT_DELAY]: 'RTO delayed',
    [TrackingStatusEnum.RTO_DELIVERED]: 'Returned to origin',
    [TrackingStatusEnum.RTO_FAILED]: 'RTO failed',
    [TrackingStatusEnum.DELIVERED]: 'Delivered',
    [TrackingStatusEnum.PACKED]: 'Packed and ready',
    [TrackingStatusEnum.APPROVED]: 'Return approved',
    [TrackingStatusEnum.RECEIVED]: 'Return received',
    [TrackingStatusEnum.DELIVERED_WAREHOUSE]: 'Returned - QC completed',
  };

  return descriptions[status] || 'Unknown status';
}

/**
 * Get status category (useful for UI grouping)
 */
export function getStatusCategory(status: TrackingStatus): 'pending' | 'in-transit' | 'delivered' | 'issue' {
  const deliveredStatuses = [
    TrackingStatusEnum.DELIVERED,
    TrackingStatusEnum.DELIVERED_WAREHOUSE,
    TrackingStatusEnum.RTO_DELIVERED,
  ];

  const issueStatuses = [
    TrackingStatusEnum.CANCELLED_ORDER,
    TrackingStatusEnum.PICKUP_FAILED,
    TrackingStatusEnum.LOST,
    TrackingStatusEnum.DAMAGED,
    TrackingStatusEnum.FAILED_DELIVERY,
    TrackingStatusEnum.RTO_FAILED,
    TrackingStatusEnum.SHIPMENT_HELD,
    TrackingStatusEnum.CONTACT_CUSTOMER_CARE,
    TrackingStatusEnum.RTO_CONTACT_CUSTOMER_CARE,
  ];

  const transitStatuses = [
    TrackingStatusEnum.PICKED_UP,
    TrackingStatusEnum.INTRANSIT,
    TrackingStatusEnum.OUT_FOR_DELIVERY,
    TrackingStatusEnum.RTO,
    TrackingStatusEnum.RTO_INTRANSIT,
    TrackingStatusEnum.RTO_OUT_FOR_DELIVERY,
  ];

  if (deliveredStatuses.includes(status)) {
    return 'delivered';
  }
  if (issueStatuses.includes(status)) {
    return 'issue';
  }
  if (transitStatuses.includes(status)) {
    return 'in-transit';
  }
  return 'pending';
}

/**
 * Clear tracking cache (for cleanup/testing)
 */
export function clearTrackingCache() {
  logger.info('Clearing tracking cache');
  trackingCache.clear();
}

/**
 * Get cache statistics
 */
export function getTrackingCacheStats() {
  return {
    cachedItems: trackingCache.size,
    items: Array.from(trackingCache.entries()).map(([id, data]) => ({
      trackingID: id,
      status: data.status,
      lastUpdated: data.status_updated_at,
    })),
  };
}
