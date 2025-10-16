# Crypto Avatars

**Gravatar for Crypto** - A serverless, edge-optimized avatar service for blockchain wallet addresses

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020)](https://workers.cloudflare.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue)](https://www.typescriptlang.org/)]

---

## 🚀 Project Overview

Crypto Avatars is a **serverless avatar service** built on **Cloudflare Workers**, providing lightning-fast avatar delivery for blockchain wallet addresses across 300+ edge locations worldwide. Unlike traditional server-based solutions, Crypto Avatars leverages edge computing to deliver avatars with <50ms latency globally while eliminating infrastructure management overhead.

### Why Serverless/Edge?

**Traditional Approach Problems:**
- 🐌 High latency for global users (200-500ms+)
- 💰 Expensive server infrastructure ($100-500/month+)
- 🔧 Complex deployment and scaling
- 📊 Manual load balancing and CDN configuration
- 🔥 Single points of failure

**Cloudflare Workers Solution:**
- ⚡ **Ultra-low latency**: <50ms response times globally
- 💵 **Cost-effective**: Pay only for requests (~$0.15/million requests)
- 🌍 **Global edge network**: 300+ cities, automatic geographic distribution
- 📈 **Auto-scaling**: Handle 0 to millions of requests seamlessly
- 🛡️ **Built-in DDoS protection**: Enterprise-grade security included
- 🔒 **Zero cold starts**: V8 isolates start in <1ms
- ♻️ **Simplified ops**: No servers, no containers, no infrastructure management

### Architecture Benefits

```
Traditional Server:          Cloudflare Workers:
User → CDN → Server         User → Edge (Workers + KV + R2)
     ↓                            ↓
  300-500ms                     <50ms

Cost: $200+/month            Cost: $5-25/month (typical)
```

---

## ✨ Key Features

### Multi-Source Avatar Aggregation
- **ENS Avatars**: Automatic resolution from Ethereum Name Service
- **NFT Detection**: Display NFT-based avatars from user wallets
- **Custom Uploads**: User-uploaded avatars via SIWE authentication
- **Fallback Generation**: Beautiful deterministic avatars when none exist
- **Priority System**: Smart avatar selection from multiple sources

### Edge Performance
- **KV Storage**: Metadata cached at the edge with Workers KV
- **R2 Storage**: Avatar images stored in Cloudflare R2 (S3-compatible)
- **Intelligent Caching**: Multi-layer caching strategy (Browser → Edge → Origin)
- **Image Optimization**: Automatic format conversion and resizing
- **Stale-While-Revalidate**: Instant responses with background updates

### Security & Authentication
- **SIWE (Sign-In with Ethereum)**: Wallet-based authentication
- **Rate Limiting**: Per-wallet and per-IP protection
- **Signature Verification**: Cryptographic proof of wallet ownership
- **CORS Support**: Configurable cross-origin access
- **DDoS Protection**: Built-in Cloudflare security

### Developer Experience
- **Simple API**: RESTful endpoints with predictable responses
- **TypeScript**: Full type safety and IntelliSense support
- **Local Development**: Miniflare for local testing
- **Hot Reload**: Instant updates during development
- **Comprehensive Docs**: OpenAPI/Swagger documentation

---

## 📦 Prerequisites

### Required
- **Node.js**: v18.0.0 or higher ([Download](https://nodejs.org/))
- **npm**: v9.0.0 or higher
- **Wrangler CLI**: Cloudflare Workers CLI tool
  ```bash
  npm install -g wrangler
  ```
- **Cloudflare Account**: Free tier available ([Sign up](https://dash.cloudflare.com/sign-up))

### API Keys
- **Alchemy/Infura**: For ENS and blockchain data (free tier available)
- **Cloudflare Account ID**: From your Cloudflare dashboard
- **Cloudflare API Token**: With Workers and R2 permissions

---

## 🚀 Quick Start with Wrangler

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/ckorhonen/crypto-avatars.git
cd crypto-avatars

# Install dependencies
npm install

# Login to Cloudflare
wrangler login
```

### 2. Configure Environment

```bash
# Copy the example configuration
cp wrangler.example.toml wrangler.toml

# Edit with your Cloudflare account details
nano wrangler.toml
```

**Minimum `wrangler.toml` configuration:**
```toml
name = "crypto-avatars"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
account_id = "your-account-id"
workers_dev = false
route = "avatars.yourdomain.com/*"

# KV Namespaces (for metadata caching)
kv_namespaces = [
  { binding = "AVATARS_KV", id = "your-kv-id" }
]

# R2 Buckets (for image storage)
r2_buckets = [
  { binding = "AVATARS_R2", bucket_name = "crypto-avatars" }
]

# Environment variables
[env.production.vars]
ENVIRONMENT = "production"
ETHEREUM_RPC_URL = "https://eth-mainnet.g.alchemy.com/v2/YOUR-KEY"
```

### 3. Set Secrets

```bash
# Set sensitive configuration as secrets
wrangler secret put JWT_SECRET
wrangler secret put ALCHEMY_API_KEY
wrangler secret put SIWE_SESSION_SECRET
```

### 4. Create Resources

```bash
# Create KV namespace for metadata
wrangler kv:namespace create "AVATARS_KV"

# Create R2 bucket for images
wrangler r2 bucket create crypto-avatars

# Update wrangler.toml with the generated IDs
```

### 5. Local Development

```bash
# Start local development server with hot reload
npm run dev

# Or use Wrangler directly
wrangler dev

# Test the local endpoint
curl http://localhost:8787/health
```

### 6. Deploy to Cloudflare

```bash
# Deploy to production
npm run deploy

# Or use Wrangler directly
wrangler deploy

# Your worker will be available at:
# https://crypto-avatars.your-subdomain.workers.dev
```

---

(Content continues with full main branch README...)