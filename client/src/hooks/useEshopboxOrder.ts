/**
 * ============================================
 * CHECKOUT ESHOPBOX INTEGRATION
 * Create Eshopbox orders during checkout
 * ============================================
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CheckoutOrder {
  internalOrderId: string;
  items: Array<{
    eshopboxProductId: string;
    quantity: number;
    price: number;
  }>;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      pincode: string;
      country: string;
    };
  };
  paymentMethod: string;
}

interface CreateOrderResponse {
  success: boolean;
  message: string;
  data?: {
    internalOrderId: string;
    eshopboxOrderId: string;
    trackingId: string;
    shipmentId: string;
    labelUrl?: string;
    status: string;
  };
  error?: string;
}

/**
 * Hook to create Eshopbox orders
 */
export function useEshopboxOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const createOrder = async (orderData: CheckoutOrder): Promise<CreateOrderResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/eshopbox/orders/create-from-internal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create order');
      }

      const result: CreateOrderResponse = await response.json();

      if (result.success) {
        return result;
      } else {
        throw new Error(result.error || 'Order creation failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { createOrder, loading, error, clearError };
}

/**
 * Checkout Payment Completion Hook
 * Call this after payment is successful
 */
export async function completeCheckoutWithEshopbox(
  orderData: CheckoutOrder
): Promise<CreateOrderResponse | null> {
  try {
    const response = await fetch('/api/eshopbox/orders/create-from-internal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create order');
    }

    return await response.json();
  } catch (error) {
    console.error('Checkout Eshopbox error:', error);
    throw error;
  }
}

/**
 * Map internal order to Eshopbox format
 */
export function mapOrderToEshopboxFormat(internalOrder: any): CheckoutOrder {
  return {
    internalOrderId: internalOrder._id || internalOrder.id,
    items: internalOrder.items.map((item: any) => ({
      eshopboxProductId: item.product?.eshopboxProductId || item.productId,
      quantity: item.quantity,
      price: item.price,
    })),
    customer: {
      name: internalOrder.customerName || internalOrder.customer?.name,
      email: internalOrder.customerEmail || internalOrder.customer?.email,
      phone: internalOrder.customerPhone || internalOrder.customer?.phone,
      address: {
        line1: internalOrder.shippingAddress?.street || internalOrder.address?.line1,
        line2: internalOrder.shippingAddress?.landmark,
        city: internalOrder.shippingAddress?.city || internalOrder.address?.city,
        state: internalOrder.shippingAddress?.state || internalOrder.address?.state,
        pincode: internalOrder.shippingAddress?.pincode || internalOrder.address?.pincode,
        country: 'IN',
      },
    },
    paymentMethod: internalOrder.paymentMethod || 'PREPAID',
  };
}

export interface OrderConfirmationModalProps {
  isOpen: boolean;
  isLoading: boolean;
  orderData: CreateOrderResponse | null;
  error: string | null;
  onClose: () => void;
  onContinue: () => void;
}
