import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { validateCreateAvatar, validateUpdateAvatar } from '../middleware/validation';
import { blockchainService } from '../services/blockchain';
import { logger } from '../utils/logger';
import { CreateAvatarRequest, UpdateAvatarRequest, AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// GET /api/avatars - Get all avatars with pagination and filtering
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;
    const blockchain = req.query.blockchain as string;
    const search = req.query.search as string;

    const where: any = {};
    if (blockchain) {
      where.blockchain = blockchain;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [avatars, total] = await Promise.all([
      prisma.avatar.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, walletAddress: true, username: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.avatar.count({ where })
    ]);

    res.json({
      avatars,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching avatars:', error);
    next(error);
  }
});

// GET /api/avatars/:id - Get avatar by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const avatar = await prisma.avatar.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, walletAddress: true, username: true }
        }
      }
    });

    if (!avatar) {
      return res.status(404).json({ 
        error: 'Avatar not found',
        message: `Avatar with ID ${id} does not exist`
      });
    }

    res.json(avatar);
  } catch (error) {
    logger.error('Error fetching avatar:', error);
    next(error);
  }
});

// POST /api/avatars - Create new avatar
router.post('/', 
  authenticateToken,
  validateCreateAvatar,
  async (req: AuthenticatedRequest<CreateAvatarRequest>, res: Response, next: NextFunction) => {
    try {
      const { name, description, imageUrl, blockchain, traits, rarity } = req.body;
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValidWallet = await blockchainService.verifyWalletOwnership(
        user.walletAddress,
        blockchain
      );

      if (!isValidWallet) {
        return res.status(400).json({ 
          error: 'Invalid wallet',
          message: `Wallet ${user.walletAddress} is not valid for ${blockchain}`
        });
      }

      const avatar = await prisma.avatar.create({
        data: {
          name,
          description,
          imageUrl,
          blockchain,
          traits: traits || {},
          rarity: rarity || 'common',
          userId
        },
        include: {
          user: {
            select: { id: true, walletAddress: true, username: true }
          }
        }
      });

      logger.info('Avatar created successfully', { avatarId: avatar.id, userId });
      res.status(201).json(avatar);
    } catch (error) {
      logger.error('Error creating avatar:', error);
      next(error);
    }
  }
);

// PUT /api/avatars/:id - Update avatar
router.put('/:id',
  authenticateToken,
  validateUpdateAvatar,
  async (req: AuthenticatedRequest<UpdateAvatarRequest>, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, description, imageUrl, traits, rarity } = req.body;
      const userId = req.user!.id;

      const existingAvatar = await prisma.avatar.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!existingAvatar) {
        return res.status(404).json({ 
          error: 'Avatar not found',
          message: `Avatar with ID ${id} does not exist`
        });
      }

      if (existingAvatar.userId !== userId) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'You can only update your own avatars'
        });
      }

      const updatedAvatar = await prisma.avatar.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(imageUrl && { imageUrl }),
          ...(traits && { traits }),
          ...(rarity && { rarity }),
          updatedAt: new Date()
        },
        include: {
          user: {
            select: { id: true, walletAddress: true, username: true }
          }
        }
      });

      logger.info('Avatar updated successfully', { avatarId: id, userId });
      res.json(updatedAvatar);
    } catch (error) {
      logger.error('Error updating avatar:', error);
      next(error);
    }
  }
);

// DELETE /api/avatars/:id - Delete avatar
router.delete('/:id',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const existingAvatar = await prisma.avatar.findUnique({
        where: { id }
      });

      if (!existingAvatar) {
        return res.status(404).json({ 
          error: 'Avatar not found',
          message: `Avatar with ID ${id} does not exist`
        });
      }

      if (existingAvatar.userId !== userId) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'You can only delete your own avatars'
        });
      }

      await prisma.avatar.delete({ where: { id } });

      logger.info('Avatar deleted successfully', { avatarId: id, userId });
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting avatar:', error);
      next(error);
    }
  }
);

// GET /api/avatars/user/:userId - Get avatars by user ID
router.get('/user/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const [avatars, total] = await Promise.all([
      prisma.avatar.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, walletAddress: true, username: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.avatar.count({ where: { userId } })
    ]);

    res.json({
      avatars,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching user avatars:', error);
    next(error);
  }
});

export default router;