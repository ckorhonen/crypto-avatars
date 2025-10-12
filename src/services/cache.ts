/**
 * KV Caching Service
 * 
 * Manages caching of avatar resolutions in Cloudflare KV storage
 */

import { Env, CacheEntry } from '../types';

/**
 * Get cached avatar for an address
 */
export async function getCachedAvatar(
  address: string,
  env: Env
): Promise<CacheEntry | null> {
  try {
    const cacheKey = `avatar:${address.toLowerCase()}`;
    const cached = await env.AVATAR_CACHE.get(cacheKey);

    if (!cached) {
      return null;
    }

    const entry = JSON.parse(cached) as CacheEntry;

    // Check if cache entry has expired
    if (entry.expires_at && Date.now() > entry.expires_at) {
      // Delete expired entry
      await env.AVATAR_CACHE.delete(cacheKey);
      return null;
    }

    return entry;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Set cached avatar for an address
 */
export async function setCachedAvatar(
  address: string,
  entry: CacheEntry,
  env: Env,
  ttl: number
): Promise<void> {
  try {
    const cacheKey = `avatar:${address.toLowerCase()}`;
    await env.AVATAR_CACHE.put(
      cacheKey,
      JSON.stringify(entry),
      { expirationTtl: ttl }
    );
  } catch (error) {
    console.error('Cache write error:', error);
    // Don't throw - cache failures shouldn't break the app
  }
}

/**
 * Delete cached avatar for an address
 */
export async function deleteCachedAvatar(
  address: string,
  env: Env
): Promise<void> {
  try {
    const cacheKey = `avatar:${address.toLowerCase()}`;
    await env.AVATAR_CACHE.delete(cacheKey);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Check rate limit for an identifier
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  window: number,
  env: Env
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const windowKey = Math.floor(now / window);
    const key = `rate:${identifier}:${windowKey}`;

    const current = await env.RATE_LIMIT_CACHE.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= limit) {
      return { allowed: false, remaining: 0 };
    }

    // Increment counter
    await env.RATE_LIMIT_CACHE.put(
      key,
      (count + 1).toString(),
      { expirationTtl: window }
    );

    return { allowed: true, remaining: limit - count - 1 };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request if rate limiting fails
    return { allowed: true, remaining: limit };
  }
}