/**
 * Client Integration Examples
 * 
 * Example code showing how to integrate with the Crypto Avatars API
 * from various JavaScript/TypeScript clients.
 */

import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = 'https://crypto-avatars.workers.dev';
// Or for local development:
// const API_BASE_URL = 'http://localhost:8787';

// ============================================================================
// 1. Basic Avatar Resolution
// ============================================================================

/**
 * Get avatar URL for an Ethereum address
 */
async function getAvatarUrl(address: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/avatar/${address}`, {
    redirect: 'manual', // Don't follow redirect
  });

  if (response.status === 302) {
    // API redirects to avatar URL
    return response.headers.get('Location')!;
  }

  throw new Error('Avatar not found');
}

/**
 * Get avatar metadata (JSON response)
 */
async function getAvatarMetadata(address: string) {
  const response = await fetch(`${API_BASE_URL}/avatar/${address}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Avatar resolution failed');
  }

  return await response.json();
}

// Usage:
// const avatarUrl = await getAvatarUrl('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
// const metadata = await getAvatarMetadata('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');

// ============================================================================
// 2. Batch Avatar Resolution
// ============================================================================

/**
 * Resolve multiple avatars at once
 */
async function batchResolveAvatars(addresses: string[]) {
  const response = await fetch(`${API_BASE_URL}/avatar/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ addresses }),
  });

  if (!response.ok) {
    throw new Error('Batch resolution failed');
  }

  return await response.json();
}

// Usage:
// const avatars = await batchResolveAvatars([
//   '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
//   '0x1234567890123456789012345678901234567890',
// ]);

// ============================================================================
// 3. SIWE Authentication Flow
// ============================================================================

interface AuthSession {
  token: string;
  address: string;
  expiresAt: number;
}

/**
 * Complete SIWE authentication flow
 */
class SIWEAuth {
  private token: string | null = null;

  /**
   * Sign in with Ethereum wallet
   */
  async signIn(provider: ethers.BrowserProvider): Promise<AuthSession> {
    // 1. Get user address
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    // 2. Request challenge from server
    const challengeResponse = await fetch(`${API_BASE_URL}/auth/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    });

    if (!challengeResponse.ok) {
      throw new Error('Failed to get challenge');
    }

    const { message, nonce } = await challengeResponse.json();

    // 3. Sign message with wallet
    const signature = await signer.signMessage(message);

    // 4. Verify signature and get session token
    const verifyResponse = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, signature }),
    });

    if (!verifyResponse.ok) {
      throw new Error('Signature verification failed');
    }

    const session: AuthSession = await verifyResponse.json();
    this.token = session.token;

    // Store token for future requests
    localStorage.setItem('auth_token', session.token);

    return session;
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    const token = this.token || localStorage.getItem('auth_token');
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Clear invalid token
      this.signOut();
      throw new Error('Session expired or invalid');
    }

    return await response.json();
  }

  /**
   * Sign out and clear session
   */
  async signOut() {
    const token = this.token || localStorage.getItem('auth_token');
    
    if (token) {
      // Invalidate session on server
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }

    this.token = null;
    localStorage.removeItem('auth_token');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.token || localStorage.getItem('auth_token'));
  }
}

// Usage:
// const auth = new SIWEAuth();
// const provider = new ethers.BrowserProvider(window.ethereum);
// const session = await auth.signIn(provider);
// const user = await auth.getCurrentUser();
// await auth.signOut();

// ============================================================================
// 4. React Hook Example
// ============================================================================

/**
 * React hook for avatar resolution
 */
function useAvatar(address: string | undefined) {
  const [avatar, setAvatar] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!address) return;

    setLoading(true);
    setError(null);

    getAvatarMetadata(address)
      .then(setAvatar)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [address]);

  return { avatar, loading, error };
}

/**
 * React hook for SIWE authentication
 */
function useSIWEAuth() {
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const [loading, setLoading] = React.useState(false);
  const auth = React.useMemo(() => new SIWEAuth(), []);

  const signIn = async (provider: ethers.BrowserProvider) => {
    setLoading(true);
    try {
      const session = await auth.signIn(provider);
      setSession(session);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await auth.signOut();
    setSession(null);
  };

  return {
    session,
    loading,
    signIn,
    signOut,
    isAuthenticated: auth.isAuthenticated(),
  };
}

// Usage in React component:
// function AvatarDisplay({ address }: { address: string }) {
//   const { avatar, loading, error } = useAvatar(address);
//
//   if (loading) return <div>Loading...</div>;
//   if (error) return <div>Error: {error.message}</div>;
//   if (!avatar) return null;
//
//   return <img src={avatar.avatar_url} alt="Avatar" />;
// }

// ============================================================================
// 5. Error Handling
// ============================================================================

/**
 * Wrapper with proper error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Unknown error',
        message: response.statusText,
      }));

      throw new Error(error.message || error.error);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error');
  }
}

// Usage:
// const avatar = await apiRequest('/avatar/0x...');

// ============================================================================
// 6. TypeScript Types
// ============================================================================

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

export interface SessionData {
  address: string;
  chainId: number;
  authenticated_at: number;
  expires_at: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  environment: string;
  version: string;
  checks: Record<string, string>;
}

// ============================================================================
// 7. Testing Helpers
// ============================================================================

/**
 * Test avatar resolution for multiple addresses
 */
async function testAvatarResolution() {
  const testAddresses = [
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
    '0x1234567890123456789012345678901234567890', // random address
  ];

  console.log('Testing avatar resolution...');

  for (const address of testAddresses) {
    try {
      const avatar = await getAvatarMetadata(address);
      console.log(`✓ ${address}:`, avatar.source, avatar.avatar_url);
    } catch (error) {
      console.error(`✗ ${address}:`, error);
    }
  }
}

/**
 * Test health check endpoint
 */
async function testHealthCheck() {
  const response = await fetch(`${API_BASE_URL}/health`);
  const health: HealthCheckResponse = await response.json();
  
  console.log('Health check:', health);
  return health.status === 'healthy';
}

export {
  getAvatarUrl,
  getAvatarMetadata,
  batchResolveAvatars,
  SIWEAuth,
  useAvatar,
  useSIWEAuth,
  apiRequest,
  testAvatarResolution,
  testHealthCheck,
};