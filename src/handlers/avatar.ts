/**
 * Avatar Resolution Handlers
 * 
 * Implements the avatar resolution waterfall approach:
 * 1. Check cache
 * 2. Try ENS
 * 3. Try OpenSea
 * 4. Try Lens Protocol
 * 5. Fall back to default avatar
 */

import { Env, CacheEntry, AvatarBatchRequest } from '../types';
import { resolveFromENS, resolveFromOpenSea, resolveFromLens } from '../services/avatarSources';
import { getCachedAvatar, setCachedAvatar } from '../services/cache';
import { isValidAddress, validateBatchRequest } from '../utils/validation';
import { CACHE_DURATIONS, DEFAULT_AVATAR_BASE_URL } from '../config';

/**
 * Main avatar resolution handler
 * GET /avatar/:address
 */
export async function resolveAvatarHandler(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const address = pathParts[2];

  // Validate address format
  if (!address || !isValidAddress(address)) {
    return new Response(
      JSON.stringify({ error: 'Invalid Ethereum address' }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Resolve avatar with caching
    const avatar = await resolveAvatar(address, env, ctx);

    // Check if client wants JSON or redirect
    const acceptHeader = request.headers.get('Accept');
    if (acceptHeader?.includes('application/json')) {
      return new Response(JSON.stringify(avatar), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${CACHE_DURATIONS.AVATAR_HIT}`,
        },
      });
    }

    // Default: redirect to avatar URL
    return Response.redirect(avatar.avatar_url, 302);

  } catch (error) {
    console.error('Avatar resolution failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Avatar resolution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Batch avatar resolution handler
 * POST /avatar/batch
 * Body: { addresses: string[] }
 */
export async function batchResolveHandler(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const body = await request.json() as AvatarBatchRequest;
    
    // Validate request
    const validation = validateBatchRequest(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: validation.error }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { addresses } = body;

    // Resolve all avatars in parallel
    const results = await Promise.allSettled(
      addresses.map(address => resolveAvatar(address, env, ctx))
    );

    // Map results to response format
    const response: Record<string, CacheEntry | { error: string }> = {};
    addresses.forEach((address, index) => {
      const result = results[index];
      if (result.status === 'fulfilled') {
        response[address] = result.value;
      } else {
        response[address] = { error: result.reason?.message || 'Resolution failed' };
      }
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_DURATIONS.AVATAR_HIT}`,
      },
    });

  } catch (error) {
    console.error('Batch resolution failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Batch resolution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Core avatar resolution logic with waterfall approach
 */
async function resolveAvatar(
  address: string,
  env: Env,
  ctx: ExecutionContext
): Promise<CacheEntry> {
  // 1. Check cache first
  const cached = await getCachedAvatar(address, env);
  if (cached) {
    return cached;
  }

  // 2. Try resolution waterfall
  const sources: Array<{
    name: 'ens' | 'opensea' | 'lens' | 'default';
    resolver: (addr: string, e: Env) => Promise<string | null>;
  }> = [
    { name: 'ens', resolver: resolveFromENS },
    { name: 'opensea', resolver: resolveFromOpenSea },
    { name: 'lens', resolver: resolveFromLens },
  ];

  for (const { name, resolver } of sources) {
    try {
      const avatarUrl = await resolver(address, env);
      if (avatarUrl) {
        const entry = createCacheEntry(avatarUrl, name, address);
        // Cache in background
        ctx.waitUntil(setCachedAvatar(address, entry, env, CACHE_DURATIONS.AVATAR_HIT));
        return entry;
      }
    } catch (error) {
      console.warn(`${name} resolution failed for ${address}:`, error);
      // Continue to next source
    }
  }

  // 3. Fallback to default avatar
  const defaultUrl = `${env.DEFAULT_AVATAR_BASE_URL || DEFAULT_AVATAR_BASE_URL}?seed=${address}`;
  const defaultEntry = createCacheEntry(defaultUrl, 'default', address);
  
  // Cache default avatar (shorter TTL)
  ctx.waitUntil(setCachedAvatar(address, defaultEntry, env, CACHE_DURATIONS.AVATAR_MISS));
  
  return defaultEntry;
}

/**
 * Create a cache entry from resolved avatar data
 */
function createCacheEntry(
  avatarUrl: string,
  source: 'ens' | 'opensea' | 'lens' | 'default',
  address: string
): CacheEntry {
  const now = Date.now();
  const ttl = source === 'default' ? CACHE_DURATIONS.AVATAR_MISS : CACHE_DURATIONS.AVATAR_HIT;
  
  return {
    avatar_url: avatarUrl,
    source,
    cached_at: now,
    expires_at: now + (ttl * 1000),
    metadata: {
      address,
    },
  };
}