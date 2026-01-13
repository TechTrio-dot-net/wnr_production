import { getAccessToken } from './eshopbox';
import { logger } from './logger';

/**
 * ============================================
 * ESHOPBOX WEBHOOK REGISTRATION
 * ============================================
 * Registers webhook URL with Eshopbox to receive tracking updates
 */

const ESHOPBOX_BASE = process.env.ESHOPBOX_BASE || 'https://wms.eshopbox.com';
const ESHOPBOX_ACCOUNT_SLUG = 
  process.env.ESHOPBOX_ACCOUNT_SLUG || 
  process.env.ESHOPBOX_WORKSPACE_SLUG || 
  '';
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || '';

/**
 * Helper to extract account slug from environment variables
 */
function getAccountSlug(): string {
  let accountSlug = ESHOPBOX_ACCOUNT_SLUG;
  
  // If not set, try to extract from ESHOPBOX_BASE_URL
  if (!accountSlug && process.env.ESHOPBOX_BASE_URL) {
    const baseUrl = process.env.ESHOPBOX_BASE_URL.replace(/^https?:\/\//, '').replace(/\.myeshopbox\.com.*$/, '');
    accountSlug = baseUrl;
  }
  
  if (!accountSlug) {
    throw new Error('ESHOPBOX_ACCOUNT_SLUG, ESHOPBOX_WORKSPACE_SLUG, or ESHOPBOX_BASE_URL is required');
  }
  
  return accountSlug;
}

/**
 * Register webhook for shipment tracking events
 * 
 * @param webhookUrl - Full URL where Eshopbox should send webhooks (e.g., https://yourdomain.com/api/webhooks/eshopbox/tracking)
 * @param webhookHeaders - Optional headers for webhook authentication
 * @param externalChannelID - Optional external channel identifier
 */
export async function registerShipmentWebhook(
  webhookUrl: string,
  webhookHeaders?: Record<string, string>,
  externalChannelID?: string
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    if (!webhookUrl) {
      throw new Error('webhookUrl is required');
    }

    const accountSlug = getAccountSlug();
    const accessToken = await getAccessToken();
    const accountBase = `https://${accountSlug}.myeshopbox.com`;
    const webhookEndpoint = `${accountBase}/api/v1/webhook`;

    // Register webhook for all shipment events
    // According to docs, we need to register for each eventSubType
    const shipmentEvents = [
      'created',
      'packed',
      'ready_to_ship',
      'picked_up',
      'out_for_pickup',
      'pickup_failed',
      'intransit',
      'out_for_delivery',
      'delivered',
      'failed_delivery',
      'rto_created',
      'rto_intransit',
      'rto_out_for_delivery',
      'rto_delivered',
      'rto_failed',
      'shipment_delayed',
      'dispatched',
      'shipment_held',
      'unhold',
      'return_expected',
      'cancelled_order',
      'ndr_resolution_submitted',
      'damage',
      'lost',
    ];

    const results = [];

    for (const eventSubType of shipmentEvents) {
      const payload: any = {
        resource: 'shipment',
        eventType: 'PUT',
        eventSubType,
        version: 'v1',
        webhookUrl,
        webhookMethod: 'POST',
        webhookHeaders: {
          'Content-Type': 'application/json',
          ...(webhookHeaders || {}),
        },
      };

      // Add externalChannelID if provided
      if (externalChannelID) {
        payload.externalChannelID = externalChannelID;
      }

      logger.info(`📝 Registering webhook for shipment.${eventSubType}`, {
        webhookUrl,
        eventSubType,
        accountSlug,
        externalChannelID,
      });

      const response = await fetch(webhookEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ProxyHost: accountSlug,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`❌ Failed to register webhook for ${eventSubType}`, {
          status: response.status,
          error: errorText,
        });
        results.push({ eventSubType, success: false, error: errorText });
      } else {
        const data = await response.json();
        logger.info(`✅ Webhook registered for ${eventSubType}`, { eventSubType });
        results.push({ eventSubType, success: true, data });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      success: failCount === 0,
      message: `Registered ${successCount} webhooks, ${failCount} failed`,
      data: results,
    };
  } catch (error) {
    logger.error('❌ Error registering webhook', { error });
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Register webhook for return shipment events
 * 
 * @param webhookUrl - Full URL where Eshopbox should send webhooks
 * @param webhookHeaders - Optional headers for webhook authentication
 * @param externalChannelID - Optional external channel identifier
 */
export async function registerReturnWebhook(
  webhookUrl: string,
  webhookHeaders?: Record<string, string>,
  externalChannelID?: string
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const accountSlug = getAccountSlug();
    const accessToken = await getAccessToken();
    const accountBase = `https://${accountSlug}.myeshopbox.com`;
    const webhookEndpoint = `${accountBase}/api/v1/webhook`;

    const returnEvents = [
      'created',
      'pickup_pending',
      'out_for_pickup',
      'pickup_cancelled',
      'pickup_failed',
      'picked_up',
      'intransit',
      'out_for_delivery',
      'delivered',
      'delivered_warehouse',
      'failed_delivery',
      'complete',
      'return_cancelled',
      'approved',
      'lost',
    ];

    const results = [];

    for (const eventSubType of returnEvents) {
      const payload: any = {
        resource: 'returnShipment',
        eventType: 'PUT',
        eventSubType,
        version: 'v1',
        webhookUrl,
        webhookMethod: 'POST',
        webhookHeaders: {
          'Content-Type': 'application/json',
          ...(webhookHeaders || {}),
        },
      };

      // Add externalChannelID if provided
      if (externalChannelID) {
        payload.externalChannelID = externalChannelID;
      }

      const response = await fetch(webhookEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ProxyHost: accountSlug,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        results.push({ eventSubType, success: false, error: errorText });
      } else {
        const data = await response.json();
        results.push({ eventSubType, success: true, data });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      success: failCount === 0,
      message: `Registered ${successCount} return webhooks, ${failCount} failed`,
      data: results,
    };
  } catch (error) {
    logger.error('❌ Error registering return webhook', { error });
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Register webhook for inventory update events
 * 
 * @param webhookUrl - Full URL where Eshopbox should send webhooks
 * @param webhookHeaders - Optional headers for webhook authentication
 * @param externalChannelID - Optional external channel identifier
 */
export async function registerInventoryWebhook(
  webhookUrl: string,
  webhookHeaders?: Record<string, string>,
  externalChannelID?: string
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const accountSlug = getAccountSlug();
    const accessToken = await getAccessToken();
    const accountBase = `https://${accountSlug}.myeshopbox.com`;
    const webhookEndpoint = `${accountBase}/api/v1/webhook`;

    // Inventory events
    const inventoryEvents = ['updated'];

    const results = [];

    for (const eventSubType of inventoryEvents) {
      const payload: any = {
        resource: 'channel_inventory',
        eventType: 'POST',
        eventSubType,
        version: 'v1',
        webhookUrl,
        webhookMethod: 'POST',
        webhookHeaders: {
          'Content-Type': 'application/json',
          ...(webhookHeaders || {}),
        },
      };

      // Add externalChannelID if provided
      if (externalChannelID) {
        payload.externalChannelID = externalChannelID;
      }

      logger.info(`📝 Registering webhook for inventory.${eventSubType}`, {
        webhookUrl,
        eventSubType,
        accountSlug,
        externalChannelID,
      });

      const response = await fetch(webhookEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ProxyHost: accountSlug,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`❌ Failed to register inventory webhook for ${eventSubType}`, {
          status: response.status,
          error: errorText,
        });
        results.push({ eventSubType, success: false, error: errorText });
      } else {
        const data = await response.json();
        logger.info(`✅ Inventory webhook registered for ${eventSubType}`, { eventSubType });
        results.push({ eventSubType, success: true, data });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      success: failCount === 0,
      message: `Registered ${successCount} inventory webhooks, ${failCount} failed`,
      data: results,
    };
  } catch (error) {
    logger.error('❌ Error registering inventory webhook', { error });
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

