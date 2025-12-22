/**
 * ============================================
 * ADMIN ORDER MANAGEMENT COMPONENT
 * Manage orders, shipments, and bulk operations
 * ============================================
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useEshopboxOrders } from '@/hooks/useEshopboxAdmin';
import { cancelShipment } from '@/lib/eshopboxAdmin';
import AdminShipmentTracking from './AdminShipmentTracking';
import { HiTrash, HiEye, HiRefresh, HiDownload } from 'react-icons/hi';
import { toast } from 'sonner';

/**
 * Admin Orders List Component
 */
export const AdminOrdersList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: orders, loading, error, pagination, refetch } = useEshopboxOrders({
    page,
    limit: 20,
    status: statusFilter || undefined,
  });

  const handleSelectAll = useCallback(() => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map((o) => o._id)));
    }
  }, [orders, selectedOrders]);

  const handleSelectOrder = useCallback((orderId: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }, []);

  const handleCancelShipment = useCallback(
    async (shipmentId: string) => {
      try {
        await cancelShipment(shipmentId, 'Cancelled by admin');
        toast.success('Shipment cancelled successfully');
        refetch();
      } catch {
        toast.error('Failed to cancel shipment');
      }
    },
    [refetch]
  );

  const handleRefresh = async () => {
    await refetch();
    toast.success('Orders refreshed');
  };

  const handleDownloadLabel = async (labelUrl: string) => {
    if (!labelUrl) {
      toast.error('No label available');
      return;
    }
    try {
      window.open(labelUrl, '_blank');
    } catch {
      toast.error('Failed to download label');
    }
  };

  if (error && !orders.length) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <p className="font-semibold text-red-900">Error loading orders</p>
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-2 text-sm font-medium text-red-600 underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="created">Created</option>
            <option value="picked_up">Picked Up</option>
            <option value="in_transit">In Transit</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <HiRefresh className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {selectedOrders.size > 0 && (
          <div className="text-sm font-medium text-gray-600">
            {selectedOrders.size} selected
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedOrders.size === orders.length && orders.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left font-semibold">Order ID</th>
              <th className="px-4 py-3 text-left font-semibold">Tracking ID</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Courier</th>
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {loading ? 'Loading orders...' : 'No orders found'}
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <React.Fragment key={order._id}>
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order._id)}
                        onChange={() => handleSelectOrder(order._id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      {order.internalOrderId}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{order.trackingId}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          order.status === 'delivered'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{order.courierName || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            setExpandedOrder(expandedOrder === order._id ? null : order._id)
                          }
                          title="View details"
                          className="rounded p-1 hover:bg-gray-100"
                        >
                          <HiEye className="h-4 w-4 text-gray-600" />
                        </button>
                        {order.labelUrl && (
                          <button
                            onClick={() => handleDownloadLabel(order.labelUrl!)}
                            title="Download label"
                            className="rounded p-1 hover:bg-gray-100"
                          >
                            <HiDownload className="h-4 w-4 text-gray-600" />
                          </button>
                        )}
                        {order.status !== 'delivered' && (
                          <button
                            onClick={() => handleCancelShipment(order.shipmentId)}
                            title="Cancel shipment"
                            className="rounded p-1 hover:bg-red-50"
                          >
                            <HiTrash className="h-4 w-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Details */}
                  {expandedOrder === order._id && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="px-4 py-4">
                        <AdminShipmentTracking
                          trackingId={order.trackingId}
                          shipmentId={order.shipmentId}
                          onCancel={handleCancelShipment}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * pagination.limit + 1} to{' '}
            {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} orders
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm font-semibold text-gray-600">
              Page {page} of {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <button
              onClick={() => setPage(Math.min(Math.ceil(pagination.total / pagination.limit), page + 1))}
              disabled={page * pagination.limit >= pagination.total}
              className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersList;
