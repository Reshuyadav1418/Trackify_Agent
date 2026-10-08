import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { UserModel, IUser } from '../models';
import { config } from '../config/env';
import { UserRole } from '@teamlogger/shared';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  teamId?: string | null;
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateAccessToken = (user: IUser): string => {
  const payload: JwtPayload = {
    userId: user._id.toString(),
    role: user.role,
    teamId: user.teamId ? user.teamId.toString() : null,
  };
  return jwt.sign(payload, config.jwtAccessSecret, { expiresIn: '15m' });
};

export const generateRefreshToken = (user: IUser): string => {
  const payload: JwtPayload = {
    userId: user._id.toString(),
    role: user.role,
    teamId: user.teamId ? user.teamId.toString() : null,
  };
  return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: '7d' });
};

export const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    expires: new Date(0),
    path: '/',
  });
};

export const storeRefreshTokenHash = async (userId: string, refreshToken: string): Promise<void> => {
  const hash = await bcrypt.hash(refreshToken, 10);
  await UserModel.findByIdAndUpdate(userId, {
    $push: { refreshTokenHashes: hash },
  });
};

export const rotateRefreshToken = async (
  userId: string,
  oldRefreshToken: string,
  newRefreshToken: string
): Promise<boolean> => {
  const user = await UserModel.findById(userId);
  if (!user) return false;

  let matchedHashIndex = -1;
  for (let i = 0; i < user.refreshTokenHashes.length; i++) {
    const isMatch = await bcrypt.compare(oldRefreshToken, user.refreshTokenHashes[i]);
    if (isMatch) {
      matchedHashIndex = i;
      break;
    }
  }

  if (matchedHashIndex === -1) {
    // Security breach or token reuse attempt -> invalidate all refresh tokens for this user
    user.refreshTokenHashes = [];
    await user.save();
    return false;
  }

  // Replace old hash with new hash
  const newHash = await bcrypt.hash(newRefreshToken, 10);
  user.refreshTokenHashes.splice(matchedHashIndex, 1, newHash);
  await user.save();
  return true;
};

export const removeRefreshTokenHash = async (userId: string, refreshToken: string): Promise<void> => {
  const user = await UserModel.findById(userId);
  if (!user) return;

  const updatedHashes: string[] = [];
  for (const hash of user.refreshTokenHashes) {
    const isMatch = await bcrypt.compare(refreshToken, hash);
    if (!isMatch) {
      updatedHashes.push(hash);
    }
  }

  user.refreshTokenHashes = updatedHashes;
  await user.save();
};
