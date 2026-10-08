import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@teamlogger/shared';
import { AppError } from './error.middleware';
import { TeamModel } from '../models';

export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Unauthorized access', 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError('Forbidden: insufficient permissions', 403));
      return;
    }

    next();
  };
};

/**
 * Middleware that sets req.rbacFilter according to SPEC:
 * - employee sees only own data
 * - manager sees own team
 * - admin sees the whole org
 */
export const scopeUserAccess = () => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new AppError('Unauthorized access', 401));
      return;
    }

    const { role, userId, teamId } = req.user;

    if (role === 'admin') {
      req.rbacFilter = {};
    } else if (role === 'manager') {
      if (teamId) {
        // Find all member user IDs in the manager's team
        const team = await TeamModel.findById(teamId);
        const memberIds = team ? team.memberIds.map((id) => id.toString()) : [];
        if (!memberIds.includes(userId)) {
          memberIds.push(userId);
        }
        req.rbacFilter = { userId: { $in: memberIds } };
      } else {
        // Manager without team sees only themselves
        req.rbacFilter = { userId };
      }
    } else {
      // Employee sees only own data
      req.rbacFilter = { userId };
    }

    next();
  };
};
