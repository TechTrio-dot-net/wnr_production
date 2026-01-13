'use client';

import React, { useEffect, useState } from 'react';
import { X, Package, Truck, MapPin, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { buildUrl } from '@/lib/api';
import { getAuthHeader } from '@/lib/token';
import { getStatusDescription, EshopboxTrackingStatus } from '@/lib/eshopbox';

interface TransitStep {
  status: string;
  timestamp: string;
  description: string;
  isActive: boolean;
  isCompleted: boolean;
}

interface TransitStepsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackingId: string | null;
  currentStatus?: string | null;
}

export default function TransitStepsModal({
  isOpen,
  onClose,
  trackingId,
  currentStatus,
}: TransitStepsModalProps) {
  const [steps, setSteps] = useState<TransitStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !trackingId) return;

    const fetchTransitSteps = async () => {
      setLoading(true);
      setError(null);
      try {
        const authHeaders = getAuthHeader();
        const res = await fetch(buildUrl(`/api/eshopbox/tracking/${encodeURIComponent(trackingId)}`), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error('Failed to fetch transit steps');
        }

        const data = await res.json();
        const trackingData = data.data || data;

        // Extract status log from tracking data
        const statusLog = trackingData.statusLog || trackingData.status_log || {};
        const statusLogFirstOccurrence = trackingData.statusLogFirstOccurrence || trackingData.status_log_first_occurrence || {};
        
        // Build steps from status log
        const allSteps: TransitStep[] = [];
        
        // Get all statuses from status log (both first occurrence and regular)
        const allStatuses = new Set<string>();
        Object.keys(statusLog).forEach(key => allStatuses.add(key));
        Object.keys(statusLogFirstOccurrence).forEach(key => allStatuses.add(key));
        
        // Define status order for proper sequencing
        const statusOrder = [
          'created',
          'packed',
          'ready_to_ship',
          'out_for_pickup',
          'picked_up',
          'intransit',
          'out_for_delivery',
          'delivered',
          'failed_delivery',
          'rto_created',
          'rto_intransit',
          'rto_out_for_delivery',
          'rto_delivered',
        ];

        // Add steps from status log
        Array.from(allStatuses).forEach((statusKey) => {
          const timestamp = statusLogFirstOccurrence[statusKey] || statusLog[statusKey];
          if (timestamp) {
            const normalizedStatus = statusKey.toUpperCase().replace(/-/g, '_');
            let mappedStatus: EshopboxTrackingStatus = EshopboxTrackingStatus.PICKUP_PENDING;
            
            // Map to enum - try exact match first
            const enumValues = Object.values(EshopboxTrackingStatus) as string[];
            const exactMatch = enumValues.find(v => v.toUpperCase() === normalizedStatus);
            if (exactMatch) {
              mappedStatus = exactMatch as EshopboxTrackingStatus;
            } else {
              // Fallback mapping
              if (statusKey.includes('delivered') && !statusKey.includes('rto') && !statusKey.includes('delivery')) {
                mappedStatus = EshopboxTrackingStatus.DELIVERED;
              } else if (statusKey.includes('intransit') || statusKey.includes('in_transit') || statusKey.includes('in-transit')) {
                mappedStatus = EshopboxTrackingStatus.INTRANSIT;
              } else if (statusKey.includes('out_for_delivery') || statusKey.includes('out-for-delivery') || statusKey.includes('out for delivery')) {
                mappedStatus = EshopboxTrackingStatus.OUT_FOR_DELIVERY;
              } else if (statusKey.includes('picked_up') || statusKey.includes('picked-up') || statusKey.includes('picked up')) {
                mappedStatus = EshopboxTrackingStatus.PICKED_UP;
              } else if (statusKey.includes('failed')) {
                mappedStatus = EshopboxTrackingStatus.FAILED_DELIVERY;
              }
            }

            const description = getStatusDescription(mappedStatus);
            const currentStatusNormalized = currentStatus?.toUpperCase().replace(/-/g, '_').replace(/\s/g, '_') || '';
            const isActive = currentStatusNormalized === normalizedStatus || 
                           (currentStatusNormalized.includes('DELIVERED') && normalizedStatus.includes('DELIVERED') && !normalizedStatus.includes('DELIVERY'));
            
            const currentStatusIndex = statusOrder.findIndex(s => 
              s.toUpperCase().replace(/-/g, '_') === currentStatusNormalized ||
              currentStatusNormalized.includes(s.toUpperCase().replace(/-/g, '_'))
            );
            const stepStatusIndex = statusOrder.findIndex(s => 
              s.toUpperCase().replace(/-/g, '_') === normalizedStatus ||
              normalizedStatus.includes(s.toUpperCase().replace(/-/g, '_'))
            );
            const isCompleted = currentStatusIndex > stepStatusIndex && stepStatusIndex >= 0;

            allSteps.push({
              status: statusKey,
              timestamp,
              description,
              isActive,
              isCompleted: isCompleted || isActive,
            });
          }
        });

        // Sort by timestamp (oldest first)
        allSteps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // If no steps from status log, create basic steps from current status
        if (allSteps.length === 0 && currentStatus) {
          const normalizedStatus = currentStatus.toUpperCase();
          const description = getStatusDescription(normalizedStatus as any);
          allSteps.push({
            status: currentStatus.toLowerCase(),
            timestamp: trackingData.status_updated_at || new Date().toISOString(),
            description,
            isActive: true,
            isCompleted: false,
          });
        }

        setSteps(allSteps);
      } catch (err) {
        console.error('Error fetching transit steps:', err);
        setError(err instanceof Error ? err.message : 'Failed to load transit steps');
      } finally {
        setLoading(false);
      }
    };

    fetchTransitSteps();
  }, [isOpen, trackingId, currentStatus]);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const getStepIcon = (step: TransitStep) => {
    if (step.isCompleted) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    if (step.isActive) {
      return <Clock className="h-5 w-5 text-blue-500" />;
    }
    if (step.status.includes('failed') || step.status.includes('error')) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    if (step.status.includes('delivered')) {
      return <Package className="h-5 w-5 text-green-500" />;
    }
    if (step.status.includes('transit') || step.status.includes('delivery')) {
      return <Truck className="h-5 w-5 text-blue-500" />;
    }
    return <MapPin className="h-5 w-5 text-gray-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Transit Steps</h2>
            {trackingId && (
              <p className="mt-1 text-sm text-gray-500 font-mono">{trackingId}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-red-600">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && steps.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No transit steps available yet</p>
            </div>
          )}

          {!loading && !error && steps.length > 0 && (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={`${step.status}-${index}`}
                  className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                    step.isActive
                      ? 'border-blue-300 bg-blue-50'
                      : step.isCompleted
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getStepIcon(step)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`font-semibold ${
                          step.isActive
                            ? 'text-blue-900'
                            : step.isCompleted
                            ? 'text-green-900'
                            : 'text-gray-700'
                        }`}
                      >
                        {step.description}
                      </p>
                      {step.isActive && (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {formatDate(step.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
