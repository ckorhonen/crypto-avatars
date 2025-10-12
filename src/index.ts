/**
 * Crypto Avatars - Cloudflare Workers Entry Point
 * 
 * Main worker that handles all incoming requests and routes them
 * to appropriate handlers.
 */

import { Env } from './types';
import { resolveAvatarHandler, batchResolveHandler } from './handlers/avatar';
import {
  generateChallengeHandler,
  verifySignatureHandler,
  logoutHandler,
  getCurrentUserHandler,
} from './handlers/auth';
import { handleCORS, addSecurityHeaders } from './utils/validation';

/**
 * Router configuration mapping paths to handlers
 */
const routes = {
  // Avatar resolution endpoints
  '/avatar/:address': resolveAvatarHandler,
  '/avatar/batch': batchResolveHandler,
  
  // Authentication endpoints
  '/auth/challenge': generateChallengeHandler,
  '/auth/verify': verifySignatureHandler,
  '/auth/logout': logoutHandler,
  '/auth/me': getCurrentUserHandler,
  
  // Utility endpoints
  '/health': healthCheckHandler,
};

/**
 * Main worker fetch handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Handle CORS preflight requests
      const corsResponse = handleCORS(request);
      if (corsResponse) {
        return corsResponse;
      }

      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // Health check endpoint
      if (path === '/health' && method === 'GET') {
        return healthCheckHandler(request, env, ctx);
      }

      // Avatar resolution endpoints
      if (path.startsWith('/avatar/batch') && method === 'POST') {
        const response = await batchResolveHandler(request, env, ctx);
        return addSecurityHeaders(response);
      }

      if (path.startsWith('/avatar/') && method === 'GET') {
        const response = await resolveAvatarHandler(request, env, ctx);
        return addSecurityHeaders(response);
      }

      // Authentication endpoints
      if (path === '/auth/challenge' && method === 'POST') {
        const response = await generateChallengeHandler(request, env, ctx);
        return addSecurityHeaders(response);
      }

      if (path === '/auth/verify' && method === 'POST') {
        const response = await verifySignatureHandler(request, env, ctx);
        return addSecurityHeaders(response);
      }

      if (path === '/auth/logout' && method === 'POST') {
        const response = await logoutHandler(request, env, ctx);
        return addSecurityHeaders(response);
      }

      if (path === '/auth/me' && method === 'GET') {
        const response = await getCurrentUserHandler(request, env, ctx);
        return addSecurityHeaders(response);
      }

      // 404 for unmatched routes
      return new Response('Not Found', { 
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }), 
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },
};

/**
 * Health check handler
 */
async function healthCheckHandler(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.ENVIRONMENT || 'unknown',
    version: '2.0.0',
    checks: {
      kv: 'ok',
    },
  };

  // Test KV connectivity
  try {
    await env.AVATAR_CACHE.put('health_check', 'ok', { expirationTtl: 60 });
    const test = await env.AVATAR_CACHE.get('health_check');
    health.checks.kv = test === 'ok' ? 'ok' : 'degraded';
  } catch (error) {
    health.checks.kv = 'error';
    health.status = 'degraded';
  }

  return new Response(JSON.stringify(health, null, 2), {
    status: health.status === 'healthy' ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}