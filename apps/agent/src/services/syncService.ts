import * as fs from 'fs';
import { localQueue } from './sqliteQueue';
import { apiClient } from './apiClient';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActivity: number;
  pendingEntries: number;
  pendingScreenshots: number;
  totalPending: number;
  lastSyncedAt: string | null;
}

export class SyncService {
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private isOnline: boolean = true;
  private lastSyncedAt: string | null = null;
  private statusCallback: ((status: SyncStatus) => void) | null = null;

  public onStatusChange(cb: (status: SyncStatus) => void) {
    this.statusCallback = cb;
  }

  public getStatus(): SyncStatus {
    const counts = localQueue.getPendingCounts();
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingActivity: counts.pendingActivity,
      pendingEntries: counts.pendingEntries,
      pendingScreenshots: counts.pendingScreenshots,
      totalPending: counts.totalPending,
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  private notifyStatus() {
    if (this.statusCallback) {
      this.statusCallback(this.getStatus());
    }
  }

  public startSyncLoop(intervalMs: number = 20000) {
    if (this.syncTimer) clearInterval(this.syncTimer);

    this.syncTimer = setInterval(() => {
      this.flushAll();
    }, intervalMs);

    // Initial immediate flush attempt
    this.flushAll();
  }

  public stopSyncLoop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  public async flushAll(): Promise<boolean> {
    if (this.isSyncing) return false;
    if (!apiClient.getToken()) return false;

    this.isSyncing = true;
    this.notifyStatus();

    try {
      // 1. Flush Pending Time Entries (isSync: false)
      await this.flushTimeEntries();

      // 2. Flush Pending Activity Samples (isSync: false)
      await this.flushActivitySamples();

      // 3. Flush Pending Offline Screenshots (isSync: false)
      await this.flushScreenshots();

      this.isOnline = true;
      this.lastSyncedAt = new Date().toISOString();
      return true;
    } catch (err: any) {
      console.warn(`[SyncService] Sync cycle encountered error:`, err?.message || err);
      // If error indicates network is down
      if (err?.code === 'ENOTFOUND' || err?.code === 'ECONNREFUSED' || err?.message?.includes('Network Error')) {
        this.isOnline = false;
      }
      return false;
    } finally {
      this.isSyncing = false;
      this.notifyStatus();
    }
  }

  private async flushTimeEntries() {
    const pending = localQueue.getPendingTimeEntries();
    if (pending.length === 0) return;

    console.log(`[SyncService] Syncing ${pending.length} pending time entries to server...`);
    try {
      const payload = pending.map((e) => ({
        id: e.id,
        projectId: e.projectId,
        taskId: e.taskId,
        description: e.description,
        start: e.start,
        end: e.end,
        durationSeconds: e.durationSeconds,
        breakSeconds: e.breakSeconds,
        isManualEdit: false,
        isSync: true,
      }));

      const res = await apiClient.syncTimeEntries(payload);
      const syncedIds = res.syncedIds || pending.map((e) => e.id);
      localQueue.markTimeEntriesSynced(syncedIds);
      console.log(`[SyncService] Time entries sync confirmed (${syncedIds.length} entries marked isSync: true)`);
    } catch (err: any) {
      console.warn(`[SyncService] Time entries sync failed (${err.message})`);
      throw err;
    }
  }

  private async flushActivitySamples() {
    const pending = localQueue.getPendingActivitySamples(100);
    if (pending.length === 0) return;

    console.log(`[SyncService] Syncing ${pending.length} pending activity samples (isSync: false) to server...`);
    try {
      const payload = pending.map((s) => ({
        userId: s.userId,
        minuteBucket: s.minuteBucket,
        keyboardCount: s.keyboardCount,
        mouseCount: s.mouseCount,
        isIdle: s.isIdle,
        timestamp: s.timestamp,
        windowTitle: s.windowTitle || 'Desktop Workspace',
        isSync: true,
      }));

      await apiClient.uploadActivityBatch(payload);
      const ids = pending.map((s) => s.id!).filter(Boolean);
      localQueue.markActivitySamplesSynced(ids);
      console.log(`[SyncService] Activity samples sync confirmed (${ids.length} samples marked isSync: true)`);
    } catch (err: any) {
      console.warn(`[SyncService] Activity samples sync failed (${err.message})`);
      throw err;
    }
  }

  private async flushScreenshots() {
    const pending = localQueue.getPendingScreenshots();
    if (pending.length === 0) return;

    console.log(`[SyncService] Syncing ${pending.length} pending offline screenshots to server...`);
    for (const sc of pending) {
      try {
        if (!fs.existsSync(sc.filePath)) {
          localQueue.markScreenshotSynced(sc.id);
          continue;
        }

        const buffer = fs.readFileSync(sc.filePath);
        await apiClient.uploadScreenshotDirect(
          buffer,
          sc.capturedAt,
          sc.activityScore,
          sc.isBlurred
        );

        localQueue.markScreenshotSynced(sc.id);
        console.log(`[SyncService] Offline screenshot ${sc.id} uploaded and marked isSync: true`);
      } catch (err: any) {
        console.warn(`[SyncService] Screenshot ${sc.id} upload failed (${err.message})`);
        throw err;
      }
    }
  }

  // Backward compatibility alias
  public async flushQueue(): Promise<boolean> {
    return await this.flushAll();
  }
}

export const syncService = new SyncService();
