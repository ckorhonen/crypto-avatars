import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { UserAuthPayload, AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const generateToken = (user: UserAuthPayload): string => {
  return jwt.sign(
    {
      id: user.id,
      walletAddress: user.walletAddress,
      blockchain: user.blockchain,
      username: user.username,
      isVerified: user.isVerified,
    },
    JWT_SECRET,
    { 
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'crypto-avatars-api',
      audience: 'crypto-avatars-client'
    }
  );
};

export const verifyToken = (token: string): UserAuthPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'crypto-avatars-api',
      audience: 'crypto-avatars-client'
    }) as UserAuthPayload;
    
    return decoded;
  } catch (error) {
    logger.error('JWT verification failed:', error);
    return null;
  }
};

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Access token is required'
      });
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        walletAddress: true,
        blockchain: true,
        username: true,
        isVerified: true
      }
    });

    if (!user) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'User not found'
      });
      return;
    }

    req.user = {
      id: user.id,
      walletAddress: user.walletAddress,
      blockchain: user.blockchain,
      username: user.username,
      isVerified: user.isVerified
    };

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
};