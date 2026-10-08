import { localQueue } from './sqliteQueue';
import { apiClient } from './apiClient';

export class SyncService {
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private retryDelayMs: number = 5000;
  private maxRetryDelayMs: number = 60000;

  public startSyncLoop(intervalMs: number = 30000) {
    if (this.syncTimer) clearInterval(this.syncTimer);

    this.syncTimer = setInterval(() => {
      this.flushQueue();
    }, intervalMs);

    // Initial immediate flush attempt
    this.flushQueue();
  }

  public stopSyncLoop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  public async flushQueue(): Promise<boolean> {
    if (this.isSyncing) return false;
    if (!apiClient.getToken()) return false;

    const pending = localQueue.getPendingSamples(50);
    if (pending.length === 0) return true;

    try {
      this.isSyncing = true;
      console.log(`[SyncService] Flushed ${pending.length} activity samples to backend API...`);

      const payload = pending.map((s) => ({
        userId: s.userId,
        minuteBucket: s.minuteBucket,
        keyboardCount: s.keyboardCount,
        mouseCount: s.mouseCount,
        isIdle: s.isIdle,
        timestamp: s.timestamp,
        windowTitle: s.windowTitle || 'Desktop Workspace',
      }));

      await apiClient.uploadActivityBatch(payload);

      // Remove successfully uploaded IDs from persistent queue
      const idsToRemove = pending.map((s) => s.id!).filter(Boolean);
      localQueue.removeSamples(idsToRemove);

      // Reset exponential backoff delay on clean success
      this.retryDelayMs = 5000;
      console.log(`[SyncService] Sync successful. Remaining queue size: ${localQueue.getCount()}`);
      return true;
    } catch (err: any) {
      console.warn(`[SyncService] Flush failed (${err.message}). Retrying in ${this.retryDelayMs / 1000}s...`);

      // Exponential backoff
      setTimeout(() => {
        this.flushQueue();
      }, this.retryDelayMs);

      this.retryDelayMs = Math.min(this.retryDelayMs * 2, this.maxRetryDelayMs);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncService = new SyncService();
