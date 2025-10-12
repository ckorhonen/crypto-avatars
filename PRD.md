# Crypto Avatars - Product Requirements Document v2
## Serverless Avatar Aggregation Service

**Version:** 2.0  
**Last Updated:** January 2025  
**Status:** Active Development

---

## Executive Summary

Crypto Avatars is a lightweight, serverless avatar aggregation service running on Cloudflare Workers that resolves crypto wallet addresses to profile images from multiple sources (OpenSea, ENS, Lens Protocol, etc.). By leveraging Cloudflare's global edge network and intelligent caching, we deliver sub-100ms avatar resolution worldwide.

**The Promise:** The fastest, most reliable way to resolve wallet addresses to avatars—no infrastructure required.

---

## Core Product Vision

Become the **fastest and most reliable avatar resolution service for Web3** by:
- Aggregating avatars from multiple sources with intelligent fallback
- Running entirely on Cloudflare's edge network for global performance
- Providing zero-configuration integration for developers
- Maintaining 99.9%+ uptime with no servers to manage

This is **not** about building another decentralized storage platform—it's about pragmatically solving avatar resolution with modern serverless technology.

---

## Problem Statement

### Current Pain Points
1. **Speed**: Developers must make multiple API calls to resolve avatars (ENS, OpenSea, etc.), adding 500ms+ latency
2. **Reliability**: Third-party APIs have variable uptime and rate limits
3. **Complexity**: Each integration requires different authentication, formats, and error handling
4. **Performance**: No unified caching strategy means repeated slow lookups
5. **Global Reach**: Services without edge distribution suffer from geographic latency

### Our Solution
A single, fast API endpoint that handles all the complexity:
```
GET https://avatars.crypto/0x742d35Cc6634C0532925a3b8D5c0B5E4C2b8B5D5
→ Returns avatar in <100ms globally
```

---

## Serverless-First Architecture Benefits

### Why Cloudflare Workers?

**Performance**
- Deploy to 300+ edge locations globally
- Sub-10ms cold starts
- Requests served from nearest edge node
- Built-in DDoS protection and CDN

**Cost Efficiency**
- Pay only for requests (not idle servers)
- No infrastructure management overhead
- Built-in scaling to millions of requests
- First 100K requests/day free

**Developer Experience**
- Deploy in seconds with `wrangler`
- Built-in TypeScript support
- Local development environment
- Integrated monitoring and analytics

**Reliability**
- Automatic failover and redundancy
- No single points of failure
- Built-in rate limiting and security
- 99.99% uptime SLA

---

## Core Features

### 1. Multi-Source Avatar Aggregation

**Supported Sources** (Priority Order):
1. **ENS (Ethereum Name Service)** - Primary Web3 identity
2. **OpenSea API** - NFT profile pictures
3. **Lens Protocol** - Decentralized social profiles
4. **Unstoppable Domains** - Blockchain domains
5. **Custom Upload Cache** - User-provided avatars (Phase 2)
6. **Default Fallback** - Blockies/identicon generation

**Intelligent Fallback Chain:**
```
Request → Check KV Cache → ENS → OpenSea → Lens → Unstoppable → Generate Default
         ↓
    Cache Result (1 hour TTL)
```

**Features:**
- Parallel source checking (when possible)
- Configurable source priority
- Automatic retry with exponential backoff
- Source health monitoring and circuit breakers

### 2. Edge Caching with Cloudflare KV

**Caching Strategy:**
- **L1 Cache**: Cloudflare CDN cache (5 min TTL) - automatic
- **L2 Cache**: KV storage (1 hour TTL) - explicit
- **L3 Cache**: KV storage for verified avatars (24 hour TTL)

**Cache Keys:**
```
avatar:{address}:{size}
avatar:metadata:{address}
avatar:source:{address}:{source_name}
```

**Benefits:**
- Near-instant cache hits (sub-10ms)
- Reduces API calls to external services
- Global distribution of cached data
- Automatic stale-while-revalidate

### 3. Simple API Interface

**Primary Endpoint:**
```
GET /avatar/{address}
Query Parameters:
  - size: 32|64|128|256|512 (default: 128)
  - format: png|jpg|webp|svg (default: webp)
  - fallback: identicon|404|custom_url
  
Response: Image binary or 302 redirect
```

**Metadata Endpoint:**
```
GET /avatar/{address}/metadata
Response:
{
  "address": "0x...",
  "source": "ens",
  "avatar_url": "https://...",
  "cached": true,
  "cache_ttl": 3600,
  "last_updated": "2025-01-15T10:30:00Z"
}
```

**Batch Endpoint:**
```
POST /avatars/batch
Body: { "addresses": ["0x...", "0x..."] }
Response: { "results": [...] }
```

### 4. Wallet Authentication for Custom Uploads (Phase 2)

**Simple Upload Flow:**
1. User signs message with wallet
2. POST avatar image to `/upload` with signature
3. Image stored in R2 (Cloudflare Object Storage)
4. Cached in KV with highest priority
5. Avatar served at `/avatar/{address}`

**No Database Required:**
- Signature verification proves ownership
- Upload metadata stored in KV
- Images in R2 (S3-compatible storage)
- Time-limited upload tokens (24h expiry)

### 5. Global Edge Distribution

**Automatic Global Deployment:**
- Single deploy → 300+ locations
- Nearest edge node serves requests
- Regional failover automatic
- Zero geographic configuration

---

## User Personas

### Primary: DApp Developers

**Profile:**
- Building Web3 frontends (React, Next.js, Vue)
- Need fast, reliable avatar display
- Don't want to manage multiple API integrations

**Goals:**
- Drop-in integration (<5 minutes)
- Reliable performance globally
- Simple pricing (pay for what you use)

**Success Metrics:**
- Integration time <5 minutes
- API response time <100ms p95
- 99.9%+ uptime

**Usage Pattern:**
```jsx
// That's it!
<img src={`https://avatars.crypto/${address}`} />
```

### Secondary: End Users

**Profile:**
- Crypto wallet holders
- Want consistent identity across dApps
- Don't want to upload avatars everywhere

**Goals:**
- Automatic avatar from existing sources (ENS, OpenSea)
- Option to upload custom avatar
- Privacy control over avatar visibility

**Success Metrics:**
- Avatar found rate >80%
- Upload process <2 minutes
- Works in >90% of dApps they use

---

## Technical Requirements

### Cloudflare Workers Specifications

**Runtime Environment:**
- TypeScript with Cloudflare Workers types
- V8 isolates (not Node.js)
- Maximum execution time: 50ms (CPU time)
- Memory limit: 128MB per request

**Dependencies:**
- `ethers` or `viem` for signature verification
- `@cloudflare/workers-types` for TypeScript
- Minimal external dependencies (bundle size optimization)

**API Route Structure:**
```
/avatar/:address          → GET  → Image/Redirect
/avatar/:address/metadata → GET  → JSON metadata
/avatars/batch            → POST → Batch resolution
/upload                   → POST → Custom avatar upload (Phase 2)
/health                   → GET  → Service health
```

### Storage Architecture

**Cloudflare KV (Key-Value Store):**
- Avatar metadata cache
- Source resolution results
- Upload authentication tokens
- Usage: Low-latency reads, eventual consistency okay

**Cloudflare R2 (Object Storage):**
- Custom uploaded avatar images
- Processed/resized image variants
- Cold storage for rarely-accessed avatars
- Usage: S3-compatible, no egress fees

**Cloudflare Durable Objects (Phase 3):**
- Real-time avatar update notifications
- WebSocket connections for live updates
- Usage: Stateful coordination when needed

### External API Integrations

**ENS Integration:**
- Direct Ethereum RPC calls to resolve avatar records
- Fallback RPC providers (Infura, Alchemy, Cloudflare)
- IPFS gateway for ENS avatar URIs

**OpenSea API:**
- REST API for NFT profile pictures
- API key management via Workers secrets
- Rate limiting and backoff strategy

**Lens Protocol:**
- GraphQL queries to Lens API
- Profile picture extraction from metadata
- Handle validation

**Unstoppable Domains:**
- REST API for domain resolution
- Avatar metadata extraction

### Performance Requirements

**Response Time Targets:**
- **Cache Hit**: <50ms p95, <100ms p99
- **Cache Miss**: <300ms p95, <500ms p99
- **Cold Start**: <100ms
- **Batch Requests**: <1s for 10 addresses

**Throughput Targets:**
- Support 1000 req/s on free tier
- Scale to 100K+ req/s with paid plan
- No degradation during traffic spikes

**Availability:**
- 99.9%+ uptime (measured monthly)
- <1 hour downtime per month
- Automatic failover for source APIs

### Security Requirements

**Authentication:**
- API key authentication via headers
- Rate limiting per API key (configurable)
- Wallet signature verification for uploads

**Input Validation:**
- Address format validation (checksum)
- Image upload size limits (5MB max)
- Content-type validation
- CORS configuration for browser requests

**Data Protection:**
- No storage of private keys
- Minimal metadata collection
- GDPR-compliant data handling
- Optional avatar deletion

---

## Performance Goals

### Global Performance Targets

**By Geographic Region:**
- North America: <50ms p95
- Europe: <50ms p95
- Asia-Pacific: <75ms p95
- South America: <100ms p95
- Africa: <100ms p95

**Cache Performance:**
- Cache hit ratio: >95% after warmup
- Cache invalidation: <60s globally
- Stale-while-revalidate: Serve cached during refresh

**Reliability:**
- API uptime: 99.9%+
- Error rate: <0.1%
- Successful resolution: >80% (cache miss)

---

## Success Metrics

### Adoption Metrics (6 months)
- **Integrated DApps**: 50+
- **Daily API Calls**: 100K+
- **Unique Addresses Resolved**: 50K+
- **Developer Signups**: 200+

### Performance Metrics
- **P95 Response Time**: <100ms globally
- **Cache Hit Rate**: >95%
- **Availability**: 99.9%+
- **Error Rate**: <0.1%

### Business Metrics
- **Monthly Active DApps**: 30+
- **Revenue (Month 6)**: $1K+ MRR
- **Cost per Request**: <$0.0001
- **Developer NPS**: 70+

### Quality Metrics
- **Avatar Found Rate**: >80% (cache miss)
- **Image Load Success**: >99%
- **API Documentation Score**: 9/10
- **Support Response Time**: <24h

---

## 6-Month Roadmap

### Month 1: Foundation
**Goal:** Working prototype with core aggregation

**Deliverables:**
- Cloudflare Workers project setup
- ENS avatar resolution
- OpenSea API integration
- Basic KV caching
- Health check endpoint

**Success Criteria:**
- Resolves ENS and OpenSea avatars
- <200ms response time
- Deployed to edge network

### Month 2: Polish & Performance
**Goal:** Production-ready service with monitoring

**Deliverables:**
- Add Lens Protocol and Unstoppable Domains
- Implement intelligent fallback chain
- Add size/format query parameters
- Set up monitoring and alerting
- Create developer documentation

**Success Criteria:**
- 4 source integrations working
- <100ms p95 response time
- Basic documentation published

### Month 3: Developer Experience
**Goal:** Easy integration for developers

**Deliverables:**
- Public launch and documentation site
- API key management system
- Rate limiting implementation
- TypeScript SDK
- React component library
- Example integrations (Next.js, Vite)

**Success Criteria:**
- 10+ integrated DApps
- 10K+ daily API calls
- <5 min integration time

### Month 4: Custom Uploads
**Goal:** Allow users to upload custom avatars

**Deliverables:**
- Wallet signature verification
- R2 storage integration
- Image processing (resize, optimize)
- Upload API endpoint
- Simple web UI for uploads

**Success Criteria:**
- Working upload flow
- 100+ custom avatars uploaded
- <2 min upload process

### Month 5: Scale & Reliability
**Goal:** Handle high traffic reliably

**Deliverables:**
- Advanced caching strategies
- Circuit breakers for source APIs
- Batch resolution endpoint
- Performance optimization
- Load testing and tuning

**Success Criteria:**
- Support 1000 req/s
- 99.9% uptime
- <50ms p95 cache hits

### Month 6: Polish & Growth
**Goal:** Refine and expand adoption

**Deliverables:**
- Enhanced monitoring dashboard
- Webhook notifications (avatar updates)
- Advanced API features (webhooks, filters)
- Marketing site and content
- Partnership outreach

**Success Criteria:**
- 50+ integrated DApps
- 100K+ daily API calls
- $1K+ MRR

---

## Competitive Advantages: Cloudflare Workers Approach

### vs. Traditional Server Architecture
✅ **No cold starts** - Workers stay warm at the edge  
✅ **Zero server management** - No DevOps overhead  
✅ **Infinite scale** - Automatic horizontal scaling  
✅ **Lower costs** - Pay per request, not per server  
✅ **Global by default** - No multi-region configuration  

### vs. Decentralized Storage (IPFS, Arweave)
✅ **10-100x faster** - Edge caching vs. P2P retrieval  
✅ **Higher reliability** - 99.9% uptime vs. variable node availability  
✅ **Better UX** - Instant loads vs. minutes of waiting  
✅ **Simpler integration** - Standard HTTP vs. IPFS gateways  
✅ **Cost effective** - Predictable pricing vs. storage tokens  

### vs. Competitors (Gravatar, Web3.bio)
✅ **Web3 Native** - Built for wallet addresses, not emails  
✅ **Multi-source** - Aggregates from multiple platforms  
✅ **Faster** - Edge computing vs. centralized servers  
✅ **Modern Stack** - Serverless vs. legacy infrastructure  
✅ **Developer First** - Simple API vs. complex integrations  

### Key Differentiators
1. **Speed is the feature** - Leveraging edge computing for performance
2. **Aggregation over storage** - Smart routing vs. another upload platform  
3. **Pragmatic Web3** - Using blockchain where it makes sense, not everywhere
4. **Zero config** - Works out of the box for developers
5. **Transparent costs** - Pay only for what you use, no surprises

---

## Pricing Strategy (Post-Launch)

### Free Tier
- 100K requests/month
- Basic rate limiting
- Community support
- Public documentation

### Pro Tier ($29/month)
- 1M requests/month
- Higher rate limits
- Email support
- Custom fallback URLs
- Usage analytics

### Enterprise (Custom)
- Unlimited requests
- Custom SLAs
- Priority support
- White-label options
- Dedicated account manager

**Key Principle:** Keep free tier generous to drive adoption, monetize high-volume users.

---

## Conclusion

Crypto Avatars v2 represents a **pragmatic, performance-first approach** to Web3 identity infrastructure. By leveraging Cloudflare Workers and modern serverless architecture, we deliver:

- **Speed:** Sub-100ms response times globally
- **Simplicity:** One API call replaces multiple integrations  
- **Reliability:** 99.9%+ uptime with zero infrastructure management
- **Scale:** Automatic scaling from 0 to millions of requests

This isn't about building the most decentralized solution—it's about building the **fastest and most reliable** solution that developers actually want to use.

**Next Step:** Ship Month 1 deliverables and validate with first 10 developer integrations.
