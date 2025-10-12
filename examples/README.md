# Integration Examples

This directory contains examples of how to integrate the Crypto Avatars API into your application.

## Files

- **`client-integration.ts`**: Complete TypeScript examples for browser/Node.js clients

## Quick Start Examples

### 1. Simple Avatar Fetch

```typescript
const response = await fetch(
  'https://crypto-avatars.workers.dev/avatar/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
);
// Redirects to avatar image URL
```

### 2. Get Avatar Metadata (JSON)

```typescript
const response = await fetch(
  'https://crypto-avatars.workers.dev/avatar/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  { headers: { 'Accept': 'application/json' } }
);
const data = await response.json();
console.log(data);
// {
//   avatar_url: 'https://...',
//   source: 'ens',
//   cached_at: 1234567890,
//   expires_at: 1234654290
// }
```

### 3. Batch Resolution

```typescript
const response = await fetch(
  'https://crypto-avatars.workers.dev/avatar/batch',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      addresses: [
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        '0x1234567890123456789012345678901234567890',
      ],
    }),
  }
);
const avatars = await response.json();
```

### 4. SIWE Authentication

```typescript
import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

// 1. Get challenge
const challengeRes = await fetch(
  'https://crypto-avatars.workers.dev/auth/challenge',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: '0x...' }),
  }
);
const { message, nonce } = await challengeRes.json();

// 2. Sign with wallet
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const signature = await signer.signMessage(message);

// 3. Verify and get session
const verifyRes = await fetch(
  'https://crypto-avatars.workers.dev/auth/verify',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, signature }),
  }
);
const { token } = await verifyRes.json();

// 4. Use token for authenticated requests
const userRes = await fetch(
  'https://crypto-avatars.workers.dev/auth/me',
  {
    headers: { Authorization: `Bearer ${token}` },
  }
);
```

## React Integration

See `client-integration.ts` for React hooks:

- `useAvatar(address)` - Fetch avatar for an address
- `useSIWEAuth()` - Handle SIWE authentication

## Framework-Specific Examples

### Next.js

```typescript
// app/avatar/[address]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  const response = await fetch(
    `https://crypto-avatars.workers.dev/avatar/${params.address}`
  );
  return response;
}
```

### SvelteKit

```typescript
// routes/avatar/[address]/+server.ts
export async function GET({ params }) {
  const response = await fetch(
    `https://crypto-avatars.workers.dev/avatar/${params.address}`
  );
  return response;
}
```

### Express.js

```typescript
app.get('/avatar/:address', async (req, res) => {
  const response = await fetch(
    `https://crypto-avatars.workers.dev/avatar/${req.params.address}`
  );
  
  if (response.status === 302) {
    return res.redirect(response.headers.get('Location'));
  }
  
  res.json(await response.json());
});
```

## HTML/Vanilla JS

```html
<!DOCTYPE html>
<html>
<head>
  <title>Crypto Avatar Demo</title>
</head>
<body>
  <input id="address" placeholder="Enter Ethereum address" />
  <button onclick="loadAvatar()">Load Avatar</button>
  <img id="avatar" style="display: none; width: 200px; height: 200px;" />

  <script>
    async function loadAvatar() {
      const address = document.getElementById('address').value;
      const img = document.getElementById('avatar');
      
      try {
        const response = await fetch(
          `https://crypto-avatars.workers.dev/avatar/${address}`,
          { 
            redirect: 'manual',
            headers: { 'Accept': 'application/json' }
          }
        );
        
        const data = await response.json();
        img.src = data.avatar_url;
        img.style.display = 'block';
      } catch (error) {
        alert('Failed to load avatar: ' + error.message);
      }
    }
  </script>
</body>
</html>
```

## Testing

Test the examples:

```bash
# Install dependencies
npm install ethers siwe

# Run tests
ts-node examples/client-integration.ts
```

## Error Handling

Always handle errors appropriately:

```typescript
try {
  const avatar = await getAvatarMetadata(address);
  console.log(avatar);
} catch (error) {
  if (error.message.includes('Invalid address')) {
    // Handle invalid address
  } else if (error.message.includes('not found')) {
    // Use default avatar
  } else {
    // Handle other errors
  }
}
```

## Rate Limiting

Respect rate limits:

- Anonymous: 100 requests/hour
- Authenticated: 1,000 requests/hour

Implement client-side caching to reduce API calls:

```typescript
const avatarCache = new Map<string, CacheEntry>();

async function getCachedAvatar(address: string) {
  // Check local cache first
  const cached = avatarCache.get(address);
  if (cached && Date.now() < cached.expires_at) {
    return cached;
  }
  
  // Fetch from API
  const avatar = await getAvatarMetadata(address);
  avatarCache.set(address, avatar);
  return avatar;
}
```

## Support

For more examples and support:
- GitHub Issues: https://github.com/ckorhonen/crypto-avatars/issues
- Documentation: [README.md](../README.md)