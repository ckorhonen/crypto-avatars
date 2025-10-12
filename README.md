# Crypto Avatars

**Gravatar for Crypto** - A decentralized avatar service for blockchain wallet addresses

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue)](https://www.typescriptlang.org/)

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start with Docker](#quick-start-with-docker)
- [Manual Setup](#manual-setup)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Running Tests](#running-tests)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Architecture](#architecture)
- [License](#license)

---

## 🎯 Project Overview

Crypto Avatars is a decentralized avatar service designed to provide a universal identity layer for blockchain wallet addresses across multiple networks. Similar to how Gravatar works for email addresses, Crypto Avatars allows users to associate profile images and metadata with their wallet addresses, making them recognizable across different dApps and blockchain platforms.

The service supports multiple blockchain networks including Ethereum, Polygon, Solana, and more, with IPFS-based decentralized storage for avatar images.

---

## ✨ Features

- **Multi-Chain Support**: Ethereum, Polygon, Solana, and other major blockchain networks
- **Decentralized Storage**: IPFS integration with Pinata for permanent avatar storage
- **NFT Avatar Detection**: Automatic detection and display of NFT-based avatars
- **RESTful API**: Comprehensive API for avatar management and retrieval
- **JWT Authentication**: Secure authentication with wallet signature verification
- **Caching Layer**: Redis-based caching for high-performance avatar delivery
- **Rate Limiting**: Built-in protection against API abuse
- **Image Processing**: Automatic image optimization and resizing with Sharp
- **Fallback Avatars**: Automatic generation of identicon-style fallback avatars
- **Blockchain Verification**: Cryptographic verification of wallet ownership
- **CORS Support**: Cross-origin resource sharing for dApp integration

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

### Required
- **Node.js**: v18.0.0 or higher ([Download](https://nodejs.org/))
- **npm**: v9.0.0 or higher (comes with Node.js)
- **Docker**: Latest version ([Download](https://www.docker.com/get-started))
- **Docker Compose**: v2.0 or higher (usually included with Docker Desktop)

### Optional (for manual setup)
- **PostgreSQL**: v15 or higher ([Download](https://www.postgresql.org/download/))
- **Redis**: v7 or higher ([Download](https://redis.io/download))
- **Git**: For cloning the repository ([Download](https://git-scm.com/))

### System Requirements
- **OS**: Linux, macOS, or Windows with WSL2
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: 2GB free space
- **Network**: Internet connection for blockchain RPC endpoints

### API Keys (Required for Full Functionality)
- **Infura** or **Alchemy**: For Ethereum/Polygon RPC access
- **Pinata**: For IPFS pinning service
- **AWS S3** (optional): For additional storage backup

---

## 🚀 Quick Start with Docker

The easiest way to get started is using Docker Compose, which will set up all services automatically.

### 1. Clone the Repository

```bash
git clone https://github.com/ckorhonen/crypto-avatars.git
cd crypto-avatars
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
nano .env  # or use your preferred editor
```

**Minimum required variables for Docker setup:**
```env
DATABASE_URL=postgresql://postgres:password@postgres:5432/crypto_avatars
REDIS_URL=redis://redis:6379
JWT_SECRET=your-super-secret-jwt-key-here
PORT=3000
NODE_ENV=development
```

### 3. Start All Services

```bash
# Start all services (PostgreSQL, Redis, App, IPFS)
docker-compose up -d

# View logs
docker-compose logs -f app

# Check service health
docker-compose ps
```

### 4. Run Database Migrations

```bash
# Access the app container
docker-compose exec app sh

# Inside the container, run migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Exit the container
exit
```

### 5. Verify Installation

```bash
# Test the health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

The API will be available at `http://localhost:3000`

### Docker Commands Cheat Sheet

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Rebuild containers after code changes
docker-compose up -d --build

# View logs for a specific service
docker-compose logs -f postgres

# Access PostgreSQL directly
docker-compose exec postgres psql -U postgres -d crypto_avatars

# Access Redis CLI
docker-compose exec redis redis-cli
```

---

## 🔧 Manual Setup

If you prefer to run services locally without Docker:

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/ckorhonen/crypto-avatars.git
cd crypto-avatars

# Install Node.js dependencies
npm install
```

### 2. Set Up PostgreSQL

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE crypto_avatars;
CREATE USER crypto_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE crypto_avatars TO crypto_user;
\q
```

### 3. Set Up Redis

```bash
# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server

# Start Redis service
sudo systemctl start redis-server

# Test Redis connection
redis-cli ping
# Expected: PONG
```

### 4. Configure Environment

```bash
# Copy and edit environment variables
cp .env.example .env

# Update DATABASE_URL with your local credentials
# DATABASE_URL=postgresql://crypto_user:your_password@localhost:5432/crypto_avatars
```

### 5. Run Database Migrations

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view database
npm run prisma:studio
```

### 6. Start Development Server

```bash
# Start the development server with hot reload
npm run dev

# Or build and run production
npm run build
npm start
```

The API will be available at `http://localhost:3000`

---

## 🗄️ Database Setup

### Database Schema

The application uses Prisma ORM with PostgreSQL. The schema includes:

- **Users**: Wallet addresses and authentication
- **Avatars**: Avatar metadata and storage references
- **Chains**: Supported blockchain networks
- **NFTAvatars**: Linked NFT-based avatars
- **Sessions**: User session management

### Migration Commands

```bash
# Create a new migration
npm run prisma:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Apply pending migrations
npx prisma migrate deploy

# View migration status
npx prisma migrate status

# Generate Prisma Client after schema changes
npm run prisma:generate
```

### Seeding the Database (Optional)

```bash
# Create a seed file if needed
npx prisma db seed
```

### Database Backup

```bash
# Backup PostgreSQL database
pg_dump -U postgres crypto_avatars > backup.sql

# Restore from backup
psql -U postgres crypto_avatars < backup.sql

# Docker backup
docker-compose exec postgres pg_dump -U postgres crypto_avatars > backup.sql
```

---

## ⚙️ Environment Configuration

### Required Environment Variables

Create a `.env` file with the following configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/crypto_avatars
REDIS_URL=redis://localhost:6379

# JWT Configuration (REQUIRED - Generate strong secrets)
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your-refresh-token-secret-here

# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Blockchain RPC Endpoints (REQUIRED for blockchain features)
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
ETHEREUM_TESTNET_RPC_URL=https://goerli.infura.io/v3/YOUR_INFURA_PROJECT_ID
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
POLYGON_TESTNET_RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_INFURA_PROJECT_ID
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_TESTNET_RPC_URL=https://api.devnet.solana.com

# IPFS Configuration (REQUIRED for avatar storage)
IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_API_KEY=your-pinata-secret-key
IPFS_NODE_URL=https://api.pinata.cloud

# AWS S3 Configuration (Optional - for backup storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=crypto-avatars-storage

# Third-party API Keys (Optional - for enhanced features)
ALCHEMY_API_KEY=your-alchemy-api-key
MORTALIS_API_KEY=your-moralis-api-key
OPENSEA_API_KEY=your-opensea-api-key
COINGECKO_API_KEY=your-coingecko-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Cache Configuration
CACHE_TTL=3600
CACHE_MAX_SIZE=1000
```

### Obtaining API Keys

**Infura** (Ethereum/Polygon RPC):
1. Sign up at [infura.io](https://infura.io/)
2. Create a new project
3. Copy the project ID and use in RPC URLs

**Pinata** (IPFS):
1. Sign up at [pinata.cloud](https://www.pinata.cloud/)
2. Generate API keys from the dashboard
3. Add to PINATA_API_KEY and PINATA_SECRET_API_KEY

**Alchemy** (Alternative RPC):
1. Sign up at [alchemy.com](https://www.alchemy.com/)
2. Create a new app
3. Copy the API key

### Security Best Practices

- **Never commit `.env` files** to version control
- **Use strong, random secrets** for JWT_SECRET (minimum 32 characters)
- **Rotate secrets regularly** in production
- **Use environment-specific configurations** (dev, staging, production)
- **Store production secrets** in a secure vault (AWS Secrets Manager, HashiCorp Vault)

---

## 🧪 Running Tests

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm test -- --coverage

# Run specific test file
npm test -- src/tests/avatar.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="Avatar upload"
```

### Test Structure

```
src/
  └── tests/
      ├── unit/           # Unit tests for individual functions
      ├── integration/    # Integration tests for API endpoints
      └── e2e/            # End-to-end tests
```

### Writing Tests

Tests use Jest and Supertest. Example:

```typescript
import request from 'supertest';
import app from '../app';

describe('Avatar API', () => {
  it('should fetch avatar by address', async () => {
    const response = await request(app)
      .get('/api/v1/avatars/0x123...')
      .expect(200);
    
    expect(response.body).toHaveProperty('avatarUrl');
  });
});
```

### Test Coverage

View coverage report after running tests:

```bash
# Generate and view coverage
npm test -- --coverage

# Open HTML coverage report
open coverage/lcov-report/index.html
```

**Target Coverage Goals:**
- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%

---

## 📚 API Documentation

### Base URL

```
Development: http://localhost:3000/api/v1
Production: https://api.cryptoavatars.com/api/v1
```

### Authentication

Most endpoints require JWT authentication via wallet signature:

```bash
# Get nonce for wallet
POST /auth/nonce
Content-Type: application/json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}

# Sign message with wallet and authenticate
POST /auth/verify
Content-Type: application/json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0x...",
  "message": "Sign this message to authenticate..."
}

# Use returned JWT token in subsequent requests
Authorization: Bearer <jwt_token>
```

### Core Endpoints

#### Get Avatar
```bash
GET /avatars/:address
GET /avatars/:address?size=256&format=png
```

#### Upload Avatar
```bash
POST /avatars
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

# Form data:
# - image: File (PNG, JPG, GIF)
# - address: Wallet address
# - chain: Blockchain network (ethereum, polygon, solana)
```

#### Update Avatar
```bash
PUT /avatars/:address
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

#### Delete Avatar
```bash
DELETE /avatars/:address
Authorization: Bearer <jwt_token>
```

#### Get NFT Avatars
```bash
GET /avatars/:address/nfts
```

#### Health Check
```bash
GET /health
```

### Response Format

Success (200):
```json
{
  "success": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "avatarUrl": "https://gateway.pinata.cloud/ipfs/Qm...",
    "chain": "ethereum",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

Error (4xx/5xx):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_ADDRESS",
    "message": "Invalid wallet address format"
  }
}
```

### Rate Limits

- **Public endpoints**: 100 requests per 15 minutes
- **Authenticated endpoints**: 1000 requests per 15 minutes
- **Upload endpoints**: 10 requests per hour

### Full API Documentation

For comprehensive API documentation including all endpoints, parameters, and examples:

- **Swagger UI**: http://localhost:3000/api-docs (when running locally)
- **Postman Collection**: Import from `/docs/postman_collection.json`
- **OpenAPI Spec**: Available at `/docs/openapi.yaml`

---

## 🚢 Deployment

### Production Deployment with Docker

#### 1. Production Environment Setup

```bash
# Create production environment file
cp .env.example .env.production

# Update with production values
nano .env.production
```

#### 2. Build Production Image

```bash
# Build optimized production image
docker build -t crypto-avatars:latest --target production .

# Tag for registry
docker tag crypto-avatars:latest your-registry/crypto-avatars:latest

# Push to container registry
docker push your-registry/crypto-avatars:latest
```

#### 3. Deploy with Docker Compose

```bash
# Use production profile
docker-compose --profile production up -d

# Or use separate production compose file
docker-compose -f docker-compose.prod.yml up -d
```

### Cloud Deployment Options

#### AWS (EC2 + RDS + ElastiCache)

```bash
# Install Docker on EC2
sudo yum update -y
sudo yum install docker -y
sudo service docker start

# Clone and configure
git clone https://github.com/ckorhonen/crypto-avatars.git
cd crypto-avatars

# Update .env with RDS and ElastiCache endpoints
# Deploy
docker-compose up -d
```

#### Google Cloud Platform (Cloud Run)

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/crypto-avatars

# Deploy to Cloud Run
gcloud run deploy crypto-avatars \
  --image gcr.io/PROJECT_ID/crypto-avatars \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create crypto-avatars

# Add PostgreSQL and Redis
heroku addons:create heroku-postgresql:standard-0
heroku addons:create heroku-redis:premium-0

# Set environment variables
heroku config:set JWT_SECRET=your-secret
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

#### Kubernetes

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

### Production Checklist

- [ ] Set strong JWT_SECRET and other secrets
- [ ] Configure production DATABASE_URL
- [ ] Set up SSL/TLS certificates
- [ ] Configure CORS for production domains
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up CDN for avatar delivery
- [ ] Enable rate limiting
- [ ] Configure health checks
- [ ] Set up CI/CD pipeline
- [ ] Document rollback procedure
- [ ] Test disaster recovery plan

### Monitoring and Logging

```bash
# View application logs
docker-compose logs -f app

# Monitor with external tools
# - DataDog: Application monitoring
# - Sentry: Error tracking
# - Prometheus + Grafana: Metrics and dashboards
# - ELK Stack: Log aggregation
```

### Performance Optimization

- **CDN**: Use CloudFlare or CloudFront for avatar delivery
- **Caching**: Ensure Redis is properly configured
- **Database**: Connection pooling and query optimization
- **Image Optimization**: Sharp processes images efficiently
- **Horizontal Scaling**: Run multiple app instances behind load balancer

---

## 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

### Development Workflow

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/crypto-avatars.git
   cd crypto-avatars
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

3. **Make Your Changes**
   - Write clean, documented code
   - Follow the existing code style
   - Add tests for new features
   - Update documentation as needed

4. **Test Your Changes**
   ```bash
   # Run linter
   npm run lint

   # Format code
   npm run format

   # Run tests
   npm test

   # Check test coverage
   npm test -- --coverage
   ```

5. **Commit Your Changes**
   ```bash
   # Use conventional commits format
   git commit -m "feat: add support for Base network"
   git commit -m "fix: resolve avatar caching issue"
   git commit -m "docs: update API documentation"
   ```

6. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   # Then create PR on GitHub
   ```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### Code Style Guidelines

- **TypeScript**: Use strict mode
- **Naming**: camelCase for variables, PascalCase for classes
- **Formatting**: Use Prettier (automatically enforced)
- **Comments**: Document complex logic and public APIs
- **Error Handling**: Always handle errors gracefully

### Pull Request Process

1. Update README.md with details of interface changes
2. Update the CHANGELOG.md with your changes
3. Ensure all tests pass and coverage doesn't decrease
4. Request review from maintainers
5. Address review feedback
6. Squash commits if requested

### Reporting Issues

When reporting issues, please include:

- **Description**: Clear description of the problem
- **Steps to Reproduce**: Detailed steps to recreate the issue
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: OS, Node version, Docker version
- **Logs**: Relevant error messages or logs

### Feature Requests

We love new ideas! Submit feature requests with:

- **Use Case**: Why this feature is needed
- **Proposed Solution**: How you envision it working
- **Alternatives**: Other approaches considered
- **Additional Context**: Mockups, examples, etc.

### Community Guidelines

- Be respectful and inclusive
- Help others in discussions
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md)
- Give credit where it's due

---

## 🏗️ Architecture

### System Architecture

Crypto Avatars follows a modern microservices-inspired architecture with the following components:

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  (dApps, Wallets, Web Apps, Mobile Apps)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway / CDN                       │
│           (Rate Limiting, CORS, SSL/TLS)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application Server                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Auth        │  │  Avatar      │  │  Blockchain  │     │
│  │  Service     │  │  Service     │  │  Service     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  PostgreSQL │  │    Redis    │  │    IPFS     │
│  (Primary)  │  │   (Cache)   │  │  (Storage)  │
└─────────────┘  └─────────────┘  └─────────────┘
         │               │               │
         └───────────────┴───────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  Blockchain RPC │
                │  (Ethereum, etc)│
                └─────────────────┘
```

### Technology Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **Storage**: IPFS (Pinata)
- **Blockchain**: Ethers.js, Web3.js, Solana Web3.js
- **Image Processing**: Sharp
- **Authentication**: JWT + Wallet Signatures
- **Testing**: Jest + Supertest
- **Containerization**: Docker + Docker Compose

### Key Components

1. **API Layer**: RESTful endpoints with Express
2. **Authentication**: Wallet-based auth with signature verification
3. **Avatar Service**: Upload, processing, and retrieval
4. **Blockchain Service**: Multi-chain wallet verification
5. **Storage Service**: IPFS pinning and retrieval
6. **Caching Layer**: Redis for performance optimization
7. **Database Layer**: PostgreSQL for persistent storage

### Documentation

For detailed technical documentation, see:

- **[Product Requirements Document (PRD)](./PRD.md)**: Product vision, features, and requirements
- **[Technical Design Document](./TECHNICAL_DESIGN.md)**: System architecture, API specs, and implementation details

### Data Flow

1. User uploads avatar with wallet signature
2. Server verifies wallet ownership
3. Image processed and optimized
4. Avatar pinned to IPFS
5. Metadata stored in PostgreSQL
6. Cache warmed in Redis
7. CDN distributes avatar globally

### Security Considerations

- Wallet signature verification for authentication
- Rate limiting to prevent abuse
- Input validation and sanitization
- Secure environment variable management
- CORS configuration for trusted origins
- Regular security audits and updates

---

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Gravatar**: Inspiration for universal avatar service
- **IPFS**: Decentralized storage protocol
- **Ethereum**: Blockchain ecosystem
- **Open Source Community**: All contributors and supporters

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ckorhonen/crypto-avatars/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ckorhonen/crypto-avatars/discussions)
- **Email**: chris@example.com
- **Discord**: [Join our community](https://discord.gg/cryptoavatars)
- **Twitter**: [@cryptoavatars](https://twitter.com/cryptoavatars)

---

## 🗺️ Roadmap

- [x] Multi-chain support (Ethereum, Polygon, Solana)
- [x] IPFS integration
- [x] NFT avatar detection
- [ ] ENS domain support
- [ ] Avatar history and versioning
- [ ] Batch upload API
- [ ] GraphQL API
- [ ] Mobile SDKs (iOS, Android)
- [ ] Browser extension
- [ ] Decentralized governance

---

**Built with ❤️ by Chris Korhonen and contributors**
