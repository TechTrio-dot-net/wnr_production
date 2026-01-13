/**
 * ============================================
 * ORDER TRACKING COMPONENT
 * Display real-time order tracking status
 * ============================================
 */

'use client';

import React from 'react';
import {
  getStatusDescription,
  getStatusColor,
  getProgressPercentage,
  formatDate,
  getEstimatedDeliveryDate,
  EshopboxTrackingStatus,
} from '@/lib/eshopbox';
import { useTracking } from '@/hooks/useTracking';

interface OrderTrackingProps {
  trackingId: string | null;
  shipmentDate?: string;
  onDelivered?: () => void;
  onRefresh?: () => Promise<void>; // Callback to refresh order data from backend
  // Optional: Shipment data from order (updated by webhooks)
  shipmentData?: {
    status?: string | null;
    latest_status?: string | null;
    status_updated_at?: string | null;
    statusDescription?: string | null;
    statusCategory?: "pending" | "in-transit" | "delivered" | "issue" | null;
    courierName?: string | null;
  } | null;
}

/**
 * Order Tracking Status Component
 */
export const OrderTracking: React.FC<OrderTrackingProps> = ({
  trackingId,
  shipmentDate,
  onDelivered,
  onRefresh,
  shipmentData,
}) => {
  // Use shipment data from order (updated by webhooks) if available, otherwise fetch from API
  const hasShipmentData = shipmentData && (shipmentData.latest_status || shipmentData.status);
  const { tracking: apiTracking, loading, error, isDelivered: apiIsDelivered, isRefreshing, refresh } = useTracking(
    trackingId,
    {
      enabled: !!trackingId && !hasShipmentData, // Only fetch from API if we don't have shipment data
      pollInterval: 60000, // 1 minute
    }
  );

  const [refreshing, setRefreshing] = React.useState(false);

  // Prefer shipment data from order (webhook-updated) over API tracking
  const tracking = React.useMemo(() => {
    if (hasShipmentData && shipmentData) {
      const status = (shipmentData.latest_status || shipmentData.status || 'PICKUP_PENDING').toUpperCase();
      // Map status to EshopboxTrackingStatus enum
      let mappedStatus: EshopboxTrackingStatus = EshopboxTrackingStatus.PICKUP_PENDING;
      if (Object.values(EshopboxTrackingStatus).includes(status as EshopboxTrackingStatus)) {
        mappedStatus = status as EshopboxTrackingStatus;
      } else {
        // Fallback mapping for common statuses
        if (status.includes('DELIVERED')) mappedStatus = EshopboxTrackingStatus.DELIVERED;
        else if (status.includes('INTRANSIT') || status.includes('IN_TRANSIT')) mappedStatus = EshopboxTrackingStatus.INTRANSIT;
        else if (status.includes('OUT_FOR_DELIVERY') || status.includes('OUT FOR DELIVERY')) mappedStatus = EshopboxTrackingStatus.OUT_FOR_DELIVERY;
        else if (status.includes('PICKED_UP') || status.includes('PICKED UP')) mappedStatus = EshopboxTrackingStatus.PICKED_UP;
        else if (status.includes('FAILED')) mappedStatus = EshopboxTrackingStatus.FAILED_DELIVERY;
      }
      
      return {
        trackingID: trackingId || '',
        status: mappedStatus,
        latest_status: shipmentData.latest_status || shipmentData.status || '',
        status_updated_at: shipmentData.status_updated_at || shipmentDate || new Date().toISOString(),
        courierName: shipmentData.courierName || null,
      };
    }
    return apiTracking;
  }, [hasShipmentData, shipmentData, trackingId, shipmentDate, apiTracking]);

  // Check if delivered based on tracking status
  const isDelivered = tracking?.status === EshopboxTrackingStatus.DELIVERED || 
                     tracking?.status === EshopboxTrackingStatus.RTO_DELIVERED ||
                     shipmentData?.statusCategory === 'delivered' ||
                     apiIsDelivered;

  React.useEffect(() => {
    if (isDelivered && onDelivered) {
      onDelivered();
    }
  }, [isDelivered, onDelivered]);

  if (!trackingId) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 text-center text-gray-600">
        No tracking information available yet. We'll update you soon.
      </div>
    );
  }

  // Show loading only if we don't have shipment data and API is loading
  if (loading && !hasShipmentData) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-32 rounded bg-gray-200"></div>
          <div className="h-8 w-full rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  // Show error only if we don't have shipment data and there's an API error
  if (error && !hasShipmentData) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-600">
        <p className="font-semibold">Unable to load tracking</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="mt-2 text-sm font-medium underline hover:no-underline disabled:opacity-50"
        >
          {isRefreshing ? 'Refreshing...' : 'Try again'}
        </button>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 text-center text-gray-600">
        Tracking information not available
      </div>
    );
  }

  // Compute status description and category on-the-fly (not from saved data)
  const description = getStatusDescription(tracking.status as EshopboxTrackingStatus);
  
  // Determine status category for color/progress - compute on-the-fly
  const statusCategory = 
    (tracking.status === EshopboxTrackingStatus.DELIVERED || tracking.status === EshopboxTrackingStatus.RTO_DELIVERED ? 'delivered' :
     tracking.status === EshopboxTrackingStatus.INTRANSIT || tracking.status === EshopboxTrackingStatus.OUT_FOR_DELIVERY || tracking.status === EshopboxTrackingStatus.PICKED_UP ? 'in-transit' :
     tracking.status === EshopboxTrackingStatus.FAILED_DELIVERY || tracking.status === EshopboxTrackingStatus.LOST || tracking.status === EshopboxTrackingStatus.DAMAGED ? 'issue' :
     'pending');
  
  const statusColor = statusCategory === 'delivered' ? 'green' :
                      statusCategory === 'in-transit' ? 'blue' :
                      statusCategory === 'issue' ? 'red' :
                      'yellow';
  
  const progress = statusCategory === 'delivered' ? 100 :
                   statusCategory === 'in-transit' ? 60 :
                   statusCategory === 'issue' ? 0 :
                   20;
  
  const estimatedDelivery = getEstimatedDeliveryDate(
    shipmentDate || tracking.status_updated_at,
    tracking.status as EshopboxTrackingStatus
  );

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  const progressColors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    gray: 'bg-gray-500',
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Tracking ID</p>
          <p className="font-mono text-lg font-semibold">{tracking.trackingID}</p>
        </div>
        <button
          onClick={async () => {
            // Refresh from API if not using shipment data, otherwise refresh order from backend
            if (hasShipmentData && onRefresh) {
              setRefreshing(true);
              try {
                await onRefresh();
              } finally {
                setRefreshing(false);
              }
            } else {
              await refresh();
            }
          }}
          disabled={isRefreshing || refreshing}
          className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          {(isRefreshing || refreshing) ? 'Updating...' : 'Refresh'}
        </button>
      </div>

      {/* Status Badge */}
      <div
        className={`inline-block rounded-full border px-4 py-2 text-sm font-semibold ${colorClasses[statusColor]}`}
      >
        {description}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Delivery Progress</span>
          <span className="font-semibold">{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full transition-all duration-500 ${progressColors[statusColor]}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3 border-t border-gray-200 pt-4">
        <h4 className="text-sm font-semibold text-gray-700">Timeline</h4>
        <div className="space-y-2 text-sm">
          <TimelineItem status="Ordered" time={shipmentDate} isActive={true} />
          <TimelineItem
            status="Picked Up"
            time={
              tracking.status !== EshopboxTrackingStatus.PICKUP_PENDING
                ? tracking.status_updated_at
                : undefined
            }
            isActive={
              [
                EshopboxTrackingStatus.PICKED_UP,
                EshopboxTrackingStatus.INTRANSIT,
                EshopboxTrackingStatus.OUT_FOR_DELIVERY,
                EshopboxTrackingStatus.DELIVERED,
              ].includes(tracking.status as EshopboxTrackingStatus)
            }
          />
          <TimelineItem
            status="In Transit"
            time={
              tracking.status !== EshopboxTrackingStatus.INTRANSIT ? undefined : tracking.status_updated_at
            }
            isActive={
              [
                EshopboxTrackingStatus.INTRANSIT,
                EshopboxTrackingStatus.OUT_FOR_DELIVERY,
                EshopboxTrackingStatus.DELIVERED,
              ].includes(tracking.status as EshopboxTrackingStatus)
            }
          />
          <TimelineItem
            status="Out for Delivery"
            time={
              tracking.status === EshopboxTrackingStatus.OUT_FOR_DELIVERY ? tracking.status_updated_at : undefined
            }
            isActive={
              [
                EshopboxTrackingStatus.OUT_FOR_DELIVERY,
                EshopboxTrackingStatus.DELIVERED,
              ].includes(tracking.status as EshopboxTrackingStatus)
            }
          />
          <TimelineItem
            status="Delivered"
            time={tracking.status === EshopboxTrackingStatus.DELIVERED ? tracking.status_updated_at : undefined}
            isActive={tracking.status === EshopboxTrackingStatus.DELIVERED}
          />
        </div>
      </div>

      {/* Estimated Delivery */}
      {estimatedDelivery && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm">
          <p className="text-blue-900">
            <strong>Estimated Delivery:</strong> {estimatedDelivery}
          </p>
        </div>
      )}

      {/* Last Update */}
      <div className="text-xs text-gray-500">
        Last updated: {formatDate(tracking.status_updated_at)}
      </div>
    </div>
  );
};

/**
 * Timeline Item Component
 */
interface TimelineItemProps {
  status: string;
  time?: string;
  isActive: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ status, time, isActive }) => {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 h-3 w-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
      <div className="flex-1">
        <p className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>{status}</p>
        {time && <p className="text-xs text-gray-500">{formatDate(time)}</p>}
      </div>
    </div>
  );
};

export default OrderTracking;
