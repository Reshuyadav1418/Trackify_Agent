import { UserRole } from '@teamlogger/shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: UserRole;
        teamId?: string | null;
      };
      rbacFilter?: Record<string, unknown>;
    }
  }
}
