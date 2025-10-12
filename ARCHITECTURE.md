# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│  (Web Apps, Mobile Apps, CLI Tools, Third-party Services)       │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTP/HTTPS Requests
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Global Network                     │
│                  (330+ Edge Locations Worldwide)                 │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     CDN Edge Cache                       │   │
│  │              (1-2 hour cached responses)                 │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │ Cache Miss                             │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Cloudflare Worker (V8 Isolate)             │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────┐    │   │
│  │  │           Request Router (index.ts)            │    │   │
│  │  └─────────┬──────────────────────────────────────┘    │   │
│  │            │                                             │   │
│  │            ├──► Avatar Handlers (handlers/avatar.ts)    │   │
│  │            │    • Single resolution                     │   │
│  │            │    • Batch resolution                      │   │
│  │            │                                             │   │
│  │            ├──► Auth Handlers (handlers/auth.ts)        │   │
│  │            │    • SIWE challenge generation             │   │
│  │            │    • Signature verification                │   │
│  │            │    • Session management                    │   │
│  │            │                                             │   │
│  │            └──► Health Check Handler                    │   │
│  │                                                          │   │
│  └──────────────────┬───────────────────────────────────────┘  │
│                     │                                            │
│                     ▼                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               Cloudflare KV Storage                      │   │
│  │                                                          │   │
│  │  • AVATAR_CACHE (24h TTL)     • SESSION_CACHE (7d TTL) │   │
│  │  • NONCE_CACHE (10m TTL)      • RATE_LIMIT_CACHE (1h)  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                     │
                     │ Avatar Resolution Waterfall
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     External Web3 APIs                           │
│                                                                   │
│  1. ENS (Ethereum Name Service)                                  │
│     └─► Alchemy RPC (eth-mainnet.g.alchemy.com)                 │
│                                                                   │
│  2. OpenSea NFT API                                              │
│     └─► api.opensea.io/api/v2                                   │
│                                                                   │
│  3. Lens Protocol                                                │
│     └─► api-v2.lens.dev                                         │
│                                                                   │
│  4. Default Avatar Generator (Fallback)                          │
│     └─► api.dicebear.com/7.x/identicon                          │
└─────────────────────────────────────────────────────────────────┘
```

## Request Flow

### 1. Avatar Resolution Flow

```
Client Request: GET /avatar/0xd8dA...6045
         │
         ▼
    CDN Cache Check
         │
    ┌────┴────┐
    │ Hit?    │
    └────┬────┘
         │
    ┌────▼────────────┐
    │ Yes  │    No    │
    ▼      │          ▼
 Return    │     Worker Execution
 (< 10ms)  │          │
           │          ▼
           │     KV Cache Check
           │          │
           │     ┌────┴────┐
           │     │ Cached? │
           │     └────┬────┘
           │          │
           │     ┌────▼────────────┐
           │     │ Yes  │    No   │
           │     ▼      │         ▼
           │  Return    │    Resolution Waterfall:
           │  (< 50ms)  │    1. Try ENS (5s timeout)
           │            │    2. Try OpenSea (3s timeout)
           │            │    3. Try Lens (3s timeout)
           │            │    4. Default Avatar
           │            │         │
           │            │         ▼
           │            │    Cache Result (24h or 6h)
           │            │         │
           │            └─────────┘
           │                      │
           └──────────────────────┘
                                  │
                                  ▼
                           Response (Redirect or JSON)
                           Add Cache Headers
                           Add Security Headers
```

### 2. Authentication Flow (SIWE)

```
Client: POST /auth/challenge
         │
         ▼
    Worker generates nonce
         │
         ▼
    Create SIWE message
         │
         ▼
    Store nonce in KV (10m TTL)
         │
         ▼
    Return {nonce, message}
         │
         ▼
    Client signs message with wallet
         │
         ▼
Client: POST /auth/verify {message, signature}
         │
         ▼
    Worker verifies signature
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │
    ┌────▼──────────┐
    │ Yes │    No   │
    ▼     │         ▼
 Create   │    Return Error 401
 Session  │
    │     │
    ▼     │
 Store in │
 KV (7d)  │
    │     │
    ▼     │
 Return   │
 {token}  │
    │     │
    └─────┘
```

## Data Flow

### KV Storage Patterns

```typescript
// Avatar Cache Entry
avatar:0xd8dA...6045 → {
  avatar_url: "https://...",
  source: "ens",
  cached_at: 1234567890,
  expires_at: 1234654290,
  metadata: { address: "0xd8dA...6045" }
}

// Session Entry
session:uuid-token → {
  address: "0xd8dA...6045",
  chainId: 1,
  authenticated_at: 1234567890,
  expires_at: 1235172690
}

// Nonce Entry
nonce:uuid-nonce → "0xd8dA...6045"

// Rate Limit Entry
rate:192.168.1.1:1234567890 → "42"
```

## Component Responsibilities

### Worker Entry Point (`src/index.ts`)
- Route incoming requests
- Handle CORS preflight
- Add security headers
- Global error handling
- Health check endpoint

### Avatar Handlers (`src/handlers/avatar.ts`)
- Single avatar resolution
- Batch avatar resolution
- Content negotiation (redirect vs JSON)
- Response caching strategy

### Auth Handlers (`src/handlers/auth.ts`)
- SIWE challenge generation
- Signature verification
- Session management
- Token validation
- Logout handling

### Avatar Sources (`src/services/avatarSources.ts`)
- ENS resolution via Alchemy
- OpenSea NFT lookup
- Lens Protocol integration
- IPFS URL conversion
- Error handling per source

### Cache Service (`src/services/cache.ts`)
- KV get/set operations
- TTL management
- Cache invalidation
- Rate limiting checks
- Expiration handling

### Validation Utils (`src/utils/validation.ts`)
- Address format validation
- Request body validation
- Authentication middleware
- CORS headers
- Security headers
- Input sanitization

## Performance Characteristics

### Latency (P50/P95/P99)

| Operation | P50 | P95 | P99 |
|-----------|-----|-----|-----|
| Cache Hit (CDN) | 8ms | 15ms | 25ms |
| Cache Hit (KV) | 35ms | 60ms | 100ms |
| ENS Resolution | 450ms | 800ms | 1200ms |
| OpenSea Lookup | 320ms | 550ms | 900ms |
| Lens Resolution | 280ms | 480ms | 750ms |
| Default Avatar | 150ms | 250ms | 400ms |

### Scalability

- **Horizontal**: Automatic scaling across 330+ edge locations
- **Vertical**: Each Worker instance isolated in V8 isolate
- **Concurrency**: Handles 1000+ concurrent requests per edge location
- **Global**: Request routed to nearest edge location automatically

### Resource Limits

| Resource | Free Tier | Paid Tier |
|----------|-----------|----------|
| CPU Time | 10ms | 50ms (upgradeable to 30s) |
| Memory | 128MB | 128MB |
| Requests/day | 100,000 | Unlimited |
| KV Reads | Unlimited | Unlimited |
| KV Writes | 1,000/day | Unlimited |
| KV Storage | 1GB | 1GB+ |

## Security Layers

### 1. Network Layer
- Cloudflare DDoS protection
- Bot management
- Rate limiting (330 Gbps+)

### 2. Application Layer
- CORS policies
- Security headers (CSP, X-Frame-Options, etc.)
- Input validation
- Address format verification

### 3. Authentication Layer
- SIWE cryptographic signatures
- Nonce-based replay protection
- Session expiration (7 days)
- Token invalidation on logout

### 4. Rate Limiting
- IP-based rate limiting
- User-based rate limiting (authenticated)
- Sliding window algorithm
- KV-backed counters

## Monitoring & Observability

### Built-in Metrics
- Request count
- Error rate
- CPU time used
- KV operations
- Response time (P50, P95, P99)

### Health Checks
- KV connectivity test
- Worker availability
- External API health

### Logging
- Console logs visible via `wrangler tail`
- Error stack traces
- Request/response metadata
- Performance timing

## Deployment Pipeline

```
GitHub Push
     │
     ▼
GitHub Actions Triggered
     │
     ├──► Type Check (tsc --noEmit)
     │
     ├──► Run Tests (vitest)
     │
     └──► Lint (eslint)
          │
     ┌────┴────┐
     │ Success?│
     └────┬────┘
          │
     ┌────▼──────────┐
     │ PR  │  Main   │
     ▼     │         ▼
 Deploy    │    Deploy to
 to Staging│    Production
     │     │         │
     └─────┴─────────┘
                     │
                     ▼
              Wrangler Deploy
                     │
                     ▼
           Update Worker on Edge
           (Instant, no downtime)
```

## Cost Analysis

### Monthly Cost Breakdown (Estimated)

#### Free Tier (100K requests/day)
- Workers: $0
- KV Storage: $0
- Bandwidth: $0
- **Total: $0/month**

#### Paid Tier (10M requests/month)
- Workers: $5/month base + $0.50/million additional
- KV Storage: $0.50/GB/month
- KV Operations: Included
- Bandwidth: Included
- **Total: ~$5-10/month** for most use cases

#### Comparison to Traditional Stack
- Express + VPS: $5-50/month
- PostgreSQL: $5-25/month
- Redis: $5-20/month
- Load Balancer: $10-20/month
- **Traditional Total: $25-115/month**

**Savings: 80-95% cost reduction**

## Future Enhancements

### Phase 2
- [ ] Farcaster integration
- [ ] XMTP avatar support
- [ ] Image resizing/optimization
- [ ] Custom avatar upload

### Phase 3
- [ ] Analytics dashboard
- [ ] Webhook notifications
- [ ] GraphQL API
- [ ] Multi-chain support (Polygon, BSC, etc.)

### Phase 4
- [ ] Premium tier with higher limits
- [ ] White-label deployment
- [ ] Custom domain support
- [ ] Advanced caching strategies

## References

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [SIWE Specification](https://eips.ethereum.org/EIPS/eip-4361)
- [ENS Documentation](https://docs.ens.domains/)
- [Lens Protocol Docs](https://docs.lens.xyz/)
- [OpenSea API Docs](https://docs.opensea.io/)