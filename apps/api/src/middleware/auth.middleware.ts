import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AppError } from './error.middleware';
import { JwtPayload } from '../services/auth.service';

export const authenticateToken = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    next(new AppError('Authentication token required', 401));
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtAccessSecret) as JwtPayload;
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      teamId: decoded.teamId || null,
    };
    next();
  } catch (err) {
    next(new AppError('Invalid or expired token', 401));
  }
};
