import { AuditLogModel } from '../models';
import { Types } from 'mongoose';

export interface CreateAuditLogParams {
  actorId: string | Types.ObjectId;
  action: string;
  targetEntity?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export const logAudit = async (params: CreateAuditLogParams): Promise<void> => {
  try {
    await AuditLogModel.create({
      actorId: params.actorId,
      action: params.action,
      targetEntity: params.targetEntity || '',
      targetId: params.targetId || '',
      details: params.details || {},
      ipAddress: params.ipAddress || '',
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err);
  }
};
