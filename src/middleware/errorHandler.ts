import { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';
import { ErrorResponse } from '../types';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';
  let details: any = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || 'APP_ERROR';
  } else if (error instanceof PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(error);
    statusCode = prismaError.statusCode;
    message = prismaError.message;
    code = prismaError.code;
    details = prismaError.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }

  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Request error:', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    statusCode
  });

  const errorResponse: ErrorResponse = {
    error: code,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    statusCode
  };

  if (process.env.NODE_ENV === 'development' || statusCode < 500) {
    if (details) {
      errorResponse.details = details;
    }
    
    if (process.env.NODE_ENV === 'development') {
      (errorResponse as any).stack = error.stack;
    }
  }

  res.status(statusCode).json(errorResponse);
};

const handlePrismaError = (error: PrismaClientKnownRequestError) => {
  switch (error.code) {
    case 'P2002':
      const target = error.meta?.target as string[];
      const field = target ? target[0] : 'field';
      return {
        statusCode: 409,
        message: `${field} already exists`,
        code: 'DUPLICATE_ENTRY',
        details: { field, constraint: 'unique' }
      };
    
    case 'P2025':
      return {
        statusCode: 404,
        message: 'Record not found',
        code: 'RECORD_NOT_FOUND'
      };
    
    case 'P2003':
      return {
        statusCode: 400,
        message: 'Invalid reference to related record',
        code: 'FOREIGN_KEY_VIOLATION',
        details: { field: error.meta?.field_name }
      };
    
    default:
      return {
        statusCode: 500,
        message: 'Database error',
        code: 'DATABASE_ERROR',
        details: process.env.NODE_ENV === 'development' ? { prismaCode: error.code } : undefined
      };
  }
};