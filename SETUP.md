# Setup Guide

Complete setup instructions for deploying Crypto Avatars on Cloudflare Workers.

## Prerequisites

1. **Cloudflare Account**: Sign up at https://dash.cloudflare.com/sign-up
2. **Workers Plan**: Free tier is sufficient to start
3. **Node.js**: Version 18 or higher
4. **Wrangler CLI**: Install globally with `npm install -g wrangler`

## Step-by-Step Setup

### 1. Clone and Install

```bash
git clone https://github.com/ckorhonen/crypto-avatars.git
cd crypto-avatars
npm install
```

### 2. Authenticate with Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate with your Cloudflare account.

### 3. Create KV Namespaces

Create all required KV namespaces:

```bash
# Production namespaces
wrangler kv:namespace create "AVATAR_CACHE"
wrangler kv:namespace create "SESSION_CACHE"
wrangler kv:namespace create "NONCE_CACHE"
wrangler kv:namespace create "RATE_LIMIT_CACHE"

# Preview namespaces (for local development)
wrangler kv:namespace create "AVATAR_CACHE" --preview
wrangler kv:namespace create "SESSION_CACHE" --preview
wrangler kv:namespace create "NONCE_CACHE" --preview
wrangler kv:namespace create "RATE_LIMIT_CACHE" --preview
```

Each command will output a namespace ID. Save these IDs.

### 4. Update wrangler.toml

Open `wrangler.toml` and replace the placeholder IDs:

```toml
[[kv_namespaces]]
binding = "AVATAR_CACHE"
id = "your-avatar-kv-namespace-id"              # Replace this
preview_id = "your-avatar-preview-kv-namespace-id"  # Replace this

[[kv_namespaces]]
binding = "SESSION_CACHE"
id = "your-session-kv-namespace-id"             # Replace this
preview_id = "your-session-preview-kv-namespace-id" # Replace this

# ... repeat for NONCE_CACHE and RATE_LIMIT_CACHE
```

### 5. Get API Keys

#### Alchemy (Required for ENS)

1. Sign up at https://www.alchemy.com/
2. Create a new app
3. Select "Ethereum" and "Mainnet"
4. Copy your API key

#### OpenSea (Required for NFT Avatars)

1. Sign up at https://opensea.io/
2. Go to https://docs.opensea.io/reference/api-keys
3. Request an API key
4. Copy your API key

#### Lens Protocol (Optional)

- Default endpoint: `https://api-v2.lens.dev`
- No API key required

### 6. Set Secrets

For local development, create `.dev.vars`:

```bash
cp .env.example .dev.vars
# Edit .dev.vars and add your API keys
```

For production deployment:

```bash
wrangler secret put ALCHEMY_API_KEY
# Enter your Alchemy API key when prompted

wrangler secret put OPENSEA_API_KEY
# Enter your OpenSea API key when prompted

wrangler secret put LENS_API_ENDPOINT
# Enter: https://api-v2.lens.dev
```

### 7. Test Locally

```bash
npm run dev
```

The worker will be available at http://localhost:8787

Test the health endpoint:

```bash
curl http://localhost:8787/health
```

### 8. Deploy to Production

```bash
npm run deploy:production
```

Your worker will be deployed to `https://crypto-avatars.workers.dev`

### 9. Set Up GitHub Actions (Optional)

For automated deployments:

1. Go to your repository settings on GitHub
2. Navigate to Secrets and Variables > Actions
3. Add the following secrets:
   - `CLOUDFLARE_API_TOKEN`: Create at https://dash.cloudflare.com/profile/api-tokens
     - Use the "Edit Cloudflare Workers" template
   - `CLOUDFLARE_ACCOUNT_ID`: Find in Cloudflare dashboard URL or Workers overview

## Verification

### Test Avatar Resolution

```bash
# Test with Vitalik's address
curl https://crypto-avatars.workers.dev/avatar/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

### Test Authentication Flow

```bash
# 1. Generate challenge
curl -X POST https://crypto-avatars.workers.dev/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"address":"0x1234567890123456789012345678901234567890"}'

# 2. Sign the message with your wallet (use ethers.js or similar)
# 3. Verify signature
curl -X POST https://crypto-avatars.workers.dev/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"message":"...","signature":"0x..."}'
```

### Test Batch Resolution

```bash
curl -X POST https://crypto-avatars.workers.dev/avatar/batch \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": [
      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      "0x1234567890123456789012345678901234567890"
    ]
  }'
```

## Troubleshooting

### Issue: "Error: No namespace with ID found"

**Solution**: Double-check that your KV namespace IDs in `wrangler.toml` match the IDs from step 3.

### Issue: "Error: Unknown binding ALCHEMY_API_KEY"

**Solution**: Make sure you've set all required secrets using `wrangler secret put`.

### Issue: "Error: 401 Unauthorized"

**Solution**: Your Cloudflare API token may be invalid. Run `wrangler login` again.

### Issue: Local development not working

**Solution**: 
1. Make sure `.dev.vars` file exists with all required secrets
2. Check that preview KV namespace IDs are set in `wrangler.toml`
3. Try `wrangler dev --local` to use local mode

## Monitoring

### View Logs

```bash
# Production logs
npm run tail

# Staging logs
npm run tail:staging

# Filter logs
wrangler tail --status error
```

### Check Analytics

1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Click on your worker
4. View metrics: requests, errors, CPU time, etc.

## Cost Estimation

### Cloudflare Workers Free Tier

- 100,000 requests/day
- 10ms CPU time per request
- Unlimited KV reads (1M writes/day)

### Paid Plan ($5/month)

- 10M requests/month included
- $0.50 per additional million
- Unlimited KV operations

## Next Steps

1. **Custom Domain**: Add a custom domain in Cloudflare Dashboard
2. **Analytics**: Set up Cloudflare Analytics Engine for detailed metrics
3. **Rate Limiting**: Adjust rate limits in `src/config.ts`
4. **Caching**: Fine-tune cache durations based on usage patterns
5. **Monitoring**: Set up alerts for errors and performance issues

## Support

For issues:
- Check [GitHub Issues](https://github.com/ckorhonen/crypto-avatars/issues)
- Review [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- Review [Technical Design](TECHNICAL_DESIGN.md)

## Security Checklist

- [ ] API keys stored as secrets (not in code)
- [ ] KV namespace IDs updated in wrangler.toml
- [ ] GitHub Actions secrets configured
- [ ] Rate limiting configured appropriately
- [ ] CORS headers reviewed for your use case
- [ ] Production secrets set via `wrangler secret put`
- [ ] Never commit `.dev.vars` to Git