/**
 * ============================================
 * ORDER CONFIRMATION MODAL
 * Display after successful order creation
 * ============================================
 */

'use client';

import React from 'react';
import { OrderConfirmationModalProps } from '@/hooks/useEshopboxOrder';

/**
 * Order Confirmation Modal Component
 */
export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  isOpen,
  isLoading,
  orderData,
  error,
  onClose,
  onContinue,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {isLoading && (
          <div className="space-y-4 text-center">
            <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <h3 className="text-lg font-semibold">Creating Your Order</h3>
            <p className="text-sm text-gray-600">Please wait while we process your order...</p>
          </div>
        )}

        {error && (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 p-4">
              <h3 className="font-semibold text-red-900">Order Creation Failed</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-red-600 py-2 font-semibold text-white hover:bg-red-700"
            >
              Close
            </button>
          </div>
        )}

        {orderData && !error && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Order Confirmed!</h3>
            </div>

            <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-mono font-semibold">{orderData.data?.internalOrderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tracking ID:</span>
                <span className="font-mono font-semibold">{orderData.data?.trackingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipment ID:</span>
                <span className="font-mono font-semibold">{orderData.data?.shipmentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-semibold text-green-600">{orderData.data?.status}</span>
              </div>
            </div>

            {orderData.data?.labelUrl && (
              <a
                href={orderData.data.labelUrl}
                download
                className="block rounded-lg bg-blue-50 py-2 text-center text-sm font-semibold text-blue-600 hover:bg-blue-100"
              >
                Download Shipping Label
              </a>
            )}

            <p className="text-center text-xs text-gray-600">
              You will receive tracking updates via email and SMS
            </p>

            <button
              onClick={onContinue}
              className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Continue to Order Tracking
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderConfirmationModal;
