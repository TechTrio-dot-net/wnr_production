import { z } from 'zod';

/**
 * ============================================
 * ESHOPBOX TYPE DEFINITIONS & SCHEMAS
 * ============================================
 */

// ============ AUTHENTICATION ============
export interface EshopboxTokenResponse {
  access_token: string;
  id_token: string;
  scope: string;
  expires_in: number; // in seconds (typically 86400 = 24 hours)
  token_type: 'Bearer';
}

export interface EshopboxTokenCache {
  token: string;
  expiresAt: number; // milliseconds since epoch
  refreshedAt: number;
}

// ============ ORDER & SHIPMENT TYPES ============
export const EshopboxShippingAddressSchema = z.object({
  customerName: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  country: z.string().default('India'),
  email: z.string().email().optional(),
  contactPhone: z.string().optional(),
  gstin: z.string().optional(),
});

export type EshopboxShippingAddress = z.infer<typeof EshopboxShippingAddressSchema>;

export const EshopboxBillingAddressSchema = z.object({
  customerName: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  country: z.string().optional(),
  email: z.string().email().optional(),
  gstin: z.string().optional(),
});

export type EshopboxBillingAddress = z.infer<typeof EshopboxBillingAddressSchema>;

export const EshopboxItemSchema = z.object({
  itemID: z.string(), // SKU or product ID
  productTitle: z.string(),
  quantity: z.number().int().positive(),
  itemTotal: z.number(), // inclusive of taxes
  hsn: z.string().optional(),
  mrp: z.number().optional(),
  discount: z.number().optional().default(0),
  taxPercentage: z.number().optional().default(0),
  itemLength: z.number().optional(),
  itemBreadth: z.number().optional(),
  itemHeight: z.number().optional(),
  itemWeight: z.number().optional(),
  ean: z.string().optional(),
  productImageUrl: z.string().url().optional(),
});

export type EshopboxItem = z.infer<typeof EshopboxItemSchema>;

export const EshopboxPickupLocationSchema = z.object({
  locationCode: z.string().optional(),
  locationName: z.string().optional(),
  companyName: z.string().optional(),
  contactPerson: z.string().optional(),
  contactNumber: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstin: z.string().optional(),
});

export type EshopboxPickupLocation = z.infer<typeof EshopboxPickupLocationSchema>;

export const EshopboxPackageSchema = z.object({
  type: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  length: z.number().optional(),
  breadth: z.number().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
});

export type EshopboxPackage = z.infer<typeof EshopboxPackageSchema>;

export const EshopboxInvoiceSchema = z.object({
  number: z.string().optional(),
  date: z.string().optional(), // "2024-01-04 09:00:00"
});

export type EshopboxInvoice = z.infer<typeof EshopboxInvoiceSchema>;

export const EshopboxCreateOrderSchema = z.object({
  channelId: z.string().optional(),
  customerOrderId: z.string(),
  shipmentId: z.string(),
  orderDate: z.string().optional(), // "2024-01-01 09:00:00"
  isCOD: z.boolean(),
  invoiceTotal: z.number(),
  invoice: EshopboxInvoiceSchema.optional(),
  ewaybillNumber: z.string().optional(),
  balanceDue: z.number().optional(),
  shippingMode: z.string().optional(),
  shippingAddress: EshopboxShippingAddressSchema,
  billingIsShipping: z.boolean().optional(),
  billingAddress: EshopboxBillingAddressSchema.optional(),
  items: z.array(EshopboxItemSchema),
  shipmentDimension: z.object({
    length: z.number(),
    breadth: z.number(),
    height: z.number(),
    weight: z.number(),
  }),
  pickupLocation: EshopboxPickupLocationSchema,
  package: EshopboxPackageSchema.optional(),
});

export type EshopboxCreateOrder = z.infer<typeof EshopboxCreateOrderSchema>;

// ============ WEBHOOK EVENT TYPES ============
export const EshopboxWebhookPickupAddressSchema = z.object({
  pickup_customerName: z.string().optional(),
  pickup_addressLine1: z.string().optional(),
  pickup_addressLine2: z.string().optional(),
  pickup_city: z.string().optional(),
  pickup_state: z.string().optional(),
  pickup_postalCode: z.string().optional(),
  pickup_countryCode: z.string().optional(),
  pickup_countryName: z.string().optional(),
  pickup_contactPhone: z.string().optional(),
  pickup_email: z.string().optional(),
});

export const EshopboxWebhookDropAddressSchema = z.object({
  drop_name: z.string().optional(),
  drop_address: z.string().optional(),
  drop_pincode: z.string().optional(),
  drop_city: z.string().optional(),
  drop_country: z.string().optional(),
  drop_state: z.string().optional(),
});

// Tracking statuses from Eshopbox
export enum TrackingStatus {
  PICKUP_PENDING = 'PICKUP_PENDING',
  PICKUP_FAILED = 'PICKUP_FAILED',
  CANCELLED_ORDER = 'CANCELLED_ORDER',
  OUT_FOR_PICKUP = 'OUT_FOR_PICKUP',
  PICKED_UP = 'PICKED_UP',
  INTRANSIT = 'INTRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  SHIPMENT_DELAYED = 'SHIPMENT_DELAYED',
  CONTACT_CUSTOMER_CARE = 'CONTACT_CUSTOMER_CARE',
  SHIPMENT_HELD = 'SHIPMENT_HELD',
  LOST = 'LOST',
  DAMAGED = 'DAMAGED',
  FAILED_DELIVERY = 'FAILED_DELIVERY',
  RTO_REQUESTED = 'RTO_REQUESTED',
  RTO = 'RTO',
  RTO_OUT_FOR_DELIVERY = 'RTO_OUT_FOR_DELIVERY',
  RTO_INTRANSIT = 'RTO_INTRANSIT',
  RTO_CONTACT_CUSTOMER_CARE = 'RTO_CONTACT_CUSTOMER_CARE',
  RTO_SHIPMENT_DELAY = 'RTO_SHIPMENT_DELAY',
  RTO_DELIVERED = 'RTO_DELIVERED',
  RTO_FAILED = 'RTO_FAILED',
  DELIVERED = 'DELIVERED',
  PACKED = 'PACKED',
  APPROVED = 'APPROVED',
  RECEIVED = 'RECEIVED',
  DELIVERED_WAREHOUSE = 'DELIVERED_WAREHOUSE',
}

export const EshopboxWebhookEventSchema = z.object({
  // Order identifiers
  externalChannelID: z.string().optional(),
  customerOrderNumber: z.string().optional(),
  vendorOrderNumber: z.string().optional(),
  customerReturnNumber: z.string().optional(),
  externalShipmentID: z.string().optional(),
  order_id: z.number().optional(),
  
  // Tracking info
  trackingID: z.string().optional(),
  status: z.nativeEnum(TrackingStatus),
  latest_status: z.string().optional(),
  status_updated_at: z.string().optional(),
  
  // Courier info
  courierName: z.string().optional(),
  routingCode: z.string().optional(),
  shippingMode: z.string().optional(),
  transporterID: z.string().optional(),
  
  // Customer info
  customerName: z.string().optional(),
  customerContactNumber: z.string().optional(),
  email: z.string().email().optional(),
  
  // Additional fields
  remarks: z.string().optional(),
  gstin: z.string().optional(),
  pickupAddress: EshopboxWebhookPickupAddressSchema.optional(),
  dropAddress: EshopboxWebhookDropAddressSchema.optional(),
  status_log: z.record(z.string(), z.string()).optional(),
  status_log_first_occurrence: z.record(z.string(), z.string()).optional(),
  status_log_count: z.record(z.string(), z.number()).optional(),
  items: z.array(z.any()).optional(),
  
  // Allow any additional fields from Eshopbox
}).passthrough();

export type EshopboxWebhookEvent = z.infer<typeof EshopboxWebhookEventSchema>;

// ============ SHIPMENT TRACKING ============
export const EshopboxTrackingDetailsSchema = z.object({
  trackingIds: z.array(z.string()),
});

export type EshopboxTrackingDetails = z.infer<typeof EshopboxTrackingDetailsSchema>;

// Response from tracking API
export const EshopboxTrackingResponseSchema = z.object({
  trackingID: z.string(),
  status: z.nativeEnum(TrackingStatus),
  latest_status: z.string(),
  status_updated_at: z.string(),
  statusLog: z.record(z.string(), z.string()).optional(),
});

export type EshopboxTrackingResponse = z.infer<typeof EshopboxTrackingResponseSchema>;

// ============ API RESPONSE TYPES ============
export interface EshopboxOrderResponse {
  id?: string;
  orderId?: string;
  shipmentId?: string;
  trackingId?: string;
  status: string;
  message?: string;
  createdAt?: string;
}

export interface EshopboxErrorResponse {
  error: string;
  message: string;
  code?: string;
  status?: number;
}
