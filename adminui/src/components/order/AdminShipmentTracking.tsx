/**
 * ============================================
 * ADMIN SHIPMENT TRACKING COMPONENT
 * Display and manage shipment tracking
 * ============================================
 */

'use client';

import React, { useState } from 'react';
import { useTrackingStatus } from '@/hooks/useEshopboxAdmin';
import { HiRefresh, HiX, HiCheckCircle, HiExclamationCircle } from 'react-icons/hi';

interface AdminShipmentTrackingProps {
  trackingId: string;
  shipmentId: string;
  onCancel?: (shipmentId: string) => void;
}

/**
 * Admin Shipment Tracking Component
 */
export const AdminShipmentTracking: React.FC<AdminShipmentTrackingProps> = ({
  trackingId,
  shipmentId,
  onCancel,
}) => {
  const { tracking, loading, error, refetch } = useTrackingStatus(trackingId);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading && !tracking) {
    return (
      <div className="animate-pulse space-y-3 rounded-lg bg-gray-50 p-4">
        <div className="h-4 w-32 rounded bg-gray-200"></div>
        <div className="h-8 w-full rounded bg-gray-200"></div>
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-red-900">Tracking Error</p>
            <p className="text-sm text-red-700">{error || 'No tracking data'}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="ml-2 rounded bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    if (tracking.status.includes('delivered')) {
      return <HiCheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (tracking.status.includes('error') || tracking.status.includes('cancelled')) {
      return <HiExclamationCircle className="h-5 w-5 text-red-600" />;
    }
    return <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600"></div>;
  };

  const getStatusColor = () => {
    if (tracking.status.includes('delivered')) return 'text-green-600';
    if (tracking.status.includes('error') || tracking.status.includes('cancelled')) return 'text-red-600';
    return 'text-blue-600';
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">Tracking</p>
          <p className="font-mono text-sm font-semibold">{trackingId}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            title="Refresh tracking status"
            className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-50"
          >
            <HiRefresh className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          {onCancel && (
            <button
              onClick={() => onCancel(shipmentId)}
              title="Cancel shipment"
              className="rounded p-1.5 hover:bg-red-50"
            >
              <HiX className="h-4 w-4 text-red-600" />
            </button>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <div>
          <p className={`font-semibold ${getStatusColor()}`}>{tracking.statusDescription}</p>
          <p className="text-xs text-gray-500">
            Updated: {new Date(tracking.lastUpdate).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Estimated Delivery */}
      {tracking.estimatedDelivery && (
        <div className="rounded bg-blue-50 p-2 text-sm text-blue-900">
          <strong>Est. Delivery:</strong> {new Date(tracking.estimatedDelivery).toLocaleDateString()}
        </div>
      )}

      {/* Events Timeline */}
      {tracking.events && tracking.events.length > 0 && (
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <p className="text-xs font-semibold uppercase text-gray-500">Timeline</p>
          <div className="max-h-40 space-y-1 overflow-y-auto text-sm">
            {tracking.events.map((event: { description?: string; timestamp?: string | number | Date }, idx: number) => (
              <div key={idx} className="flex gap-2">
                <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-gray-300" />
                <div>
                  <p className="font-medium text-gray-700">{event.description || "Event"}</p>
                  <p className="text-xs text-gray-500">
                    {event.timestamp ? new Date(event.timestamp).toLocaleString() : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminShipmentTracking;
