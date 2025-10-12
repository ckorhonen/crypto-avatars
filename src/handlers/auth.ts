/**
 * Authentication Handlers using Sign-In with Ethereum (SIWE)
 * 
 * Implements the SIWE authentication flow:
 * 1. Generate challenge (nonce)
 * 2. Verify signature
 * 3. Create session
 * 4. Validate session for protected routes
 */

import { SiweMessage } from 'siwe';
import { Env, SessionData, SIWEChallengeRequest, SIWEVerifyRequest } from '../types';
import { CACHE_DURATIONS } from '../config';
import { requireAuth } from '../utils/validation';

/**
 * Generate authentication challenge
 * POST /auth/challenge
 * Body: { address: string }
 */
export async function generateChallengeHandler(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const body = await request.json() as SIWEChallengeRequest;
    const { address } = body;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return new Response(
        JSON.stringify({ error: 'Invalid address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate nonce
    const nonce = crypto.randomUUID();
    const url = new URL(request.url);
    const domain = url.hostname;

    // Create SIWE message
    const siweMessage = new SiweMessage({
      domain,
      address,
      statement: 'Sign in to Crypto Avatars',
      uri: url.origin,
      version: '1',
      chainId: 1,
      nonce,
      issuedAt: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    });

    const message = siweMessage.prepareMessage();

    // Store nonce temporarily
    await env.NONCE_CACHE.put(`nonce:${nonce}`, address, {
      expirationTtl: 600, // 10 minutes
    });

    return new Response(
      JSON.stringify({ nonce, message }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Challenge generation failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate challenge',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Verify SIWE signature and create session
 * POST /auth/verify
 * Body: { message: string, signature: string }
 */
export async function verifySignatureHandler(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const body = await request.json() as SIWEVerifyRequest;
    const { message, signature } = body;

    if (!message || !signature) {
      return new Response(
        JSON.stringify({ error: 'Missing message or signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse and verify SIWE message
    const siweMessage = new SiweMessage(message);
    const fields = await siweMessage.verify({ signature });

    if (!fields.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify nonce hasn't been used
    const storedAddress = await env.NONCE_CACHE.get(`nonce:${siweMessage.nonce}`);
    if (!storedAddress || storedAddress !== siweMessage.address) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired nonce' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete used nonce
    await env.NONCE_CACHE.delete(`nonce:${siweMessage.nonce}`);

    // Create session
    const sessionToken = crypto.randomUUID();
    const session: SessionData = {
      address: siweMessage.address,
      chainId: siweMessage.chainId,
      authenticated_at: Date.now(),
      expires_at: Date.now() + CACHE_DURATIONS.SESSION * 1000,
    };

    await env.SESSION_CACHE.put(
      `session:${sessionToken}`,
      JSON.stringify(session),
      { expirationTtl: CACHE_DURATIONS.SESSION }
    );

    return new Response(
      JSON.stringify({ 
        token: sessionToken,
        address: session.address,
        expiresAt: session.expires_at,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Signature verification failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Signature verification failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Logout and invalidate session
 * POST /auth/logout
 * Headers: Authorization: Bearer <token>
 */
export async function logoutHandler(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const session = await requireAuth(request, env);
    
    // Get token from header
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      await env.SESSION_CACHE.delete(`session:${token}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Get current authenticated user
 * GET /auth/me
 * Headers: Authorization: Bearer <token>
 */
export async function getCurrentUserHandler(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const session = await requireAuth(request, env);

    return new Response(
      JSON.stringify({
        address: session.address,
        chainId: session.chainId,
        authenticated_at: session.authenticated_at,
        expires_at: session.expires_at,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
}