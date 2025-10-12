import { Request } from 'express';

export type BlockchainType = 'ethereum' | 'polygon' | 'bsc' | 'solana' | 'bitcoin';
export type RarityType = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Avatar {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  blockchain: BlockchainType;
  traits: Record<string, any>;
  rarity: RarityType;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAvatarRequest {
  name: string;
  description?: string;
  imageUrl: string;
  blockchain: BlockchainType;
  traits?: Record<string, any>;
  rarity?: RarityType;
}

export interface UpdateAvatarRequest {
  name?: string;
  description?: string;
  imageUrl?: string;
  traits?: Record<string, any>;
  rarity?: RarityType;
}

export interface UserAuthPayload {
  id: string;
  walletAddress: string;
  blockchain: BlockchainType;
  username?: string;
  isVerified: boolean;
}

export interface AuthenticatedRequest<T = any> extends Request {
  user?: UserAuthPayload;
  body: T;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  timestamp: string;
  path?: string;
  statusCode?: number;
}