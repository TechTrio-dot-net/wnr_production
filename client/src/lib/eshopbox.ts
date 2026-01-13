/**
 * ============================================
 * ESHOPBOX INTEGRATION HOOKS & UTILITIES
 * User Frontend (wildnroot.com)
 * ============================================
 * Handles order creation with Eshopbox tracking
 * and real-time order status updates
 */

import { buildUrl } from './api';
import { getAuthHeader } from './token';

/**
 * Eshopbox Tracking Status
 */
export enum EshopboxTrackingStatus {
  PICKUP_PENDING = 'PICKUP_PENDING',
  PICKUP_FAILED = 'PICKUP_FAILED',
  OUT_FOR_PICKUP = 'OUT_FOR_PICKUP',
  PICKED_UP = 'PICKED_UP',
  INTRANSIT = 'INTRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED_DELIVERY = 'FAILED_DELIVERY',
  CANCELLED_ORDER = 'CANCELLED_ORDER',
  SHIPMENT_DELAYED = 'SHIPMENT_DELAYED',
  LOST = 'LOST',
  DAMAGED = 'DAMAGED',
  RTO_REQUESTED = 'RTO_REQUESTED',
  RTO = 'RTO',
  RTO_DELIVERED = 'RTO_DELIVERED',
}

/**
 * Order with Eshopbox tracking
 */
export interface OrderWithTracking {
  _id: string;
  orderNumber: string;
  total: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  createdAt: string;
  items: Array<{
    product: { _id: string; name: string; price: number };
    quantity: number;
    price: number;
  }>;
  shipment?: {
    trackingId: string;
    status: EshopboxTrackingStatus;
    eshopboxOrderId: string;
    eshopboxShipmentId: string;
    lastUpdate: string;
  };
}

/**
 * Tracking status details
 */
export interface TrackingDetails {
  trackingID: string;
  status: EshopboxTrackingStatus;
  latest_status: string;
  status_updated_at: string;
}

/**
 * Get status description for display
 */
export function getStatusDescription(status: EshopboxTrackingStatus): string {
  const descriptions: Record<EshopboxTrackingStatus, string> = {
    [EshopboxTrackingStatus.PICKUP_PENDING]: 'Awaiting carrier pickup',
    [EshopboxTrackingStatus.PICKUP_FAILED]: 'Pickup failed - rescheduling',
    [EshopboxTrackingStatus.OUT_FOR_PICKUP]: 'Out for pickup',
    [EshopboxTrackingStatus.PICKED_UP]: 'Picked up by carrier',
    [EshopboxTrackingStatus.INTRANSIT]: 'In transit to you',
    [EshopboxTrackingStatus.OUT_FOR_DELIVERY]: 'Out for delivery today',
    [EshopboxTrackingStatus.DELIVERED]: 'Delivered',
    [EshopboxTrackingStatus.FAILED_DELIVERY]: 'Delivery failed - will retry',
    [EshopboxTrackingStatus.CANCELLED_ORDER]: 'Order cancelled',
    [EshopboxTrackingStatus.SHIPMENT_DELAYED]: 'Shipment delayed',
    [EshopboxTrackingStatus.LOST]: 'Shipment lost in transit',
    [EshopboxTrackingStatus.DAMAGED]: 'Shipment damaged',
    [EshopboxTrackingStatus.RTO_REQUESTED]: 'Return requested',
    [EshopboxTrackingStatus.RTO]: 'Returning to warehouse',
    [EshopboxTrackingStatus.RTO_DELIVERED]: 'Returned to warehouse',
  };
  return descriptions[status] || 'Status unknown';
}

/**
 * Get status badge color
 */
export function getStatusColor(
  status: EshopboxTrackingStatus
): 'blue' | 'green' | 'yellow' | 'red' | 'gray' {
  const deliveredStatuses = [EshopboxTrackingStatus.DELIVERED, EshopboxTrackingStatus.RTO_DELIVERED];
  const issueStatuses = [
    EshopboxTrackingStatus.FAILED_DELIVERY,
    EshopboxTrackingStatus.CANCELLED_ORDER,
    EshopboxTrackingStatus.LOST,
    EshopboxTrackingStatus.DAMAGED,
  ];
  const transitStatuses = [
    EshopboxTrackingStatus.INTRANSIT,
    EshopboxTrackingStatus.OUT_FOR_DELIVERY,
    EshopboxTrackingStatus.PICKED_UP,
  ];
  const pendingStatuses = [
    EshopboxTrackingStatus.PICKUP_PENDING,
    EshopboxTrackingStatus.OUT_FOR_PICKUP,
  ];

  if (deliveredStatuses.includes(status)) return 'green';
  if (issueStatuses.includes(status)) return 'red';
  if (transitStatuses.includes(status)) return 'blue';
  if (pendingStatuses.includes(status)) return 'yellow';
  return 'gray';
}

/**
 * Fetch tracking details from cache or API
 */
export async function fetchTrackingDetails(trackingId: string): Promise<TrackingDetails> {
  if (!trackingId) {
    throw new Error('Tracking ID is required');
  }

  try {
    const headers = getAuthHeader();
    const url = buildUrl(`/api/eshopbox/tracking/${trackingId}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tracking: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Error fetching tracking details:', error);
    throw error;
  }
}

/**
 * Poll tracking status periodically
 */
export async function pollTrackingStatus(
  trackingId: string,
  intervalMs: number = 60000, // 1 minute default
  maxAttempts: number = 1440 // 24 hours with 1-minute intervals
): Promise<{ tracking: TrackingDetails; isDelivered: boolean }> {
  let attempts = 0;

  const poll = async (): Promise<{ tracking: TrackingDetails; isDelivered: boolean }> => {
    attempts++;

    try {
      const tracking = await fetchTrackingDetails(trackingId);
      const isDelivered = tracking.status === EshopboxTrackingStatus.DELIVERED;

      if (isDelivered || attempts >= maxAttempts) {
        return { tracking, isDelivered };
      }

      // Continue polling
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      return poll();
    } catch (error) {
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        return poll();
      }
      throw error;
    }
  };

  return poll();
}

/**
 * Get tracking progress percentage
 */
export function getProgressPercentage(status: EshopboxTrackingStatus): number {
  switch (status) {
    case EshopboxTrackingStatus.PICKUP_PENDING:
    case EshopboxTrackingStatus.OUT_FOR_PICKUP:
      return 20;
    case EshopboxTrackingStatus.PICKED_UP:
      return 40;
    case EshopboxTrackingStatus.INTRANSIT:
      return 60;
    case EshopboxTrackingStatus.OUT_FOR_DELIVERY:
      return 80;
    case EshopboxTrackingStatus.DELIVERED:
    case EshopboxTrackingStatus.RTO_DELIVERED:
      return 100;
    case EshopboxTrackingStatus.FAILED_DELIVERY:
    case EshopboxTrackingStatus.CANCELLED_ORDER:
    case EshopboxTrackingStatus.LOST:
    case EshopboxTrackingStatus.DAMAGED:
      return 0;
    default:
      return 50;
  }
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get estimated delivery date based on status
 */
export function getEstimatedDeliveryDate(
  shipDate: string,
  status: EshopboxTrackingStatus
): string | null {
  const shipDateObj = new Date(shipDate);
  const daysToAdd = status === EshopboxTrackingStatus.INTRANSIT ? 2 : 3;
  const estimatedDate = new Date(shipDateObj.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

  if (status === EshopboxTrackingStatus.DELIVERED) {
    return null; // Already delivered
  }

  return estimatedDate.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
