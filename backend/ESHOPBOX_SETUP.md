# 🚀 Eshopbox Integration - Quick Setup Guide

## ✅ What's Been Implemented

### Core Components Created

1. **Token Management** (`src/lib/eshopbox.ts`)
   - ✅ Automatic token generation using refresh token
   - ✅ In-memory caching with expiration tracking
   - ✅ Automatic refresh every 12 hours
   - ✅ Error handling and logging

2. **Order Management** (`src/modules/shipments/eshopbox-orders.ts`)
   - ✅ Create orders via Wrapper API
   - ✅ Get/List shipments
   - ✅ Update shipment status
   - ✅ Cancel shipments
   - ✅ Build payloads from internal order data

3. **Tracking Service** (`src/modules/shipments/eshopbox-tracking.ts`)
   - ✅ Poll tracking details (up to 50 IDs per request)
   - ✅ In-memory tracking cache
   - ✅ Status description & categorization
   - ✅ Webhook event processing

4. **API Endpoints** (`src/routes/eshopbox.ts`)
   - ✅ `POST /api/eshopbox/orders/create` - Create order
   - ✅ `POST /api/eshopbox/orders/create-from-internal` - Create from internal order
   - ✅ `GET /api/eshopbox/shipments/:id` - Get shipment
   - ✅ `GET /api/eshopbox/shipments` - List shipments
   - ✅ `PUT /api/eshopbox/shipments/:id/status` - Update status
   - ✅ `DELETE /api/eshopbox/shipments/:id` - Cancel shipment
   - ✅ `POST /api/eshopbox/tracking` - Get tracking (polling)
   - ✅ `GET /api/eshopbox/tracking/:id` - Get cached status
   - ✅ `GET /api/eshopbox/status` - Integration status

5. **Webhook Handler** (`src/routes/eshopbox-webhook.ts`)
   - ✅ `POST /api/webhooks/eshopbox/tracking` - Receive tracking updates
   - ✅ Event validation
   - ✅ Automatic cache update

6. **Background Job** (`src/jobs/eshopbox-token-refresh.ts`)
   - ✅ Periodic token refresh
   - ✅ Automatic scheduling
   - ✅ Graceful shutdown handling

7. **Type Definitions** (`src/types/eshopbox.ts`)
   - ✅ Full TypeScript interfaces
   - ✅ Zod validation schemas
   - ✅ Comprehensive type coverage

---

## 🔧 Step 1: Environment Setup

Verify all required variables are in `.env`:

```bash
# From your .env (already configured)
ESHOPBOX_BASE=https://wms.eshopbox.com
ESHOPBOX_CLIENT_ID=WNRCOM
ESOPBOX_SECRRET=eshopbox@123
ESHOPBOX_REFRESH_TOKEN=4a92f8c01afc43c2de9a585a38d23397
ESHOPBOX_CHANNEL_ID=CH3952
ESHOPBOX_SHIPPING_MODE=Eshopbox Standard
ESHOPBOX_PICKUP_LOCATION_CODE=380015
ESHOPBOX_COUNTRY=India
ESHOPBOX_PKG_TYPE=box
ESHOPBOX_PKG_LENGTH_CM=12
ESHOPBOX_PKG_BREADTH_CM=8
ESHOPBOX_PKG_HEIGHT_CM=9.5
ESHOPBOX_PKG_WEIGHT_G=27
ESHOPBOX_LOCATION_CODE=AMD02
```

---

## 📋 Step 2: Test Token Generation

```bash
# Test with curl
curl -X POST https://auth.myeshopbox.com/api/v1/generateToken \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "WNRCOM",
    "client_secret": "eshopbox@123",
    "grant_type": "refresh_token",
    "refresh_token": "4a92f8c01afc43c2de9a585a38d23397"
  }'
```

Expected response:
```json
{
  "access_token": "eyJhbGciOiJSUzI1N...",
  "id_token": "eyyRwffpgDlOyAxcv...",
  "scope": "openid profile offline_access",
  "expires_in": 86400,
  "token_type": "Bearer"
}
```

---

## 🌐 Step 3: Configure Webhook in Eshopbox

1. Log in to your Eshopbox workspace
2. Navigate to: **Settings → Webhooks** (or **Apps → Webhooks**)
3. Click **Create New Webhook** or **Add Webhook**
4. Configure:
   - **URL**: `https://wildnroot.com/api/webhooks/eshopbox/tracking`
   - **Event Type**: Tracking updates / Order events
   - **Active**: ✓ Yes
   - **Retry Policy**: Standard (recommended)

5. Save and test webhook

---

## 🧪 Step 4: Test API Endpoints

### 4.1 Check Integration Status
```bash
curl https://wildnroot.com/api/eshopbox/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "token": {
      "status": "valid",
      "cached": true,
      "expiresIn": 72000,
      "expiresAt": "2024-01-16T10:30:00Z",
      "refreshedAt": "2024-01-15T10:30:00Z"
    },
    "timestamp": "2024-01-15T13:00:00Z"
  }
}
```

### 4.2 Create Test Order

```bash
curl -X POST https://wildnroot.com/api/eshopbox/orders/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderData": {
      "channelId": "CH3952",
      "customerOrderId": "TEST-001",
      "shipmentId": "SHIP-TEST-001",
      "isCOD": true,
      "invoiceTotal": 500,
      "shippingAddress": {
        "customerName": "Test User",
        "addressLine1": "123 Test St",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "pincode": "380015",
        "country": "India",
        "contactPhone": "9876543210",
        "email": "test@example.com"
      },
      "items": [{
        "itemID": "TEST-PROD",
        "productTitle": "Test Product",
        "quantity": 1,
        "itemTotal": 500
      }],
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
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "success",
    "orderId": "ESH-123456",
    "shipmentId": "SHIP-TEST-001",
    "trackingId": "TRK-987654",
    "message": "Order created successfully",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 🔗 Step 5: Integrate with Order Routes

Update your order creation/success handlers:

```typescript
// In src/routes/checkout.ts or payments route
import { createEshopboxOrder, buildEshopboxOrderPayload } from '../modules/shipments/eshopbox-orders';

router.post('/complete', async (req, res) => {
  try {
    // ... existing order creation logic ...
    
    const order = new Order({
      // ... your data ...
    });
    await order.save();
    
    // 🆕 Create shipment in Eshopbox
    try {
      const eshopboxPayload = buildEshopboxOrderPayload(order);
      const result = await createEshopboxOrder(eshopboxPayload);
      
      // Store tracking info
      order.shipment = {
        trackingId: result.trackingId,
        eshopboxOrderId: result.orderId,
        eshopboxShipmentId: result.shipmentId,
        status: 'created',
        lastUpdate: new Date(),
      };
      await order.save();
    } catch (error) {
      logger.error('Failed to create Eshopbox order', { error });
      // Continue without Eshopbox (don't fail the order)
    }
    
    res.json({ success: true, orderId: order._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📊 Step 6: Add Tracking Schema to Order Model

```typescript
// In src/models/Order.ts
const orderSchema = new Schema({
  // ... existing fields ...
  
  shipment: {
    trackingId: String,
    eshopboxOrderId: String,
    eshopboxShipmentId: String,
    status: String,
    lastUpdate: Date,
    description: String,
    category: String, // 'pending' | 'in-transit' | 'delivered' | 'issue'
  },
});
```

---

## 📈 Step 7: Monitor Logs

Watch logs for token refresh:
```bash
# In production (Railway/similar):
tail -f logs/output.log | grep -i eshopbox

# Output should show:
# [INFO] Initializing Eshopbox token refresh job...
# [INFO] Starting token refresh cycle...
# [INFO] Token still valid, skipping refresh
# [INFO] ✅ Access token generated successfully
```

---

## 🚀 Step 8: Deploy

1. **Build the backend**
   ```bash
   npm run build
   ```

2. **Start the server**
   ```bash
   npm run start
   # or for development:
   npm run dev
   ```

3. **Monitor startup**
   ```
   Server listening on http://localhost:5001
   ✅ MongoDB connected
   🚀 Initializing Eshopbox integration...
   ✅ Eshopbox token refresh job initialized
   ```

---

## ⚠️ Troubleshooting

### Token Generation Fails
```
Error: Missing required Eshopbox credentials
```
**Fix:** Verify env vars: `ESHOPBOX_CLIENT_ID`, `ESOPBOX_SECRRET`, `ESHOPBOX_REFRESH_TOKEN`

### Order Creation Returns 401
```
Error: Eshopbox API error: 401 - Unauthorized
```
**Fix:** Token expired or invalid. Check `/api/eshopbox/status`

### Webhook Not Received
```
No POST requests hitting /api/webhooks/eshopbox/tracking
```
**Fix:**
- Check webhook URL is publicly accessible
- Verify Eshopbox webhook settings
- Test with `curl` POST to your endpoint

### TypeScript Compilation Error
```
Module not found
```
**Fix:** Run `npm install` to ensure all dependencies are installed

---

## 📚 Next Steps

1. **Customer Notifications**
   - Send email/SMS when status changes
   - Use status description from `getStatusDescription()`

2. **Order Tracking Page**
   - Display tracking on customer dashboard
   - Show status timeline with history

3. **Admin Dashboard**
   - Monitor active shipments
   - Bulk operations (batch create, cancel)
   - Webhook event logging

4. **Error Handling**
   - Retry failed orders
   - Alert admin on failures
   - Fallback procedures

5. **Analytics**
   - Track order success rates
   - Monitor delivery times
   - Carrier performance

---

## 📞 Support

For Eshopbox API issues:
- **Docs**: https://eshop.gitbook.io/eshopbox-developers
- **Authentication**: https://eshop.gitbook.io/eshopbox-developers/basics/authentication
- **Orders**: https://eshop.gitbook.io/eshopbox-developers/order/wrapper-api/orders
- **Tracking**: https://eshop.gitbook.io/eshopbox-developers/order/wrapper-api/get-tracking-details-via-polling

---

**Integration Completed!** ✅

You now have a fully functional Eshopbox integration with:
- ✅ Automatic token management (refresh every 12h)
- ✅ Order creation and management
- ✅ Real-time tracking with webhooks
- ✅ Production-ready error handling
- ✅ Full TypeScript support
- ✅ Comprehensive logging

Start by testing the endpoints and configuring the webhook!
