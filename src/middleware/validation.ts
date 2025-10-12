import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';
import { BlockchainType } from '../types';

const blockchainSchema = Joi.string().valid('ethereum', 'polygon', 'bsc', 'solana', 'bitcoin').required();

const createAvatarSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(1000).optional(),
  imageUrl: Joi.string().uri().required(),
  blockchain: blockchainSchema,
  traits: Joi.object().optional(),
  rarity: Joi.string().valid('common', 'uncommon', 'rare', 'epic', 'legendary').default('common')
});

const updateAvatarSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(1000).optional(),
  imageUrl: Joi.string().uri().optional(),
  traits: Joi.object().optional(),
  rarity: Joi.string().valid('common', 'uncommon', 'rare', 'epic', 'legendary').optional()
}).min(1);

const createValidationMiddleware = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Validation failed:', { 
        path: req.path,
        method: req.method,
        errors: validationErrors 
      });

      res.status(400).json({
        error: 'Validation Error',
        message: 'Request validation failed',
        details: validationErrors
      });
      return;
    }

    req.body = value;
    next();
  };
};

export const validateCreateAvatar = createValidationMiddleware(createAvatarSchema);
export const validateUpdateAvatar = createValidationMiddleware(updateAvatarSchema);

export const validateWalletAddress = (blockchain: BlockchainType, address: string): boolean => {
  try {
    switch (blockchain) {
      case 'ethereum':
      case 'polygon':
      case 'bsc':
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      case 'solana':
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
      case 'bitcoin':
        const legacyRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
        const bech32Regex = /^bc1[a-z0-9]{39,59}$/;
        return legacyRegex.test(address) || bech32Regex.test(address);
      default:
        return false;
    }
  } catch (error) {
    logger.error('Wallet address validation error:', error);
    return false;
  }
};