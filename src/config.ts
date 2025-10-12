/**
 * Configuration Constants
 * 
 * Centralized configuration for the Cloudflare Workers application
 */

/**
 * Cache duration constants (in seconds)
 */
export const CACHE_DURATIONS = {
  AVATAR_HIT: 24 * 60 * 60,      // 24 hours for successful avatar lookups
  AVATAR_MISS: 6 * 60 * 60,      // 6 hours for failed lookups (use default)
  RATE_LIMIT: 60 * 60,           // 1 hour for rate limiting windows
  SESSION: 7 * 24 * 60 * 60,     // 7 days for authentication sessions
  NONCE: 10 * 60,                // 10 minutes for SIWE nonces
} as const;

/**
 * Rate limiting configurations
 */
export const RATE_LIMITS = {
  anonymous: {
    requests: 100,
    window: 3600, // 100 requests per hour
  },
  authenticated: {
    requests: 1000,
    window: 3600, // 1000 requests per hour
  },
  premium: {
    requests: 10000,
    window: 3600, // 10k requests per hour
  },
} as const;

/**
 * Avatar resolution timeouts (in milliseconds)
 */
export const RESOLUTION_TIMEOUTS = {
  ENS: 5000,      // 5 seconds
  OPENSEA: 3000,  // 3 seconds
  LENS: 3000,     // 3 seconds
  DEFAULT: 1000,  // 1 second
} as const;

/**
 * Default avatar service URL
 */
export const DEFAULT_AVATAR_BASE_URL = 'https://api.dicebear.com/7.x/identicon/svg';

/**
 * Maximum batch size for avatar resolution
 */
export const MAX_BATCH_SIZE = 100;

/**
 * API version
 */
export const API_VERSION = '2.0.0';

/**
 * Supported blockchain networks
 */
export const SUPPORTED_CHAINS = {
  ETHEREUM: 1,
  POLYGON: 137,
  OPTIMISM: 10,
  ARBITRUM: 42161,
  BASE: 8453,
} as const;

/**
 * IPFS gateway URLs
 */
export const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
] as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  INVALID_ADDRESS: 'Invalid Ethereum address format',
  INVALID_SIGNATURE: 'Invalid signature or verification failed',
  INVALID_SESSION: 'Invalid or expired session',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  AVATAR_NOT_FOUND: 'Avatar not found',
  INTERNAL_ERROR: 'Internal server error',
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_REQUEST: 'Invalid request format',
} as const;