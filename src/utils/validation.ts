/**
 * Request Validation Utilities
 * 
 * Handles input validation, authentication, CORS, and security headers
 */

import { Env, SessionData, AvatarBatchRequest } from '../types';

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate batch request
 */
export function validateBatchRequest(
  body: unknown
): { success: true } | { success: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Invalid request body' };
  }

  const { addresses } = body as AvatarBatchRequest;

  if (!Array.isArray(addresses)) {
    return { success: false, error: 'addresses must be an array' };
  }

  if (addresses.length === 0) {
    return { success: false, error: 'addresses array cannot be empty' };
  }

  if (addresses.length > 100) {
    return { success: false, error: 'Maximum 100 addresses per batch' };
  }

  for (const address of addresses) {
    if (!isValidAddress(address)) {
      return { success: false, error: `Invalid address: ${address}` };
    }
  }

  return { success: true };
}

/**
 * Require authentication for protected routes
 */
export async function requireAuth(
  request: Request,
  env: Env
): Promise<SessionData> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);
  const sessionData = await env.SESSION_CACHE.get(`session:${token}`);

  if (!sessionData) {
    throw new Error('Invalid or expired session');
  }

  const session = JSON.parse(sessionData) as SessionData;

  // Check if session has expired
  if (Date.now() > session.expires_at) {
    await env.SESSION_CACHE.delete(`session:${token}`);
    throw new Error('Session expired');
  }

  return session;
}

/**
 * Handle CORS preflight requests
 */
export function handleCORS(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  return null;
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  // CORS headers
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Content-Security-Policy', "default-src 'self'");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string, maxLength: number = 100): string {
  return input
    .replace(/[^\w\s-_.]/g, '')
    .slice(0, maxLength)
    .trim();
}