# 🌍 Eshopbox Integration Guide

Complete integration for Eshopbox order management and tracking with automated token refresh.

## 📋 Features

✅ **Automated Token Management**
- Access token generation using refresh token
- Automatic token caching
- Periodic refresh every 12 hours (token valid for 24h)
- Handles token expiration gracefully

✅ **Order Management**
- Create orders in Eshopbox with one API call
- Map internal orders to Eshopbox format
- Support for COD and prepaid orders
- Automatic shipment creation and label generation

✅ **Real-time Tracking**
- Webhook integration for tracking updates
- Polling API for batch tracking queries
- Comprehensive tracking status mapping
- Status categorization (pending, in-transit, delivered, issue)

✅ **Production-Ready**
- Full error handling and logging
- TypeScript with Zod validation
- Graceful shutdown handling
- Memory-efficient caching

---

## 🔧 Environment Variables

Required variables in `.env`:

```env
# Eshopbox Base URL
ESHOPBOX_BASE=https://wms.eshopbox.com

# API Credentials
ESHOPBOX_CLIENT_ID=WNRCOM
ESOPBOX_SECRRET=eshopbox@123  # Note: typo preserved from original
ESHOPBOX_REFRESH_TOKEN=4a92f8c01afc43c2de9a585a38d23397

# Channel Configuration
ESHOPBOX_CHANNEL_ID=CH3952
ESHOPBOX_SHIPPING_MODE=Eshopbox Standard

# Location & Packaging
ESHOPBOX_PICKUP_LOCATION_CODE=380015
ESHOPBOX_COUNTRY=India
ESHOPBOX_PKG_TYPE=box
ESHOPBOX_PKG_LENGTH_CM=12
ESHOPBOX_PKG_BREADTH_CM=8
ESHOPBOX_PKG_HEIGHT_CM=9.5
ESHOPBOX_PKG_WEIGHT_G=27
ESHOPBOX_LOCATION_CODE=AMD02  # Alternative location
```

---

## 🚀 API Endpoints

### Order Management

#### Create Order from Eshopbox Payload
```http
POST /api/eshopbox/orders/create
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "orderData": {
    "channelId": "CH3952",
    "customerOrderId": "ORDER-123",
    "shipmentId": "SHIP-123",
    "isCOD": true,
    "invoiceTotal": 2500,
    "shippingAddress": {
      "customerName": "John Doe",
      "addressLine1": "123 Main St",
      "city": "Ahmedabad",
      "state": "Gujarat",
      "pincode": "380015",
      "country": "India",
      "contactPhone": "9876543210",
      "email": "john@example.com"
    },
    "items": [
      {
        "itemID": "PROD-001",
        "productTitle": "Assam Tea - 100g",
        "quantity": 2,
        "itemTotal": 500,
        "itemWeight": 100
      }
    ],
    "shipmentDimension": {
      "length": 12,
      "breadth": 8,
      "height": 9.5,
      "weight": 27
    },
    "pickupLocation": {
      "locationCode": "380015"
    }
  }
}

Response:
{
  "success": true,
  "data": {
    "status": "success",
    "orderId": "ESH-123456",
    "shipmentId": "SHIP-123",
    "trackingId": "TRK-987654",
    "message": "Order created successfully",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Create Order from Internal Order Data
```http
POST /api/eshopbox/orders/create-from-internal
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "internalOrder": {
    "_id": "ORDER-123",
    "totalAmount": 2500,
    "isCOD": true,
    "createdAt": "2024-01-15T10:00:00Z",
    "user": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210"
    },
    "shippingAddress": {
      "name": "John Doe",
      "addressLine1": "123 Main St",
      "addressLine2": "Apt 4B",
      "city": "Ahmedabad",
      "state": "Gujarat",
      "pincode": "380015",
      "country": "India",
      "phone": "9876543210"
    },
    "items": [
      {
        "product": {
          "_id": "PROD-001",
          "name": "Assam Tea - 100g",
          "price": 250,
          "weight": 100
        },
        "quantity": 2,
        "price": 250,
        "discount": 0
      }
    ]
  }
}

Response: (Same as above)
```

---

### Shipment Management

#### Get Shipment Details
```http
GET /api/eshopbox/shipments/SHIP-123
Authorization: Bearer <jwt-token>

Response:
{
  "success": true,
  "data": {
    "shipmentId": "SHIP-123",
    "trackingId": "TRK-987654",
    "status": "picked_up",
    "courierName": "EcomExpress",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### List All Shipments
```http
GET /api/eshopbox/shipments?limit=50&offset=0
Authorization: Bearer <jwt-token>

Response:
{
  "success": true,
  "count": 15,
  "data": [ ... ]
}
```

#### Update Shipment Status
```http
PUT /api/eshopbox/shipments/SHIP-123/status
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "status": "dispatched"
}

Response:
{
  "success": true,
  "data": { ... }
}
```

#### Cancel Shipment
```http
DELETE /api/eshopbox/shipments/SHIP-123
Authorization: Bearer <jwt-token>

Response:
{
  "success": true,
  "message": "Shipment cancelled",
  "data": { ... }
}
```

---

### Tracking Management

#### Get Tracking Details (Polling)
```http
POST /api/eshopbox/tracking
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "trackingIds": ["TRK-987654", "TRK-123456"]
}

Response:
{
  "success": true,
  "count": 2,
  "data": [
    {
      "trackingID": "TRK-987654",
      "status": "INTRANSIT",
      "latest_status": "In transit",
      "status_updated_at": "2024-01-15T12:00:00Z"
    }
  ]
}
```

#### Get Cached Tracking Status
```http
GET /api/eshopbox/tracking/TRK-987654
Authorization: Bearer <jwt-token>

Response:
{
  "success": true,
  "data": {
    "trackingID": "TRK-987654",
    "status": "INTRANSIT",
    "latest_status": "In transit",
    "status_updated_at": "2024-01-15T12:00:00Z"
  }
}
```

#### Webhook: Tracking Updates
```http
POST /api/webhooks/eshopbox/tracking
Content-Type: application/json

{
  "trackingID": "TRK-987654",
  "status": "INTRANSIT",
  "customerOrderNumber": "ORDER-123",
  "courierName": "EcomExpress",
  "status_updated_at": "2024-01-15T12:00:00Z",
  "latest_status": "In transit"
}

Response:
{
  "success": true,
  "message": "Webhook processed",
  "trackingID": "TRK-987654",
  "status": "INTRANSIT"
}
```

---

### System Status

#### Get Integration Status
```http
GET /api/eshopbox/status
Authorization: Bearer <jwt-token>

Response:
{
  "success": true,
  "data": {
    "token": {
      "status": "valid",
      "cached": true,
      "expiresIn": 72000,
      "expiresAt": "2024-01-16T10:30:00Z",
      "refreshedAt": "2024-01-15T10:30:00Z",
      "tokenPreview": "eyJhbGciOiJSUzI1N..."
    },
    "timestamp": "2024-01-15T13:00:00Z"
  }
}
```

#### Webhook Health Check
```http
GET /api/webhooks/eshopbox/health

Response:
{
  "service": "eshopbox-webhook",
  "status": "operational",
  "timestamp": "2024-01-15T13:00:00Z"
}
```

---

## 🎯 Tracking Status Reference

### Standard Statuses

| Status | Category | Description |
|--------|----------|-------------|
| `PICKUP_PENDING` | Pending | Awaiting pickup by carrier |
| `OUT_FOR_PICKUP` | Pending | Out for pickup |
| `PICKED_UP` | In-Transit | Picked up by carrier |
| `INTRANSIT` | In-Transit | In transit |
| `OUT_FOR_DELIVERY` | In-Transit | Out for delivery |
| `DELIVERED` | Delivered | Successfully delivered |
| `PACKED` | Pending | Packed and ready |

### Failure/Issue Statuses

| Status | Category | Description |
|--------|----------|-------------|
| `PICKUP_FAILED` | Issue | Pickup failed |
| `FAILED_DELIVERY` | Issue | Delivery failed |
| `SHIPMENT_DELAYED` | Issue | Shipment delayed |
| `LOST` | Issue | Shipment lost |
| `DAMAGED` | Issue | Shipment damaged |
| `CANCELLED_ORDER` | Issue | Order cancelled |

### Return to Origin (RTO) Statuses

| Status | Category | Description |
|--------|----------|-------------|
| `RTO_REQUESTED` | Issue | Return requested |
| `RTO` | In-Transit | Returning to origin |
| `RTO_INTRANSIT` | In-Transit | RTO in transit |
| `RTO_DELIVERED` | Delivered | Returned to origin |
| `RTO_FAILED` | Issue | RTO failed |

---

## 🔌 Integration Points

### 1. Automatic Token Refresh

Tokens are automatically refreshed every 12 hours to ensure continuous availability.

**Job Configuration:**
- Interval: 12 hours
- Initial delay: 5 minutes (after server start)
- Buffer time: 5 minutes before expiration

**Lifecycle:**
- Server starts → Wait 5 min → First refresh
- Token valid for 24h → Refresh at 50% TTL (12h)
- Automatic retries on failure (doesn't stop job)

### 2. Webhook Integration

Configure Eshopbox to send webhooks to:
```
https://your-domain.com/api/webhooks/eshopbox/tracking
```

**How to register webhook:**
1. Log in to Eshopbox workspace
2. Go to Settings → Webhooks
3. Create new webhook:
   - URL: `https://your-domain.com/api/webhooks/eshopbox/tracking`
   - Events: Order tracking updates
   - Active: Yes

**Webhook Processing:**
- Events are received via POST
- Automatically validated and cached
- Status updates are stored in memory
- Can be extended to update your database

### 3. Internal Database Integration

Update your Order model to store Eshopbox data:

```typescript
// In your Order schema
shipment: {
  trackingId: String,
  status: String,
  lastUpdate: Date,
  description: String,  // Human-readable status
  category: String,      // 'pending' | 'in-transit' | 'delivered' | 'issue'
  eshopboxOrderId: String,
  eshopboxShipmentId: String,
}
```

### 4. Customer Notifications

When webhook is received, send customer updates:

```typescript
// Example in webhook handler
if (order.user.email) {
  await sendTrackingEmail(order.user.email, {
    trackingId: event.trackingID,
    status: getStatusDescription(event.status),
    estimatedDelivery: calculateETA(event.status),
  });
}
```

---

## 📊 Token Refresh Details

### Refresh Strategy

- **Access Token**: 24 hours (standard)
- **Refresh Token**: 18 days (provided by Eshopbox)
- **Refresh Interval**: 12 hours (proactive refresh at 50% TTL)
- **Buffer Time**: 5 minutes before actual expiration

### Token Lifecycle

1. **Server Start**
   ```
   Server boots → Wait 5 minutes → Initial token generation
   ```

2. **Normal Operation**
   ```
   Token generated at T → Valid until T+24h → Refresh at T+12h
   ```

3. **Expiration Handling**
   ```
   API called with expired token → Automatic refresh → Retry request
   ```

4. **Graceful Shutdown**
   ```
   SIGTERM/SIGINT received → Stop refresh job → Exit
   ```

### Monitoring Token Status

Get current token info:
```typescript
import { getTokenInfo } from './lib/eshopbox';

const info = getTokenInfo();
console.log(info);
// {
//   status: 'valid' | 'expired',
//   cached: true,
//   expiresIn: 72000,  // seconds
//   expiresAt: '2024-01-16T10:30:00Z',
//   refreshedAt: '2024-01-15T10:30:00Z',
//   tokenPreview: 'eyJhbGciOiJSUzI1N...'
// }
```

---

## 🛠️ Usage Examples

### Example 1: Create Order on Successful Payment

```typescript
// In your payment webhook handler
import { createEshopboxOrder, buildEshopboxOrderPayload } from '../modules/shipments/eshopbox-orders';

async function handlePaymentSuccess(order) {
  try {
    // Build Eshopbox payload from your order
    const eshopboxPayload = buildEshopboxOrderPayload(order);
    
    // Create order in Eshopbox
    const result = await createEshopboxOrder(eshopboxPayload);
    
    // Update your order with tracking info
    order.shipment = {
      trackingId: result.trackingId,
      eshopboxOrderId: result.orderId,
      eshopboxShipmentId: result.shipmentId,
      status: 'created',
      lastUpdate: new Date(),
    };
    
    await order.save();
    
    // Notify customer
    await sendOrderConfirmation(order);
  } catch (error) {
    logger.error('Failed to create Eshopbox order', { error, orderId: order._id });
    // Handle failure appropriately
  }
}
```

### Example 2: Batch Get Tracking Status

```typescript
import { getTrackingDetails } from '../modules/shipments/eshopbox-tracking';

async function updateAllOrderTracking() {
  try {
    // Get all orders with tracking IDs
    const orders = await Order.find({ 'shipment.trackingId': { $exists: true } });
    
    const trackingIds = orders
      .map(o => o.shipment.trackingId)
      .filter(Boolean)
      .slice(0, 50); // Max 50 per request
    
    if (trackingIds.length === 0) return;
    
    // Get tracking details
    const tracking = await getTrackingDetails(trackingIds);
    
    // Update orders
    for (const trackData of tracking) {
      const order = orders.find(o => o.shipment.trackingId === trackData.trackingID);
      if (order) {
        order.shipment.status = trackData.status;
        order.shipment.lastUpdate = new Date(trackData.status_updated_at);
        await order.save();
      }
    }
  } catch (error) {
    logger.error('Failed to update tracking', { error });
  }
}
```

### Example 3: Handle Webhook Update

```typescript
// Webhook is received and processed automatically
// The event is validated and cached

// In your order route, retrieve cached status:
import { getTrackedStatus } from '../modules/shipments/eshopbox-tracking';

app.get('/api/orders/:orderId/tracking', async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order?.shipment?.trackingId) {
    return res.status(404).json({ error: 'No tracking data' });
  }
  
  const tracking = getTrackedStatus(order.shipment.trackingId);
  res.json({ success: true, data: tracking });
});
```

---

## 🚨 Error Handling

### Common Issues

#### 1. Token Generation Fails
```
Error: Missing required Eshopbox credentials in environment variables
```
**Solution:** Verify all required env vars are set correctly

#### 2. Order Creation Fails
```
Error: Eshopbox API error: 401 - Unauthorized
```
**Solution:** Token may have expired, check `/api/eshopbox/status`

#### 3. Webhook Not Received
```
No tracking updates arriving
```
**Solution:** 
- Verify webhook URL is publicly accessible
- Check Eshopbox webhook settings
- Verify event types are configured

---

## 📚 File Structure

```
src/
├── lib/
│   ├── eshopbox.ts              # Token management
│   └── logger.ts                # Logging utility
├── types/
│   └── eshopbox.ts              # TypeScript types & schemas
├── modules/
│   └── shipments/
│       ├── eshopbox-orders.ts   # Order creation & management
│       └── eshopbox-tracking.ts # Tracking & webhook handling
├── routes/
│   ├── eshopbox.ts              # Admin API endpoints
│   ├── eshopbox-webhook.ts      # Webhook routes
│   └── index.ts                 # Route registration
├── jobs/
│   └── eshopbox-token-refresh.ts # Token refresh job
└── server.ts                    # Server setup with integration
```

---

## ✅ Checklist for Deployment

- [ ] Set all required Eshopbox env variables
- [ ] Configure Eshopbox webhook URL
- [ ] Test token generation manually
- [ ] Test order creation with test data
- [ ] Register webhook with Eshopbox
- [ ] Test webhook with sample event
- [ ] Add tracking fields to Order schema
- [ ] Update payment success handler
- [ ] Test full order flow end-to-end
- [ ] Monitor logs for token refresh
- [ ] Set up customer notifications
- [ ] Configure error alerting

---

## 🔗 References

- [Eshopbox API Documentation](https://eshop.gitbook.io/eshopbox-developers)
- [Token Generation](https://eshop.gitbook.io/eshopbox-developers/basics/authentication/generating-access-token)
- [Wrapper API (Orders)](https://eshop.gitbook.io/eshopbox-developers/order/wrapper-api/orders)
- [Tracking Details](https://eshop.gitbook.io/eshopbox-developers/order/wrapper-api/get-tracking-details-via-polling)
- [Webhook Integration](https://eshop.gitbook.io/eshopbox-developers/order/wrapper-api/registering-webhook-for-tracking-shipment)

---

**Last Updated:** January 2025
**Integration Version:** 1.0.0
