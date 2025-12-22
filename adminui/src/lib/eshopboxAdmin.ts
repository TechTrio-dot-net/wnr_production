/**
 * ============================================
 * ADMIN FRONTEND ESHOPBOX API CLIENT
 * Manage orders and shipments via Eshopbox
 * ============================================
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
import { authHeaders } from './api';

/**
 * Get all Eshopbox orders
 */
export async function getEshopboxOrders(filters?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const response = await fetch(`${API_BASE}/api/eshopbox/orders?${params.toString()}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Eshopbox orders');
  }

  return response.json();
}

/**
 * Get single Eshopbox order
 */
export async function getEshopboxOrder(orderId: string) {
  const response = await fetch(`${API_BASE}/api/eshopbox/orders/${orderId}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch order');
  }

  return response.json();
}

/**
 * Get shipment details
 */
export async function getShipmentDetails(shipmentId: string) {
  const response = await fetch(`${API_BASE}/api/eshopbox/shipments/${shipmentId}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch shipment');
  }

  return response.json();
}

/**
 * Update shipment status
 */
export async function updateShipmentStatus(
  shipmentId: string,
  status: string
) {
  const response = await fetch(`${API_BASE}/api/eshopbox/shipments/${shipmentId}/status`, {
    method: 'PATCH',
    headers: authHeaders('application/json'),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update shipment status');
  }

  return response.json();
}

/**
 * Cancel shipment
 */
export async function cancelShipment(shipmentId: string, reason?: string) {
  const response = await fetch(`${API_BASE}/api/eshopbox/shipments/${shipmentId}/cancel`, {
    method: 'POST',
    headers: authHeaders('application/json'),
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    throw new Error('Failed to cancel shipment');
  }

  return response.json();
}

/**
 * Get tracking details
 */
export async function getTrackingStatus(trackingId: string) {
  const response = await fetch(`${API_BASE}/api/eshopbox/tracking/${trackingId}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch tracking status');
  }

  return response.json();
}

/**
 * Get multiple tracking statuses
 */
export async function getMultipleTrackingStatuses(trackingIds: string[]) {
  const response = await fetch(`${API_BASE}/api/eshopbox/tracking/batch`, {
    method: 'POST',
    headers: authHeaders('application/json'),
    body: JSON.stringify({ trackingIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch tracking statuses');
  }

  return response.json();
}

/**
 * Get tracking events/history
 */
export async function getTrackingHistory(trackingId: string) {
  const response = await fetch(`${API_BASE}/api/eshopbox/tracking/${trackingId}/history`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch tracking history');
  }

  return response.json();
}

/**
 * Webhook verification
 */
export async function verifyWebhookSignature(
  signature: string,
  payload: string
) {
  const response = await fetch(`${API_BASE}/api/webhooks/eshopbox/verify`, {
    method: 'POST',
    headers: authHeaders('application/json'),
    body: JSON.stringify({ signature, payload }),
  });

  if (!response.ok) {
    throw new Error('Failed to verify webhook');
  }

  return response.json();
}

/**
 * Get webhook health status
 */
export async function getWebhookHealth() {
  const response = await fetch(`${API_BASE}/api/webhooks/eshopbox/health`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch webhook health');
  }

  return response.json();
}

/**
 * Types
 */
export interface EshopboxOrder {
  _id: string;
  internalOrderId: string;
  eshopboxOrderId: string;
  trackingId: string;
  shipmentId: string;
  status: string;
  courierName?: string;
  labelUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentDetail {
  shipmentId: string;
  status: string;
  courierName?: string;
  trackingId?: string;
  labelUrl?: string;
  pickupDate?: string;
  deliveryDate?: string;
}

export interface TrackingStatus {
  trackingId: string;
  status: string;
  statusDescription: string;
  lastUpdate: string;
  estimatedDelivery?: string;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  status: string;
  description: string;
  timestamp: string;
  location?: string;
}
