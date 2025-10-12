# Technical Design: Crypto Avatars on Cloudflare Workers

## Overview

This document outlines the technical architecture for a lightweight, serverless crypto avatar resolution service built on Cloudflare Workers. The system provides fast, cached avatar lookups across multiple Web3 identity providers with simple wallet authentication.

## System Architecture

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │───▶│ Cloudflare Worker │───▶│   KV Storage    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  External APIs   │
                       │  - ENS           │
                       │  - Lens Protocol │
                       │  - Farcaster     │
                       │  - XMTP          │
                       └──────────────────┘
```

### Worker Architecture

- **Single Worker Function**: Handles all routes and logic
- **Edge Deployment**: Global distribution via Cloudflare's edge network
- **Stateless Design**: All state stored in KV or derived from requests
- **TypeScript**: Full type safety with Cloudflare Workers types

## KV Storage Design

### Cache Structure

```typescript
interface CacheEntry {
  avatar_url: string;
  source: 'ens' | 'lens' | 'farcaster' | 'xmtp' | 'default';
  cached_at: number;
  expires_at: number;
  metadata?: {
    name?: string;
    bio?: string;
    verified?: boolean;
  };
}
```

### Key Patterns

- **Avatar Cache**: `avatar:{address}` → `CacheEntry`
- **Resolution Cache**: `resolve:{address}:{source}` → `string | null`
- **Rate Limiting**: `rate:{ip}:{window}` → `number`
- **Auth Sessions**: `session:{token}` → `SessionData`

### TTL Strategy

```typescript
const CACHE_DURATIONS = {
  AVATAR_HIT: 24 * 60 * 60,      // 24 hours for successful lookups
  AVATAR_MISS: 6 * 60 * 60,      // 6 hours for failed lookups
  RATE_LIMIT: 60 * 60,           // 1 hour for rate limiting
  SESSION: 7 * 24 * 60 * 60,     // 7 days for auth sessions
} as const;
```

## Avatar Resolution Waterfall

### Resolution Priority

1. **Cache Check**: KV lookup for existing avatar
2. **ENS Resolution**: Primary Web3 identity
3. **Lens Protocol**: Social graph avatar
4. **Farcaster**: Decentralized social network
5. **XMTP**: Messaging protocol avatar
6. **Default Avatar**: Generated or fallback image

### Implementation Flow

```typescript
async function resolveAvatar(address: string): Promise<CacheEntry> {
  // 1. Check cache first
  const cached = await env.AVATAR_CACHE.get(`avatar:${address}`);
  if (cached && !isExpired(cached)) {
    return JSON.parse(cached);
  }

  // 2. Resolution waterfall
  const sources = ['ens', 'lens', 'farcaster', 'xmtp'] as const;
  
  for (const source of sources) {
    try {
      const avatar = await resolveFromSource(address, source);
      if (avatar) {
        const entry = createCacheEntry(avatar, source);
        await cacheAvatar(address, entry);
        return entry;
      }
    } catch (error) {
      console.warn(`${source} resolution failed:`, error);
    }
  }

  // 3. Fallback to default
  const defaultEntry = createDefaultAvatar(address);
  await cacheAvatar(address, defaultEntry);
  return defaultEntry;
}
```

### Source-Specific Resolvers

```typescript
interface AvatarResolver {
  resolve(address: string): Promise<string | null>;
  priority: number;
  timeout: number;
}

const resolvers: Record<string, AvatarResolver> = {
  ens: {
    resolve: async (address) => {
      const name = await provider.lookupAddress(address);
      if (!name) return null;
      return await provider.getAvatar(name);
    },
    priority: 1,
    timeout: 5000,
  },
  lens: {
    resolve: async (address) => {
      const profile = await lensClient.getProfile(address);
      return profile?.picture?.original?.url || null;
    },
    priority: 2,
    timeout: 3000,
  },
  // ... other resolvers
};
```

## Wallet Authentication with SIWE

### Sign-In with Ethereum (SIWE) Flow

```typescript
interface SIWEMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
}

interface SessionData {
  address: string;
  chainId: number;
  authenticated_at: number;
  expires_at: number;
}
```

### Authentication Endpoints

```typescript
// POST /auth/challenge
async function generateChallenge(address: string): Promise<{nonce: string, message: string}> {
  const nonce = crypto.randomUUID();
  const message = new SiweMessage({
    domain: 'crypto-avatars.workers.dev',
    address,
    statement: 'Sign in to Crypto Avatars',
    uri: 'https://crypto-avatars.workers.dev',
    version: '1',
    chainId: 1,
    nonce,
    issuedAt: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
  });
  
  await env.NONCE_CACHE.put(`nonce:${nonce}`, address, { expirationTtl: 600 });
  return { nonce, message: message.prepareMessage() };
}

// POST /auth/verify
async function verifySignature(message: string, signature: string): Promise<string> {
  const siweMessage = new SiweMessage(message);
  const { success, data } = await siweMessage.verify({ signature });
  
  if (!success) throw new Error('Invalid signature');
  
  const sessionToken = crypto.randomUUID();
  const session: SessionData = {
    address: data.address,
    chainId: data.chainId,
    authenticated_at: Date.now(),
    expires_at: Date.now() + CACHE_DURATIONS.SESSION * 1000,
  };
  
  await env.SESSION_CACHE.put(`session:${sessionToken}`, JSON.stringify(session), {
    expirationTtl: CACHE_DURATIONS.SESSION
  });
  
  return sessionToken;
}
```

### Middleware for Protected Routes

```typescript
async function requireAuth(request: Request): Promise<SessionData> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }
  
  const token = authHeader.slice(7);
  const sessionData = await env.SESSION_CACHE.get(`session:${token}`);
  
  if (!sessionData) {
    throw new Error('Invalid or expired session');
  }
  
  return JSON.parse(sessionData);
}
```

## Wrangler Configuration

### wrangler.toml

```toml
name = "crypto-avatars"
main = "src/index.ts"
compatibility_date = "2024-01-15"
node_compat = true

[env.production]
name = "crypto-avatars"
route = "crypto-avatars.workers.dev/*"

[env.staging]
name = "crypto-avatars-staging"

[[kv_namespaces]]
binding = "AVATAR_CACHE"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"

[[kv_namespaces]]
binding = "SESSION_CACHE"
id = "your-session-kv-namespace-id"
preview_id = "your-session-preview-kv-namespace-id"

[[kv_namespaces]]
binding = "NONCE_CACHE"
id = "your-nonce-kv-namespace-id"
preview_id = "your-nonce-preview-kv-namespace-id"

[vars]
ENVIRONMENT = "production"
DEFAULT_AVATAR_BASE_URL = "https://api.dicebear.com/7.x/identicon/svg"

[env.staging.vars]
ENVIRONMENT = "staging"

# Secrets (set via wrangler secret put)
# ALCHEMY_API_KEY
# LENS_API_ENDPOINT
# FARCASTER_API_KEY
```

### Package Configuration

```json
{
  "name": "crypto-avatars-worker",
  "version": "1.0.0",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "deploy:staging": "wrangler deploy --env staging",
    "tail": "wrangler tail",
    "test": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "siwe": "^2.1.4",
    "ethers": "^6.8.1",
    "@lens-protocol/client": "^2.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20231218.0",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "wrangler": "^3.19.0"
  }
}
```

## Performance Optimization Strategies

### Caching Layers

1. **KV Cache**: Primary cache for resolved avatars
2. **Browser Cache**: HTTP cache headers for client-side caching
3. **CDN Cache**: Cloudflare's edge cache for static assets

### Cache Headers Strategy

```typescript
function setCacheHeaders(response: Response, maxAge: number): Response {
  response.headers.set('Cache-Control', `public, max-age=${maxAge}`);
  response.headers.set('CDN-Cache-Control', `public, max-age=${maxAge * 2}`);
  response.headers.set('Vary', 'Accept');
  return response;
}

// Usage examples
const avatarResponse = setCacheHeaders(response, 3600);      // 1 hour browser, 2 hours CDN
const defaultResponse = setCacheHeaders(response, 86400);    // 24 hours for defaults
```

### Request Optimization

```typescript
// Parallel resolution with timeout
async function resolveWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T | null> {
  const timeout = new Promise<null>((resolve) => 
    setTimeout(() => resolve(null), timeoutMs)
  );
  
  return Promise.race([promise, timeout]);
}

// Batch resolution for multiple addresses
async function resolveBatch(addresses: string[]): Promise<Record<string, CacheEntry>> {
  const promises = addresses.map(async (address) => {
    const result = await resolveAvatar(address);
    return [address, result] as const;
  });
  
  const results = await Promise.allSettled(promises);
  return Object.fromEntries(
    results
      .filter((r): r is PromiseFulfilledResult<readonly [string, CacheEntry]> => 
        r.status === 'fulfilled'
      )
      .map(r => r.value)
  );
}
```

### Rate Limiting

```typescript
interface RateLimitConfig {
  requests: number;
  window: number; // seconds
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  anonymous: { requests: 100, window: 3600 },    // 100/hour
  authenticated: { requests: 1000, window: 3600 }, // 1000/hour
  premium: { requests: 10000, window: 3600 },    // 10k/hour
};

async function checkRateLimit(
  identifier: string,
  tier: keyof typeof RATE_LIMITS
): Promise<boolean> {
  const config = RATE_LIMITS[tier];
  const key = `rate:${identifier}:${Math.floor(Date.now() / 1000 / config.window)}`;
  
  const current = await env.RATE_LIMIT_CACHE.get(key);
  const count = current ? parseInt(current) : 0;
  
  if (count >= config.requests) {
    return false;
  }
  
  await env.RATE_LIMIT_CACHE.put(
    key,
    (count + 1).toString(),
    { expirationTtl: config.window }
  );
  
  return true;
}
```

## API Endpoints

### Core Routes

```typescript
const router = {
  // Avatar resolution
  'GET /avatar/:address': resolveAvatarHandler,
  'GET /avatar/:address/:size': resizeAvatarHandler,
  'POST /avatar/batch': batchResolveHandler,
  
  // Authentication
  'POST /auth/challenge': generateChallengeHandler,
  'POST /auth/verify': verifySignatureHandler,
  'POST /auth/logout': logoutHandler,
  'GET /auth/me': getCurrentUserHandler,
  
  // Admin/Management
  'DELETE /cache/:address': clearCacheHandler,
  'GET /health': healthCheckHandler,
  'GET /stats': getStatsHandler,
};

// Example handler
async function resolveAvatarHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const address = url.pathname.split('/')[2];
  
  if (!isValidAddress(address)) {
    return new Response('Invalid address', { status: 400 });
  }
  
  try {
    const avatar = await resolveAvatar(address);
    const response = Response.redirect(avatar.avatar_url, 302);
    return setCacheHeaders(response, 3600);
  } catch (error) {
    console.error('Avatar resolution failed:', error);
    return new Response('Avatar not found', { status: 404 });
  }
}
```

## Deployment Pipeline with GitHub Actions

### .github/workflows/deploy.yml

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Run tests
        run: npm test

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Deploy to staging
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env staging

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Deploy to production
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env production
      
      - name: Update deployment status
        run: |
          echo "Deployed to production at $(date)"
          echo "Worker URL: https://crypto-avatars.workers.dev"
```

### Environment Setup

```bash
# Required GitHub Secrets
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_ACCOUNT_ID=your-account-id

# Required Wrangler Secrets (set via CLI)
wrangler secret put ALCHEMY_API_KEY
wrangler secret put LENS_API_ENDPOINT
wrangler secret put FARCASTER_API_KEY
```

## Monitoring and Observability

### Built-in Analytics

```typescript
// Custom analytics tracking
async function trackEvent(event: string, metadata?: Record<string, any>) {
  const data = {
    event,
    timestamp: Date.now(),
    metadata,
  };
  
  // Use Cloudflare Analytics Engine or external service
  await env.ANALYTICS.writeDataPoint(data);
}

// Usage in handlers
await trackEvent('avatar_resolved', {
  address,
  source: result.source,
  cache_hit: fromCache,
  response_time: Date.now() - startTime,
});
```

### Health Checks

```typescript
async function healthCheck(): Promise<Response> {
  const checks = {
    kv_connectivity: await testKVConnection(),
    external_apis: await testExternalAPIs(),
    memory_usage: getMemoryUsage(),
    uptime: getUptime(),
  };
  
  const healthy = Object.values(checks).every(check => 
    typeof check === 'boolean' ? check : check.status === 'ok'
  );
  
  return Response.json(
    { status: healthy ? 'healthy' : 'degraded', checks },
    { status: healthy ? 200 : 503 }
  );
}
```

## Security Considerations

### Input Validation

```typescript
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function sanitizeInput(input: string): string {
  return input.replace(/[^\w\s-_.]/g, '').slice(0, 100);
}
```

### CORS Configuration

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function handleCORS(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}
```

### Content Security

```typescript
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
```

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Set up Cloudflare Workers project with TypeScript
- [ ] Configure KV namespaces for caching
- [ ] Implement basic avatar resolution waterfall
- [ ] Add ENS resolver integration
- [ ] Set up basic caching layer

### Phase 2: Authentication & API
- [ ] Implement SIWE authentication flow
- [ ] Add session management with KV storage
- [ ] Create protected API endpoints
- [ ] Add rate limiting middleware
- [ ] Implement batch resolution endpoint

### Phase 3: Additional Providers
- [ ] Integrate Lens Protocol resolver
- [ ] Add Farcaster avatar support
- [ ] Implement XMTP avatar resolution
- [ ] Add fallback avatar generation

### Phase 4: Optimization & Deployment
- [ ] Implement performance optimizations
- [ ] Add comprehensive error handling
- [ ] Set up monitoring and analytics
- [ ] Configure GitHub Actions deployment
- [ ] Add health checks and observability

### Phase 5: Production Readiness
- [ ] Security audit and hardening
- [ ] Load testing and performance tuning
- [ ] Documentation and API reference
- [ ] Monitoring dashboards setup
- [ ] Production deployment and rollout

This technical design provides a comprehensive foundation for building a high-performance, serverless crypto avatar resolution service on Cloudflare Workers with proper caching, authentication, and deployment strategies.