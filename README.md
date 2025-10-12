# Crypto Avatars - Cloudflare Workers Edition

A high-performance, serverless crypto avatar resolution service built on Cloudflare Workers. Resolves Web3 avatars from multiple sources with intelligent caching and SIWE authentication.

## Features

- 🚀 **Serverless Architecture**: Deployed on Cloudflare's global edge network
- 🔍 **Multi-Source Resolution**: ENS, OpenSea, Lens Protocol with waterfall fallback
- ⚡ **Lightning Fast**: KV caching + CDN edge caching
- 🔐 **Secure Authentication**: Sign-In with Ethereum (SIWE) integration
- 🌍 **Global CDN**: Sub-100ms response times worldwide
- 📦 **Batch Operations**: Resolve multiple avatars in a single request
- 🛡️ **Rate Limiting**: Built-in protection with KV-based rate limiting

## Architecture

```
Client Request
    ↓
Cloudflare Edge (CDN Cache)
    ↓
Worker (Avatar Resolution)
    ↓
KV Cache Check
    ↓
Waterfall Resolution:
  1. ENS (Ethereum Name Service)
  2. OpenSea (NFT Avatar)
  3. Lens Protocol
  4. Default Avatar Generator
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Cloudflare account with Workers plan
- Wrangler CLI installed globally: `npm install -g wrangler`

### Installation

```bash
# Clone the repository
git clone https://github.com/ckorhonen/crypto-avatars.git
cd crypto-avatars

# Install dependencies
npm install

# Authenticate with Cloudflare
wrangler login
```

### Configuration

1. **Create KV Namespaces**:

```bash
# Create all required KV namespaces
npm run kv:create
```

2. **Update `wrangler.toml`**:

Replace the placeholder KV namespace IDs with your actual IDs from the previous step.

3. **Set up Secrets**:

```bash
# Set required API keys
wrangler secret put ALCHEMY_API_KEY
wrangler secret put OPENSEA_API_KEY
wrangler secret put LENS_API_ENDPOINT
```

### Development

```bash
# Start local development server
npm run dev

# The worker will be available at http://localhost:8787
```

### Deployment

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

## API Documentation

### Avatar Resolution

#### Get Avatar

```http
GET /avatar/:address
```

**Response**: Redirects to avatar image URL or returns JSON with avatar data.

**Query Parameters**:
- `format=json` - Return JSON instead of redirect

**Example**:
```bash
curl https://crypto-avatars.workers.dev/avatar/0x1234...5678
```

#### Batch Avatar Resolution

```http
POST /avatar/batch
Content-Type: application/json

{
  "addresses": [
    "0x1234...5678",
    "0xabcd...ef01"
  ]
}
```

**Response**:
```json
{
  "0x1234...5678": {
    "avatar_url": "https://...",
    "source": "ens",
    "cached_at": 1234567890,
    "expires_at": 1234654290
  },
  "0xabcd...ef01": {
    "avatar_url": "https://...",
    "source": "lens",
    "cached_at": 1234567890,
    "expires_at": 1234654290
  }
}
```

### Authentication (SIWE)

#### Generate Challenge

```http
POST /auth/challenge
Content-Type: application/json

{
  "address": "0x1234...5678"
}
```

**Response**:
```json
{
  "nonce": "uuid-v4",
  "message": "crypto-avatars.workers.dev wants you to sign in..."
}
```

#### Verify Signature

```http
POST /auth/verify
Content-Type: application/json

{
  "message": "...",
  "signature": "0x..."
}
```

**Response**:
```json
{
  "token": "session-token",
  "address": "0x1234...5678",
  "expiresAt": 1234567890
}
```

#### Get Current User

```http
GET /auth/me
Authorization: Bearer <token>
```

**Response**:
```json
{
  "address": "0x1234...5678",
  "chainId": 1,
  "authenticated_at": 1234567890,
  "expires_at": 1234654290
}
```

#### Logout

```http
POST /auth/logout
Authorization: Bearer <token>
```

### Health Check

```http
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "environment": "production",
  "version": "2.0.0",
  "checks": {
    "kv": "ok"
  }
}
```

## Project Structure

```
.
├── src/
│   ├── index.ts                 # Main worker entry point
│   ├── config.ts                # Configuration constants
│   ├── types.ts                 # TypeScript type definitions
│   ├── handlers/
│   │   ├── avatar.ts           # Avatar resolution handlers
│   │   └── auth.ts             # SIWE authentication handlers
│   ├── services/
│   │   ├── avatarSources.ts    # ENS, OpenSea, Lens integrations
│   │   └── cache.ts            # KV caching service
│   └── utils/
│       └── validation.ts        # Request validation & security
├── wrangler.toml                # Cloudflare Workers config
├── package.json                 # Dependencies & scripts
└── tsconfig.json               # TypeScript configuration
```

## Caching Strategy

### Cache Layers

1. **KV Cache** (24 hours for hits, 6 hours for misses)
2. **CDN Edge Cache** (1-2 hours)
3. **Browser Cache** (1 hour)

### Cache Keys

- `avatar:{address}` - Resolved avatar data
- `session:{token}` - User sessions (7 days)
- `nonce:{nonce}` - SIWE nonces (10 minutes)
- `rate:{ip}:{window}` - Rate limiting (1 hour)

## Rate Limiting

- **Anonymous**: 100 requests/hour
- **Authenticated**: 1,000 requests/hour
- **Premium**: 10,000 requests/hour

## Avatar Resolution Waterfall

1. **Check KV Cache**: Return cached avatar if available and not expired
2. **ENS Resolution**: Query Ethereum Name Service for avatar
3. **OpenSea**: Fetch first NFT owned by address
4. **Lens Protocol**: Query Lens social graph for profile picture
5. **Default Avatar**: Generate identicon if no avatar found

## Environment Variables

### Public Variables (wrangler.toml)

- `ENVIRONMENT` - Deployment environment (production/staging)
- `DEFAULT_AVATAR_BASE_URL` - Default avatar generator URL
- `MAX_AVATAR_SIZE` - Maximum avatar size in bytes

### Secrets (via `wrangler secret put`)

- `ALCHEMY_API_KEY` - For ENS resolution
- `OPENSEA_API_KEY` - For NFT avatar lookups
- `LENS_API_ENDPOINT` - Lens Protocol API URL
- `FARCASTER_API_KEY` - Farcaster integration (optional)

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type checking
npm run type-check
```

## Monitoring & Debugging

```bash
# View real-time logs
npm run tail

# View staging logs
npm run tail:staging
```

## Performance

- **Cold start**: < 50ms
- **Cached response**: < 10ms
- **Full resolution**: 100-500ms (depending on source)
- **Global availability**: 330+ edge locations

## Security

- ✅ CORS headers configured
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ Input validation on all endpoints
- ✅ Rate limiting per IP/user
- ✅ SIWE cryptographic authentication
- ✅ No secrets in code (environment variables)

## Deployment Pipeline

GitHub Actions automatically:
- Runs type checks and tests on PRs
- Deploys to staging on PR creation
- Deploys to production on merge to main

### Required GitHub Secrets

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Workers permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License - see LICENSE file for details

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/ckorhonen/crypto-avatars/issues
- Documentation: [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md)

## Roadmap

- [ ] Farcaster avatar integration
- [ ] XMTP avatar support
- [ ] Image resizing/optimization
- [ ] Analytics dashboard
- [ ] Premium tier with higher rate limits
- [ ] WebSocket support for real-time updates
- [ ] Multi-chain support (Polygon, BSC, etc.)

---

Built with ❤️ using Cloudflare Workers