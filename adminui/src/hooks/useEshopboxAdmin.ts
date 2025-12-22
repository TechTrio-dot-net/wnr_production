/**
 * ============================================
 * ADMIN FRONTEND ESHOPBOX HOOKS
 * React hooks for Eshopbox management
 * ============================================
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  getEshopboxOrders,
  getEshopboxOrder,
  getShipmentDetails,
  updateShipmentStatus,
  cancelShipment,
  getTrackingStatus,
  getMultipleTrackingStatuses,
  getTrackingHistory,
  type EshopboxOrder,
  type ShipmentDetail,
  type TrackingStatus,
} from '@/lib/eshopboxAdmin';

/**
 * Hook to fetch Eshopbox orders
 */
export function useEshopboxOrders(filters?: { status?: string; page?: number; limit?: number }) {
  const [data, setData] = useState<EshopboxOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 20 });

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getEshopboxOrders(filters);
      setData(result.data || []);
      setPagination(result.pagination || { page: 1, total: 0, limit: 20 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, pagination, refetch: fetch };
}

/**
 * Hook to fetch single Eshopbox order
 */
export function useEshopboxOrder(orderId?: string) {
  const [data, setData] = useState<EshopboxOrder | null>(null);
  const [loading, setLoading] = useState(!!orderId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getEshopboxOrder(orderId);
        setData(result.data || result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch order');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [orderId]);

  return { data, loading, error };
}

/**
 * Hook to manage shipment
 */
export function useShipmentManagement(shipmentId?: string) {
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShipment = useCallback(async () => {
    if (!shipmentId) return;

    setLoading(true);
    setError(null);
    try {
      const result = await getShipmentDetails(shipmentId);
      setShipment(result.data || result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shipment');
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  const updateStatus = useCallback(
    async (status: string) => {
      if (!shipmentId) return;

      setLoading(true);
      setError(null);
      try {
        const result = await updateShipmentStatus(shipmentId, status);
        setShipment(result.data || result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update status';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [shipmentId]
  );

  const cancel = useCallback(
    async (reason?: string) => {
      if (!shipmentId) return;

      setLoading(true);
      setError(null);
      try {
        const result = await cancelShipment(shipmentId, reason);
        setShipment(result.data || result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel shipment';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [shipmentId]
  );

  useEffect(() => {
    fetchShipment();
  }, [fetchShipment]);

  return { shipment, loading, error, updateStatus, cancel, refetch: fetchShipment };
}

/**
 * Hook to fetch tracking status
 */
export function useTrackingStatus(trackingId?: string) {
  const [tracking, setTracking] = useState<TrackingStatus | null>(null);
  const [loading, setLoading] = useState(!!trackingId);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!trackingId) return;

    setLoading(true);
    setError(null);
    try {
      const result = await getTrackingStatus(trackingId);
      setTracking(result.data || result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tracking');
    } finally {
      setLoading(false);
    }
  }, [trackingId]);

  useEffect(() => {
    fetch();
    // Poll every 60 seconds for updates
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { tracking, loading, error, refetch: fetch };
}

/**
 * Hook to fetch multiple tracking statuses
 */
export function useMultipleTrackingStatuses(trackingIds: string[]) {
  const [data, setData] = useState<Record<string, TrackingStatus>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (trackingIds.length === 0) {
      setData({});
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getMultipleTrackingStatuses(trackingIds);
      setData(result.data || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tracking statuses');
    } finally {
      setLoading(false);
    }
  }, [trackingIds]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Hook to fetch tracking history
 */
type TrackingEvent = {
  description?: string;
  timestamp?: string | number | Date;
  [key: string]: unknown;
};

export function useTrackingHistory(trackingId?: string) {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(!!trackingId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackingId) return;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getTrackingHistory(trackingId);
        setEvents(result.data?.events || result.events || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch history');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [trackingId]);

  return { events, loading, error };
}
