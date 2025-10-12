import { BlockchainType } from '../types';

export interface User {
  id: string;
  walletAddress: string;
  blockchain: BlockchainType;
  username?: string;
  email?: string;
  profileImage?: string;
  bio?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  walletAddress: string;
  blockchain: BlockchainType;
  username?: string;
  email?: string;
  profileImage?: string;
  bio?: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  profileImage?: string;
  bio?: string;
}

export interface UserProfile {
  id: string;
  walletAddress: string;
  blockchain: BlockchainType;
  username?: string;
  profileImage?: string;
  bio?: string;
  isVerified: boolean;
  avatarCount: number;
  joinedAt: Date;
}