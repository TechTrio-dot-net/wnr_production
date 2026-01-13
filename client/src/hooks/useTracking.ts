/**
 * ============================================
 * USETRACKING HOOK
 * Real-time order tracking with polling
 * ============================================
 */

import { useEffect, useState, useCallback } from 'react';
import { fetchTrackingDetails, TrackingDetails, EshopboxTrackingStatus } from '@/lib/eshopbox';

interface UseTrackingOptions {
  enabled?: boolean;
  pollInterval?: number; // milliseconds
  maxRetries?: number;
}

interface UseTrackingState {
  tracking: TrackingDetails | null;
  loading: boolean;
  error: string | null;
  isDelivered: boolean;
  isRefreshing: boolean;
}

/**
 * Hook for real-time order tracking
 */
export function useTracking(
  trackingId: string | null,
  options: UseTrackingOptions = {}
): UseTrackingState & { refresh: () => Promise<void> } {
  const { enabled = true, pollInterval = 60000, maxRetries = 5 } = options;

  const [tracking, setTracking] = useState<TrackingDetails | null>(null);
  const [loading, setLoading] = useState(!!trackingId);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const fetchTracking = useCallback(async () => {
    if (!trackingId || !enabled) return;

    try {
      setError(null);
      const data = await fetchTrackingDetails(trackingId);
      setTracking(data);
      setRetryCount(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tracking';
      setError(message);

      // Retry with backoff
      if (retryCount < maxRetries) {
        setRetryCount((prev) => prev + 1);
        const backoffDelay = pollInterval * Math.pow(2, retryCount);
        setTimeout(fetchTracking, backoffDelay);
      }
    } finally {
      setLoading(false);
    }
  }, [trackingId, enabled, pollInterval, maxRetries, retryCount]);

  // Initial fetch
  useEffect(() => {
    if (trackingId && enabled) {
      fetchTracking();
    }
  }, [trackingId, enabled]);

  // Polling
  useEffect(() => {
    if (!trackingId || !enabled || !tracking) return;

    // Don't poll if delivered
    const isDelivered = tracking.status === EshopboxTrackingStatus.DELIVERED;
    if (isDelivered) return;

    const interval = setInterval(fetchTracking, pollInterval);
    return () => clearInterval(interval);
  }, [trackingId, enabled, tracking, pollInterval, fetchTracking]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchTracking();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchTracking]);

  return {
    tracking,
    loading,
    error,
    isDelivered: tracking?.status === EshopboxTrackingStatus.DELIVERED,
    isRefreshing,
    refresh,
  };
}
