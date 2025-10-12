/**
 * Avatar Source Integrations
 * 
 * Implements avatar resolution from multiple Web3 sources:
 * - ENS (Ethereum Name Service)
 * - OpenSea (NFT marketplace)
 * - Lens Protocol (decentralized social graph)
 */

import { ethers } from 'ethers';
import { Env } from '../types';

/**
 * Resolve avatar from ENS
 */
export async function resolveFromENS(
  address: string,
  env: Env
): Promise<string | null> {
  try {
    // Use Alchemy provider for ENS resolution
    const alchemyKey = env.ALCHEMY_API_KEY;
    if (!alchemyKey) {
      console.warn('ALCHEMY_API_KEY not configured');
      return null;
    }

    const provider = new ethers.JsonRpcProvider(
      `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
    );

    // Reverse resolve address to ENS name
    const ensName = await provider.lookupAddress(address);
    if (!ensName) {
      return null;
    }

    // Get avatar from ENS name
    const resolver = await provider.getResolver(ensName);
    if (!resolver) {
      return null;
    }

    const avatar = await resolver.getAvatar();
    
    // Avatar can be an IPFS URL, HTTP URL, or NFT
    if (avatar) {
      // Convert IPFS URLs to HTTP gateway
      if (avatar.url.startsWith('ipfs://')) {
        return avatar.url.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }
      return avatar.url;
    }

    return null;
  } catch (error) {
    console.error('ENS resolution error:', error);
    return null;
  }
}

/**
 * Resolve avatar from OpenSea (first NFT owned)
 */
export async function resolveFromOpenSea(
  address: string,
  env: Env
): Promise<string | null> {
  try {
    const apiKey = env.OPENSEA_API_KEY;
    if (!apiKey) {
      console.warn('OPENSEA_API_KEY not configured');
      return null;
    }

    // Fetch user's NFTs from OpenSea API
    const response = await fetch(
      `https://api.opensea.io/api/v2/chain/ethereum/account/${address}/nfts?limit=1`,
      {
        headers: {
          'X-API-KEY': apiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn('OpenSea API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    // Return first NFT image if available
    if (data.nfts && data.nfts.length > 0) {
      const nft = data.nfts[0];
      return nft.image_url || nft.metadata?.image || null;
    }

    return null;
  } catch (error) {
    console.error('OpenSea resolution error:', error);
    return null;
  }
}

/**
 * Resolve avatar from Lens Protocol
 */
export async function resolveFromLens(
  address: string,
  env: Env
): Promise<string | null> {
  try {
    const lensEndpoint = env.LENS_API_ENDPOINT || 'https://api-v2.lens.dev';

    // Query Lens Protocol for profile
    const query = `
      query DefaultProfile($request: DefaultProfileRequest!) {
        defaultProfile(request: $request) {
          id
          handle
          picture {
            ... on MediaSet {
              original {
                url
              }
            }
            ... on NftImage {
              uri
            }
          }
        }
      }
    `;

    const response = await fetch(lensEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          request: {
            for: address,
          },
        },
      }),
    });

    if (!response.ok) {
      console.warn('Lens API error:', response.status);
      return null;
    }

    const data = await response.json();
    const profile = data.data?.defaultProfile;

    if (profile?.picture) {
      // Handle MediaSet picture
      if (profile.picture.original?.url) {
        const url = profile.picture.original.url;
        // Convert IPFS URLs to HTTP gateway
        if (url.startsWith('ipfs://')) {
          return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }
        return url;
      }
      
      // Handle NFT picture
      if (profile.picture.uri) {
        const uri = profile.picture.uri;
        if (uri.startsWith('ipfs://')) {
          return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }
        return uri;
      }
    }

    return null;
  } catch (error) {
    console.error('Lens resolution error:', error);
    return null;
  }
}