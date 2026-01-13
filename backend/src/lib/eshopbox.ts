import { logger } from './logger';
import type { EshopboxTokenResponse, EshopboxTokenCache } from '../types/eshopbox';

/**
 * ============================================
 * ESHOPBOX TOKEN MANAGER
 * ============================================
 * Handles token generation, caching, and refresh
 * Refresh token expires every 18 days - we manage the access token
 * Access token typically expires in 24 hours
 */

const ESHOPBOX_BASE = process.env.ESHOPBOX_BASE || 'https://wms.eshopbox.com';
const ESHOPBOX_CLIENT_ID = process.env.ESHOPBOX_CLIENT_ID || '';
const ESHOPBOX_SECRET = process.env.ESOPBOX_SECRRET || process.env.ESHOPBOX_SECRET || ''; // Note: typo in .env
const ESHOPBOX_REFRESH_TOKEN = process.env.ESHOPBOX_REFRESH_TOKEN || '';

// In-memory cache with automatic expiration
let tokenCache: EshopboxTokenCache | null = null;

// Buffer time before token actually expires (5 minutes)
const TOKEN_BUFFER_MS = 5 * 60 * 1000;

/**
 * Generates a new access token using the refresh token
 * This request goes to auth.myeshopbox.com (not the main base URL)
 */
export async function generateAccessToken(): Promise<string> {
  try {
    logger.info('🔄 Generating new Eshopbox access token...');

    // Validate required credentials
    if (!ESHOPBOX_CLIENT_ID || !ESHOPBOX_SECRET || !ESHOPBOX_REFRESH_TOKEN) {
      throw new Error('Missing required Eshopbox credentials in environment variables');
    }

    const tokenEndpoint = 'https://auth.myeshopbox.com/api/v1/generateToken';

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: ESHOPBOX_CLIENT_ID,
        client_secret: ESHOPBOX_SECRET,
        grant_type: 'refresh_token',
        refresh_token: ESHOPBOX_REFRESH_TOKEN,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.error(`Token generation failed: ${response.status}`, { error: errorData });
      throw new Error(`Token generation failed with status ${response.status}`);
    }

    const data: EshopboxTokenResponse = await response.json();

    // Cache the token with expiration time
    const expiresIn = data.expires_in * 1000; // Convert seconds to milliseconds
    const expiresAt = Date.now() + expiresIn;

    tokenCache = {
      token: data.access_token,
      expiresAt,
      refreshedAt: Date.now(),
    };

    logger.info('✅ Access token generated successfully', {
      expiresIn: data.expires_in,
      expiresAt: new Date(expiresAt).toISOString(),
    });

    return data.access_token;
  } catch (error) {
    logger.error('❌ Failed to generate Eshopbox access token', { error });
    throw error;
  }
}

/**
 * Gets the current valid access token
 * - Returns cached token if still valid
 * - Generates new token if expired or missing
 */
export async function getAccessToken(): Promise<string> {
  try {
    // Check if we have a cached token that's still valid
    if (tokenCache) {
      const now = Date.now();
      const timeUntilExpiry = tokenCache.expiresAt - now;

      if (timeUntilExpiry > TOKEN_BUFFER_MS) {
        logger.debug('Using cached Eshopbox access token', {
          timeUntilExpiry: Math.round(timeUntilExpiry / 1000),
          expiresAt: new Date(tokenCache.expiresAt).toISOString(),
        });
        return tokenCache.token;
      }

      logger.info('Token expired or about to expire, refreshing...', {
        timeUntilExpiry: Math.round(timeUntilExpiry / 1000),
      });
    }

    // Generate new token
    return await generateAccessToken();
  } catch (error) {
    logger.error('❌ Error getting Eshopbox access token', { error });
    throw error;
  }
}

/**
 * Manually refresh the token (useful for background jobs)
 */
export async function refreshAccessToken(): Promise<string> {
  logger.info('🔄 Manually refreshing Eshopbox access token...');
  tokenCache = null; // Force regeneration
  return generateAccessToken();
}

/**
 * Get token info (for debugging)
 */
export function getTokenInfo() {
  if (!tokenCache) {
    return { status: 'no_token', cached: false };
  }

  const now = Date.now();
  const timeUntilExpiry = tokenCache.expiresAt - now;
  const isValid = timeUntilExpiry > TOKEN_BUFFER_MS;

  return {
    status: isValid ? 'valid' : 'expired',
    cached: true,
    expiresIn: Math.round(timeUntilExpiry / 1000), // seconds
    expiresAt: new Date(tokenCache.expiresAt).toISOString(),
    refreshedAt: new Date(tokenCache.refreshedAt).toISOString(),
    tokenPreview: tokenCache.token.substring(0, 20) + '...',
  };
}

/**
 * Clear token cache (for logout/cleanup)
 */
export function clearTokenCache() {
  logger.info('Clearing Eshopbox token cache');
  tokenCache = null;
}
