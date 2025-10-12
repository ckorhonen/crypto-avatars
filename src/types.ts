/**
 * TypeScript Type Definitions
 * 
 * Defines all types used throughout the Cloudflare Workers application
 */

/**
 * Cloudflare Workers Environment Bindings
 */
export interface Env {
  // KV Namespaces
  AVATAR_CACHE: KVNamespace;
  SESSION_CACHE: KVNamespace;
  NONCE_CACHE: KVNamespace;
  RATE_LIMIT_CACHE: KVNamespace;

  // Environment Variables
  ENVIRONMENT: string;
  DEFAULT_AVATAR_BASE_URL: string;
  MAX_AVATAR_SIZE: string;

  // Secrets
  ALCHEMY_API_KEY?: string;
  OPENSEA_API_KEY?: string;
  LENS_API_ENDPOINT?: string;
  FARCASTER_API_KEY?: string;
}

/**
 * Cached avatar entry
 */
export interface CacheEntry {
  avatar_url: string;
  source: 'ens' | 'opensea' | 'lens' | 'default';
  cached_at: number;
  expires_at: number;
  metadata?: {
    address?: string;
    name?: string;
    bio?: string;
    verified?: boolean;
  };
}

/**
 * Session data for authenticated users
 */
export interface SessionData {
  address: string;
  chainId: number;
  authenticated_at: number;
  expires_at: number;
}

/**
 * SIWE challenge request
 */
export interface SIWEChallengeRequest {
  address: string;
}

/**
 * SIWE verification request
 */
export interface SIWEVerifyRequest {
  message: string;
  signature: string;
}

/**
 * Batch avatar resolution request
 */
export interface AvatarBatchRequest {
  addresses: string[];
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  requests: number;
  window: number; // seconds
}

/**
 * Avatar resolver interface
 */
export interface AvatarResolver {
  resolve(address: string, env: Env): Promise<string | null>;
  priority: number;
  timeout: number;
}

/**
 * API Error response
 */
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  environment: string;
  version: string;
  checks: Record<string, string>;
}