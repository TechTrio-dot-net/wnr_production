import { refreshAccessToken, getTokenInfo } from '../lib/eshopbox';
import { logger } from '../lib/logger';

/**
 * ============================================
 * ESHOPBOX TOKEN REFRESH JOB
 * ============================================
 * Runs periodically to refresh access tokens
 * Tokens expire every 24 hours (access token)
 * Refresh token expires every 18 days
 *
 * This job ensures we always have a valid token ready
 */

// Job scheduling configuration
const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000; // Refresh every 12 hours (token is 24h, we refresh at 50% TTL)
const INITIAL_DELAY_MS = 5 * 60 * 1000; // Wait 5 minutes after server start before first refresh

let refreshJobId: NodeJS.Timeout | null = null;

/**
 * Initialize the token refresh job
 * Call this from your server startup
 */
export function initializeTokenRefreshJob() {
  logger.info('🕐 Initializing Eshopbox token refresh job...');

  // Wait before starting first refresh
  setTimeout(() => {
    logger.info('⏱️ Starting token refresh cycle...');
    runTokenRefreshCycle();

    // Schedule periodic refreshes
    refreshJobId = setInterval(() => {
      runTokenRefreshCycle();
    }, REFRESH_INTERVAL_MS);

    logger.info('✅ Token refresh job initialized', {
      interval: `${REFRESH_INTERVAL_MS / (60 * 60 * 1000)} hours`,
    });
  }, INITIAL_DELAY_MS);
}

/**
 * Run a single refresh cycle
 */
async function runTokenRefreshCycle() {
  try {
    const tokenInfo = getTokenInfo();

    logger.info('🔄 Running token refresh cycle', {
      currentStatus: tokenInfo.status,
      expiresIn: tokenInfo.expiresIn,
    });

    // Only refresh if token is getting close to expiry or missing
    if (tokenInfo.status === 'valid' && tokenInfo.expiresIn && tokenInfo.expiresIn > 3600) {
      logger.debug('Token still valid, skipping refresh', {
        expiresIn: tokenInfo.expiresIn,
      });
      return;
    }

    // Refresh the token
    const newToken = await refreshAccessToken();

    const updatedInfo = getTokenInfo();
    logger.info('✅ Token refreshed successfully', {
      expiresIn: updatedInfo.expiresIn,
      expiresAt: updatedInfo.expiresAt,
    });
  } catch (error) {
    logger.error('❌ Token refresh cycle failed', { error });

    // Don't stop the job on error, just log it
    // The next cycle will try again
  }
}

/**
 * Stop the token refresh job (for graceful shutdown)
 */
export function stopTokenRefreshJob() {
  if (refreshJobId) {
    logger.info('Stopping token refresh job');
    clearInterval(refreshJobId);
    refreshJobId = null;
  }
}

/**
 * Manually trigger a refresh (useful for testing)
 */
export async function manualRefresh() {
  logger.info('Manually triggering token refresh');
  return runTokenRefreshCycle();
}

/**
 * Get job status
 */
export function getJobStatus() {
  return {
    running: refreshJobId !== null,
    interval: `${REFRESH_INTERVAL_MS / (60 * 60 * 1000)} hours`,
    initialDelay: `${INITIAL_DELAY_MS / 60 / 1000} minutes`,
    tokenInfo: getTokenInfo(),
  };
}
