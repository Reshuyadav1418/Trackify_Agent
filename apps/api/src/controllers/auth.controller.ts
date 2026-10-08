import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models';
import { AppError } from '../middleware/error.middleware';
import {
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  storeRefreshTokenHash,
  rotateRefreshToken,
  removeRefreshTokenHash,
  JwtPayload,
} from '../services/auth.service';
import { config } from '../config/env';
import { logAudit } from '../services/audit.service';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await storeRefreshTokenHash(user._id.toString(), refreshToken);
    setRefreshTokenCookie(res, refreshToken);

    await logAudit({
      actorId: user._id.toString(),
      action: 'LOGIN',
      ipAddress: req.ip,
    });

    res.json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new AppError('Refresh token missing', 401);
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as JwtPayload;
    } catch {
      clearRefreshTokenCookie(res);
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      clearRefreshTokenCookie(res);
      throw new AppError('User not found', 401);
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    const rotated = await rotateRefreshToken(user._id.toString(), refreshToken, newRefreshToken);
    if (!rotated) {
      clearRefreshTokenCookie(res);
      throw new AppError('Token rotation security error. Please log in again.', 401);
    }

    setRefreshTokenCookie(res, newRefreshToken);

    res.json({
      message: 'Token refreshed',
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken && req.user?.userId) {
      await removeRefreshTokenHash(req.user.userId, refreshToken);
      await logAudit({
        actorId: req.user.userId,
        action: 'LOGOUT',
        ipAddress: req.ip,
      });
    }

    clearRefreshTokenCookie(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await UserModel.findById(req.user.userId).select('-password -refreshTokenHashes');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};
