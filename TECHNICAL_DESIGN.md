# Crypto Avatars - Technical Design Document

## Table of Contents
1. [System Architecture](#system-architecture)
2. [API Design](#api-design)
3. [Database Design](#database-design)
4. [Blockchain Integration](#blockchain-integration)
5. [Storage Architecture](#storage-architecture)
6. [Security Design](#security-design)
7. [Scalability & Performance](#scalability--performance)
8. [Development Guidelines](#development-guidelines)

## System Architecture

### High-Level System Overview

The Crypto Avatars platform is designed as a distributed, microservices-based system that enables users to create, manage, and showcase blockchain-verified avatar NFTs across multiple networks.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile Client  │    │   Admin Panel   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │      API Gateway          │
                    │   (Kong/AWS API Gateway)  │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼───────┐    ┌────────────▼────────────┐    ┌───────▼───────┐
│  Auth Service │    │    Avatar Service       │    │  Wallet Service│
│   (Node.js)   │    │     (Node.js)          │    │   (Node.js)    │
└───────────────┘    └─────────────────────────┘    └───────────────┘
        │                         │                         │
        │            ┌────────────▼────────────┐            │
        │            │   Image Processing      │            │
        │            │     Service (Python)    │            │
        │            └─────────────────────────┘            │
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │     Message Queue         │
                    │      (Redis/RabbitMQ)     │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼───────┐    ┌────────────▼────────────┐    ┌───────▼───────┐
│   PostgreSQL  │    │        IPFS Node        │    │     Redis     │
│   (Primary)   │    │    (Decentralized)      │    │    (Cache)    │
└───────────────┘    └─────────────────────────┘    └───────────────┘
```

### Microservices Architecture Breakdown

#### 1. API Gateway
- **Technology**: Kong or AWS API Gateway
- **Responsibilities**:
  - Request routing and load balancing
  - Rate limiting and throttling
  - API versioning
  - Request/response transformation
  - Authentication token validation

#### 2. Authentication Service
- **Technology**: Node.js with Express
- **Responsibilities**:
  - User registration and login
  - JWT token generation and validation
  - Wallet signature verification
  - Session management
  - OAuth integration (Google, Discord, Twitter)

#### 3. Avatar Service
- **Technology**: Node.js with Express
- **Responsibilities**:
  - Avatar CRUD operations
  - Metadata management
  - Collection management
  - Search and filtering
  - Avatar generation workflows

#### 4. Wallet Service
- **Technology**: Node.js with Express
- **Responsibilities**:
  - Multi-chain wallet verification
  - NFT ownership validation
  - Blockchain transaction monitoring
  - Gas estimation and optimization

#### 5. Image Processing Service
- **Technology**: Python with FastAPI
- **Responsibilities**:
  - Image upload and validation
  - Format conversion and optimization
  - Thumbnail generation
  - AI-powered avatar generation
  - Content moderation

### Data Flow Diagrams

#### Avatar Creation Flow
```
User → Web Client → API Gateway → Auth Service (validate) → Avatar Service → Image Processing Service → IPFS → Database → Response
```

#### Wallet Verification Flow
```
User → Connect Wallet → Wallet Service → Blockchain RPC → Signature Verification → Database Update → Response
```

### Infrastructure Requirements

#### Production Environment
- **Container Orchestration**: Kubernetes (EKS/GKE)
- **Load Balancer**: AWS ALB/GCP Load Balancer
- **CDN**: CloudFlare or AWS CloudFront
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **CI/CD**: GitHub Actions or GitLab CI

#### Development Environment
- **Container Runtime**: Docker + Docker Compose
- **Local Development**: Minikube or Kind
- **Testing**: Jest (Node.js), Pytest (Python)

## API Design

### RESTful API Endpoints

#### Authentication Endpoints
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
POST   /api/v1/auth/wallet/connect
POST   /api/v1/auth/wallet/verify
```

#### Avatar Endpoints
```
GET    /api/v1/avatars                    # List avatars with pagination
POST   /api/v1/avatars                    # Create new avatar
GET    /api/v1/avatars/:id                # Get avatar by ID
PUT    /api/v1/avatars/:id                # Update avatar
DELETE /api/v1/avatars/:id                # Delete avatar
GET    /api/v1/avatars/:id/metadata       # Get avatar metadata
POST   /api/v1/avatars/:id/generate       # Generate avatar variations
GET    /api/v1/avatars/search             # Search avatars
```

#### Collection Endpoints
```
GET    /api/v1/collections               # List collections
POST   /api/v1/collections               # Create collection
GET    /api/v1/collections/:id           # Get collection
PUT    /api/v1/collections/:id           # Update collection
DELETE /api/v1/collections/:id           # Delete collection
GET    /api/v1/collections/:id/avatars   # Get avatars in collection
```

#### User Endpoints
```
GET    /api/v1/users/:id                 # Get user profile
PUT    /api/v1/users/:id                 # Update user profile
GET    /api/v1/users/:id/avatars         # Get user's avatars
GET    /api/v1/users/:id/collections     # Get user's collections
```

### API Specifications

#### Avatar Creation Request
```json
{
  "name": "string",
  "description": "string",
  "image": "file or base64",
  "traits": {
    "background": "string",
    "skin": "string",
    "hair": "string",
    "eyes": "string",
    "accessories": ["string"]
  },
  "collection_id": "uuid",
  "blockchain": "ethereum|polygon|solana",
  "is_public": "boolean"
}
```

#### Avatar Response
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "image_url": "string",
  "thumbnail_url": "string",
  "ipfs_hash": "string",
  "traits": "object",
  "owner_id": "uuid",
  "collection_id": "uuid",
  "blockchain": "string",
  "token_id": "string",
  "contract_address": "string",
  "is_public": "boolean",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Authentication & Authorization Flows

#### JWT Token Structure
```json
{
  "sub": "user_id",
  "wallet_address": "0x...",
  "verified_wallets": ["0x...", "0x..."],
  "roles": ["user", "creator", "admin"],
  "exp": 1234567890,
  "iat": 1234567890
}
```

#### Authorization Middleware
```javascript
const authorize = (roles = []) => {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (roles.length && !roles.some(role => decoded.roles.includes(role))) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    req.user = decoded;
    next();
  };
};
```

### Rate Limiting and Caching Strategies

#### Rate Limiting Rules
```yaml
rate_limits:
  default: 100/hour
  authenticated: 1000/hour
  premium: 5000/hour
  
endpoints:
  /api/v1/avatars:
    POST: 10/hour
    GET: 1000/hour
  /api/v1/auth/login:
    POST: 5/minute
```

#### Caching Strategy
- **Redis Cache**: User sessions, frequently accessed avatars
- **CDN Cache**: Static images, thumbnails (24h TTL)
- **Database Query Cache**: Search results (5min TTL)

## Database Design

### Data Models and Relationships

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Wallets Table
```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    address VARCHAR(100) NOT NULL,
    blockchain VARCHAR(20) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_signature TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(address, blockchain)
);
```

#### Collections Table
```sql
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    blockchain VARCHAR(20) NOT NULL,
    contract_address VARCHAR(100),
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Avatars Table
```sql
CREATE TABLE avatars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    ipfs_hash VARCHAR(100),
    traits JSONB,
    blockchain VARCHAR(20) NOT NULL,
    token_id VARCHAR(100),
    contract_address VARCHAR(100),
    is_public BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Avatar Likes Table
```sql
CREATE TABLE avatar_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    avatar_id UUID REFERENCES avatars(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, avatar_id)
);
```

### Indexing Strategies

```sql
-- Performance indexes
CREATE INDEX idx_avatars_owner_id ON avatars(owner_id);
CREATE INDEX idx_avatars_collection_id ON avatars(collection_id);
CREATE INDEX idx_avatars_blockchain ON avatars(blockchain);
CREATE INDEX idx_avatars_public ON avatars(is_public) WHERE is_public = true;
CREATE INDEX idx_avatars_created_at ON avatars(created_at DESC);

-- Search indexes
CREATE INDEX idx_avatars_name_trgm ON avatars USING gin(name gin_trgm_ops);
CREATE INDEX idx_avatars_traits ON avatars USING gin(traits);

-- Wallet indexes
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_address ON wallets(address);
CREATE INDEX idx_wallets_blockchain ON wallets(blockchain);
```

### Data Retention Policies

```sql
-- Archive old avatar views after 1 year
CREATE TABLE avatar_views_archive AS SELECT * FROM avatar_views WHERE created_at < NOW() - INTERVAL '1 year';

-- Delete unverified users after 30 days
DELETE FROM users WHERE is_verified = false AND created_at < NOW() - INTERVAL '30 days';

-- Archive deleted avatars for 90 days before permanent deletion
CREATE TABLE deleted_avatars AS SELECT *, NOW() as deleted_at FROM avatars WHERE deleted = true;
```

## Blockchain Integration

### Multi-Chain Support Architecture

#### Supported Blockchains
```javascript
const BLOCKCHAIN_CONFIG = {
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL,
    chainId: 1,
    nativeCurrency: 'ETH',
    blockExplorer: 'https://etherscan.io'
  },
  polygon: {
    rpcUrl: process.env.POLYGON_RPC_URL,
    chainId: 137,
    nativeCurrency: 'MATIC',
    blockExplorer: 'https://polygonscan.com'
  },
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL,
    cluster: 'mainnet-beta',
    nativeCurrency: 'SOL',
    blockExplorer: 'https://explorer.solana.com'
  }
};
```

#### Blockchain Service Interface
```javascript
class BlockchainService {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.provider = this.initializeProvider();
  }

  async verifyWalletOwnership(address, signature, message) {
    // Implementation varies by blockchain
  }

  async getNFTsByOwner(address) {
    // Fetch NFTs owned by address
  }

  async getTokenMetadata(contractAddress, tokenId) {
    // Fetch NFT metadata
  }

  async estimateGas(transaction) {
    // Estimate transaction gas costs
  }
}
```

### Wallet Verification Process

#### Ethereum/Polygon Verification
```javascript
const verifyEthereumSignature = async (address, signature, message) => {
  try {
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    return false;
  }
};
```

#### Solana Verification
```javascript
const verifySolanaSignature = async (publicKey, signature, message) => {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = new PublicKey(publicKey).toBytes();
    
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    return false;
  }
};
```

### Smart Contract Requirements

#### Avatar NFT Contract (ERC-721)
```solidity
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CryptoAvatars is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    mapping(uint256 => string) private _tokenIPFSHashes;
    
    constructor() ERC721("CryptoAvatars", "CAVATAR") {}
    
    function mintAvatar(address to, string memory ipfsHash) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _mint(to, tokenId);
        _setTokenURI(tokenId, string(abi.encodePacked("ipfs://", ipfsHash)));
        _tokenIPFSHashes[tokenId] = ipfsHash;
        
        return tokenId;
    }
    
    function getIPFSHash(uint256 tokenId) public view returns (string memory) {
        return _tokenIPFSHashes[tokenId];
    }
}
```

### Gas Optimization Strategies

#### Batch Operations
```javascript
const batchMintAvatars = async (recipients, ipfsHashes) => {
  const contract = new ethers.Contract(contractAddress, abi, signer);
  
  // Use multicall for batch operations
  const calls = recipients.map((recipient, index) => 
    contract.interface.encodeFunctionData('mintAvatar', [recipient, ipfsHashes[index]])
  );
  
  return await contract.multicall(calls);
};
```

#### Gas Price Optimization
```javascript
const getOptimalGasPrice = async (blockchain) => {
  const gasStation = new GasStation(blockchain);
  const prices = await gasStation.getGasPrices();
  
  return {
    slow: prices.safeLow,
    standard: prices.standard,
    fast: prices.fast
  };
};
```

## Storage Architecture

### IPFS Integration

#### IPFS Node Configuration
```javascript
const IPFS = require('ipfs-core');

const ipfsNode = await IPFS.create({
  repo: './ipfs-repo',
  config: {
    Addresses: {
      Swarm: ['/ip4/0.0.0.0/tcp/4001'],
      API: '/ip4/127.0.0.1/tcp/5001',
      Gateway: '/ip4/127.0.0.1/tcp/8080'
    },
    Bootstrap: [
      '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
      '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
    ]
  }
});
```

#### Image Upload to IPFS
```javascript
const uploadToIPFS = async (imageBuffer, metadata) => {
  try {
    // Upload image
    const imageResult = await ipfsNode.add(imageBuffer);
    const imageHash = imageResult.cid.toString();
    
    // Create and upload metadata
    const metadataObj = {
      name: metadata.name,
      description: metadata.description,
      image: `ipfs://${imageHash}`,
      attributes: metadata.traits
    };
    
    const metadataResult = await ipfsNode.add(JSON.stringify(metadataObj));
    const metadataHash = metadataResult.cid.toString();
    
    return {
      imageHash,
      metadataHash,
      imageUrl: `https://gateway.pinata.cloud/ipfs/${imageHash}`,
      metadataUrl: `https://gateway.pinata.cloud/ipfs/${metadataHash}`
    };
  } catch (error) {
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
};
```

### CDN Strategy for Performance

#### CloudFlare Configuration
```javascript
const CDN_CONFIG = {
  zones: {
    images: 'crypto-avatars-images.com',
    api: 'api.crypto-avatars.com'
  },
  caching: {
    images: {
      ttl: 86400, // 24 hours
      browserTtl: 3600 // 1 hour
    },
    thumbnails: {
      ttl: 604800, // 7 days
      browserTtl: 86400 // 24 hours
    }
  }
};
```

### Image Processing Pipeline

#### Image Processing Service (Python)
```python
from PIL import Image
import io
import asyncio
from fastapi import FastAPI, UploadFile

app = FastAPI()

class ImageProcessor:
    def __init__(self):
        self.supported_formats = ['JPEG', 'PNG', 'WEBP']
        self.max_size = 10 * 1024 * 1024  # 10MB
        
    async def process_avatar_image(self, image_file: UploadFile):
        # Validate file
        if image_file.size > self.max_size:
            raise ValueError("File too large")
            
        # Load and process image
        image = Image.open(io.BytesIO(await image_file.read()))
        
        # Generate different sizes
        sizes = {
            'original': image,
            'large': self.resize_image(image, (1024, 1024)),
            'medium': self.resize_image(image, (512, 512)),
            'thumbnail': self.resize_image(image, (256, 256)),
            'small': self.resize_image(image, (128, 128))
        }
        
        # Convert to optimized formats
        processed_images = {}
        for size_name, img in sizes.items():
            processed_images[size_name] = {
                'webp': self.to_webp(img),
                'png': self.to_png(img),
                'jpeg': self.to_jpeg(img)
            }
            
        return processed_images
    
    def resize_image(self, image, size):
        return image.resize(size, Image.Resampling.LANCZOS)
    
    def to_webp(self, image):
        buffer = io.BytesIO()
        image.save(buffer, format='WEBP', quality=85, optimize=True)
        return buffer.getvalue()
```

### Backup and Disaster Recovery

#### IPFS Pinning Strategy
```javascript
const pinningServices = [
  {
    name: 'Pinata',
    endpoint: 'https://api.pinata.cloud',
    apiKey: process.env.PINATA_API_KEY
  },
  {
    name: 'Infura',
    endpoint: 'https://ipfs.infura.io:5001',
    auth: process.env.INFURA_PROJECT_SECRET
  }
];

const pinToMultipleServices = async (hash) => {
  const pinPromises = pinningServices.map(service => 
    pinToService(service, hash)
  );
  
  return await Promise.allSettled(pinPromises);
};
```

## Security Design

### Authentication and Authorization

#### Multi-Factor Authentication
```javascript
const MFA_CONFIG = {
  totp: {
    issuer: 'CryptoAvatars',
    algorithm: 'SHA1',
    digits: 6,
    period: 30
  },
  backup_codes: {
    count: 10,
    length: 8
  }
};

const generateTOTPSecret = () => {
  return speakeasy.generateSecret({
    name: 'CryptoAvatars',
    issuer: 'CryptoAvatars',
    length: 32
  });
};
```

#### Role-Based Access Control (RBAC)
```javascript
const PERMISSIONS = {
  'avatar:create': ['user', 'creator', 'admin'],
  'avatar:update': ['owner', 'admin'],
  'avatar:delete': ['owner', 'admin'],
  'collection:create': ['creator', 'admin'],
  'user:ban': ['admin'],
  'system:maintenance': ['admin']
};

const hasPermission = (userRoles, permission) => {
  const requiredRoles = PERMISSIONS[permission];
  return requiredRoles.some(role => userRoles.includes(role));
};
```

### Image Upload Security

#### File Validation
```javascript
const validateImageUpload = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type');
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
  
  // Check for malicious content
  return scanForMalware(file);
};
```

#### Content Scanning
```python
import hashlib
import requests

class ContentModerator:
    def __init__(self):
        self.nsfw_api_key = os.getenv('NSFW_API_KEY')
        self.virus_total_key = os.getenv('VIRUS_TOTAL_KEY')
    
    async def scan_image(self, image_data):
        # Calculate hash
        image_hash = hashlib.sha256(image_data).hexdigest()
        
        # Check against known bad hashes
        if await self.is_blacklisted_hash(image_hash):
            return {'safe': False, 'reason': 'Blacklisted content'}
        
        # NSFW detection
        nsfw_result = await self.check_nsfw_content(image_data)
        if nsfw_result['nsfw_score'] > 0.8:
            return {'safe': False, 'reason': 'NSFW content detected'}
        
        return {'safe': True}
```

### Content Moderation Workflow

#### Automated Moderation Pipeline
```javascript
const moderationPipeline = async (avatarId, imageData) => {
  const checks = [
    checkImageHash(imageData),
    checkNSFWContent(imageData),
    checkCopyrightViolation(imageData),
    checkMaliciousContent(imageData)
  ];
  
  const results = await Promise.all(checks);
  const failed = results.filter(r => !r.passed);
  
  if (failed.length > 0) {
    await flagAvatar(avatarId, failed);
    await notifyModerators(avatarId, failed);
    return { approved: false, reasons: failed };
  }
  
  return { approved: true };
};
```

### Rate Limiting and DDoS Protection

#### Redis-Based Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const createRateLimiter = (windowMs, max, keyGenerator) => {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:'
    }),
    windowMs,
    max,
    keyGenerator,
    message: 'Too many requests',
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Different limits for different endpoints
const authLimiter = createRateLimiter(15 * 60 * 1000, 5, req => req.ip); // 5 per 15min
const apiLimiter = createRateLimiter(60 * 60 * 1000, 1000, req => req.user?.id || req.ip); // 1000 per hour
```

## Scalability & Performance

### Horizontal Scaling Strategy

#### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: avatar-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: avatar-service
  template:
    metadata:
      labels:
        app: avatar-service
    spec:
      containers:
      - name: avatar-service
        image: crypto-avatars/avatar-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: avatar-service
spec:
  selector:
    app: avatar-service
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

#### Auto-Scaling Configuration
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: avatar-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: avatar-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Caching Layers

#### Redis Cache Strategy
```javascript
const cacheService = {
  // User session cache
  async getUserSession(userId) {
    const key = `session:${userId}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  },
  
  // Avatar metadata cache
  async getAvatarMetadata(avatarId) {
    const key = `avatar:${avatarId}`;
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
    
    const avatar = await db.avatars.findById(avatarId);
    await redis.setex(key, 3600, JSON.stringify(avatar)); // 1 hour TTL
    return avatar;
  },
  
  // Search results cache
  async getSearchResults(query, filters) {
    const key = `search:${hashQuery(query, filters)}`;
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
    
    const results = await searchService.search(query, filters);
    await redis.setex(key, 300, JSON.stringify(results)); // 5 min TTL
    return results;
  }
};
```

### Database Optimization

#### Read Replicas Configuration
```javascript
const dbConfig = {
  master: {
    host: process.env.DB_MASTER_HOST,
    port: 5432,
    database: 'crypto_avatars',
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    pool: {
      min: 5,
      max: 20
    }
  },
  replicas: [
    {
      host: process.env.DB_REPLICA1_HOST,
      port: 5432,
      database: 'crypto_avatars',
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      pool: {
        min: 2,
        max: 10
      }
    }
  ]
};

const getDbConnection = (operation) => {
  if (operation === 'read') {
    const replica = dbConfig.replicas[Math.floor(Math.random() * dbConfig.replicas.length)];
    return new Pool(replica);
  }
  return new Pool(dbConfig.master);
};
```

#### Query Optimization
```sql
-- Optimized avatar search query
EXPLAIN ANALYZE
SELECT a.*, u.username, c.name as collection_name
FROM avatars a
JOIN users u ON a.owner_id = u.id
LEFT JOIN collections c ON a.collection_id = c.id
WHERE a.is_public = true
  AND ($1::text IS NULL OR a.name ILIKE '%' || $1 || '%')
  AND ($2::text IS NULL OR a.blockchain = $2)
  AND ($3::jsonb IS NULL OR a.traits @> $3)
ORDER BY a.created_at DESC
LIMIT $4 OFFSET $5;
```

### Monitoring and Alerting

#### Prometheus Metrics
```javascript
const prometheus = require('prom-client');

const metrics = {
  httpRequests: new prometheus.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status']
  }),
  
  avatarCreations: new prometheus.Counter({
    name: 'avatar_creations_total',
    help: 'Total avatar creations',
    labelNames: ['blockchain', 'status']
  }),
  
  imageProcessingTime: new prometheus.Histogram({
    name: 'image_processing_duration_seconds',
    help: 'Image processing duration',
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  }),
  
  activeUsers: new prometheus.Gauge({
    name: 'active_users',
    help: 'Number of active users'
  })
};
```

#### Alert Rules
```yaml
groups:
- name: crypto-avatars
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 2m
    annotations:
      summary: High error rate detected
      
  - alert: DatabaseConnectionHigh
    expr: pg_stat_activity_count > 80
    for: 1m
    annotations:
      summary: Database connection count is high
      
  - alert: ImageProcessingBacklog
    expr: image_processing_queue_size > 100
    for: 5m
    annotations:
      summary: Image processing queue is backing up
```

## Development Guidelines

### Code Structure and Standards

#### Project Structure
```
crypto-avatars/
├── services/
│   ├── auth-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   └── utils/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── avatar-service/
│   └── wallet-service/
├── shared/
│   ├── database/
│   ├── types/
│   └── utils/
├── infrastructure/
│   ├── kubernetes/
│   ├── terraform/
│   └── docker-compose.yml
├── docs/
└── scripts/
```

#### Code Style Guidelines
```javascript
// ESLint configuration
module.exports = {
  extends: ['eslint:recommended', '@typescript-eslint/recommended'],
  rules: {
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error'
  }
};

// Prettier configuration
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2
};
```

### Testing Strategy

#### Unit Tests
```javascript
// Avatar service unit test
describe('AvatarService', () => {
  let avatarService;
  let mockDb;
  
  beforeEach(() => {
    mockDb = {
      avatars: {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      }
    };
    avatarService = new AvatarService(mockDb);
  });
  
  describe('createAvatar', () => {
    it('should create avatar with valid data', async () => {
      const avatarData = {
        name: 'Test Avatar',
        description: 'Test Description',
        image: 'base64image...'
      };
      
      mockDb.avatars.create.mockResolvedValue({ id: 'uuid', ...avatarData });
      
      const result = await avatarService.createAvatar(avatarData);
      
      expect(result).toHaveProperty('id');
      expect(result.name).toBe(avatarData.name);
      expect(mockDb.avatars.create).toHaveBeenCalledWith(avatarData);
    });
  });
});
```

#### Integration Tests
```javascript
// API integration test
describe('Avatar API', () => {
  let app;
  let token;
  
  beforeAll(async () => {
    app = await createTestApp();
    token = await getTestToken();
  });
  
  describe('POST /api/v1/avatars', () => {
    it('should create avatar when authenticated', async () => {
      const response = await request(app)
        .post('/api/v1/avatars')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Avatar',
          description: 'Test Description',
          image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        });
        
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Avatar');
    });
  });
});
```

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:6
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run tests
      run: npm run test:coverage
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
        REDIS_URL: redis://localhost:6379
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build and push Docker images
      run: |
        docker build -t crypto-avatars/auth-service:${{ github.sha }} ./services/auth-service
        docker build -t crypto-avatars/avatar-service:${{ github.sha }} ./services/avatar-service
        docker build -t crypto-avatars/wallet-service:${{ github.sha }} ./services/wallet-service
        
        # Push to registry
        echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker push crypto-avatars/auth-service:${{ github.sha }}
        docker push crypto-avatars/avatar-service:${{ github.sha }}
        docker push crypto-avatars/wallet-service:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/auth-service auth-service=crypto-avatars/auth-service:${{ github.sha }}
        kubectl set image deployment/avatar-service avatar-service=crypto-avatars/avatar-service:${{ github.sha }}
        kubectl set image deployment/wallet-service wallet-service=crypto-avatars/wallet-service:${{ github.sha }}
        kubectl rollout status deployment/auth-service
        kubectl rollout status deployment/avatar-service
        kubectl rollout status deployment/wallet-service
```

### Deployment Architecture

#### Production Deployment
```yaml
# Terraform configuration for AWS
resource "aws_eks_cluster" "crypto_avatars" {
  name     = "crypto-avatars-cluster"
  role_arn = aws_iam_role.cluster.arn
  version  = "1.24"

  vpc_config {
    subnet_ids = [
      aws_subnet.private_1.id,
      aws_subnet.private_2.id,
      aws_subnet.public_1.id,
      aws_subnet.public_2.id,
    ]
  }
}

resource "aws_rds_cluster" "crypto_avatars_db" {
  cluster_identifier      = "crypto-avatars-db"
  engine                 = "aurora-postgresql"
  engine_version         = "13.7"
  database_name          = "crypto_avatars"
  master_username        = "postgres"
  master_password        = var.db_password
  backup_retention_period = 7
  preferred_backup_window = "07:00-09:00"
  
  db_subnet_group_name   = aws_db_subnet_group.crypto_avatars.name
  vpc_security_group_ids = [aws_security_group.rds.id]
}

resource "aws_elasticache_cluster" "crypto_avatars_redis" {
  cluster_id           = "crypto-avatars-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis6.x"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.crypto_avatars.name
  security_group_ids   = [aws_security_group.redis.id]
}
```

This technical design document provides a comprehensive foundation for building the Crypto Avatars platform. It covers all major architectural decisions, implementation details, and operational considerations needed for a production-ready system that can scale to support millions of users and avatars across multiple blockchain networks.