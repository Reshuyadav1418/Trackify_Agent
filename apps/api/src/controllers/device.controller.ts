import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { DeviceModel } from '../models';
import { AppError } from '../middleware/error.middleware';
import { logAudit } from '../services/audit.service';

export const registerDevice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const { deviceName, os, ipAddress } = req.body;
    const deviceToken = `dt_${crypto.randomBytes(24).toString('hex')}`;

    const device = await DeviceModel.create({
      userId: req.user.userId,
      deviceName,
      os,
      ipAddress: ipAddress || req.ip || '',
      deviceToken,
      lastSeenAt: new Date(),
    });

    await logAudit({
      actorId: req.user.userId,
      action: 'REGISTER_DEVICE',
      targetEntity: 'Device',
      targetId: device._id.toString(),
      details: { deviceName, os },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Device registered successfully',
      deviceToken: device.deviceToken,
      device: {
        id: device._id,
        deviceName: device.deviceName,
        os: device.os,
        lastSeenAt: device.lastSeenAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
