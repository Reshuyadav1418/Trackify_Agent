import { Request, Response, NextFunction } from 'express';
import { PolicyModel, ConsentModel } from '../models';
import { AppError } from '../middleware/error.middleware';
import { logAudit } from '../services/audit.service';

export const getActivePolicy = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const policy = await PolicyModel.findOne({ isActive: true }).sort({ version: -1 });
    if (!policy) {
      res.json({
        policy: {
          version: 1,
          screenshotIntervalMinutes: 5,
          isBlurEnabled: false,
          retentionDays: 30,
          consentText: 'Default TeamLogger time and activity tracking policy.',
          isActive: true,
        },
      });
      return;
    }
    res.json({ policy });
  } catch (error) {
    next(error);
  }
};

export const getPolicies = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const policies = await PolicyModel.find().sort({ version: -1 });
    res.json({ policies });
  } catch (error) {
    next(error);
  }
};

export const createPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { version, screenshotIntervalMinutes, isBlurEnabled, retentionDays, consentText, isActive } = req.body;

    const existingPolicy = await PolicyModel.findOne({ version });
    if (existingPolicy) {
      throw new AppError(`Policy version ${version} already exists`, 400);
    }

    if (isActive) {
      await PolicyModel.updateMany({}, { isActive: false });
    }

    const policy = await PolicyModel.create({
      version,
      screenshotIntervalMinutes,
      isBlurEnabled,
      retentionDays,
      consentText,
      isActive: isActive !== undefined ? isActive : true,
    });

    if (req.user) {
      await logAudit({
        actorId: req.user.userId,
        action: 'CREATE_POLICY',
        targetEntity: 'Policy',
        targetId: policy._id.toString(),
        details: { version, retentionDays },
        ipAddress: req.ip,
      });
    }

    res.status(201).json({ message: 'Policy created', policy });
  } catch (error) {
    next(error);
  }
};

export const acceptConsent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const { policyVersion } = req.body;

    const policy = await PolicyModel.findOne({ version: policyVersion });
    if (!policy) {
      throw new AppError(`Policy version ${policyVersion} not found`, 404);
    }

    const consent = await ConsentModel.findOneAndUpdate(
      { userId: req.user.userId, policyVersion },
      { acceptedAt: new Date(), ipAddress: req.ip || '' },
      { upsert: true, new: true }
    );

    await logAudit({
      actorId: req.user.userId,
      action: 'ACCEPT_CONSENT',
      targetEntity: 'Consent',
      targetId: consent._id.toString(),
      details: { policyVersion },
      ipAddress: req.ip,
    });

    res.json({ message: 'Policy consent accepted', consent });
  } catch (error) {
    next(error);
  }
};

export const getConsentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const activePolicy = await PolicyModel.findOne({ isActive: true }).sort({ version: -1 });
    const version = activePolicy ? activePolicy.version : 1;

    const consent = await ConsentModel.findOne({ userId: req.user.userId, policyVersion: version });
    res.json({
      hasAccepted: Boolean(consent),
      policyVersion: version,
    });
  } catch (error) {
    next(error);
  }
};

