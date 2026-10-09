import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { ActivitySample, OfflineTimeEntry, OfflineScreenshot } from '../types';

export class LocalQueueService {
  private baseDir: string;
  private activityQueuePath: string;
  private timeEntriesQueuePath: string;
  private screenshotQueuePath: string;

  private activityQueue: ActivitySample[] = [];
  private timeEntriesQueue: OfflineTimeEntry[] = [];
  private screenshotQueue: OfflineScreenshot[] = [];

  constructor() {
    this.baseDir = app?.getPath ? app.getPath('userData') : process.cwd();
    this.activityQueuePath = path.join(this.baseDir, 'activity_queue.json');
    this.timeEntriesQueuePath = path.join(this.baseDir, 'time_entries_queue.json');
    this.screenshotQueuePath = path.join(this.baseDir, 'screenshot_queue.json');

    this.ensureDirectory();
    this.loadAll();
  }

  private ensureDirectory() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
      const pendingScreenshotsDir = path.join(this.baseDir, 'pending_screenshots');
      if (!fs.existsSync(pendingScreenshotsDir)) {
        fs.mkdirSync(pendingScreenshotsDir, { recursive: true });
      }
    } catch (err) {
      console.error('[LocalQueue] Error creating directories:', err);
    }
  }

  private loadAll() {
    this.activityQueue = this.loadFile<ActivitySample[]>(this.activityQueuePath, []);
    this.timeEntriesQueue = this.loadFile<OfflineTimeEntry[]>(this.timeEntriesQueuePath, []);
    this.screenshotQueue = this.loadFile<OfflineScreenshot[]>(this.screenshotQueuePath, []);
  }

  private loadFile<T>(filePath: string, defaultValue: T): T {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw) || defaultValue;
      }
    } catch (err) {
      console.error(`[LocalQueue] Error reading ${filePath}:`, err);
    }
    return defaultValue;
  }

  private saveFile(filePath: string, data: any) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[LocalQueue] Error writing to ${filePath}:`, err);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── ACTIVITY SAMPLES (isSync flag) ──
  // ══════════════════════════════════════════════════════════════════════

  public enqueueActivitySample(sample: ActivitySample) {
    const existingIndex = this.activityQueue.findIndex(
      (s) => s.userId === sample.userId && s.minuteBucket === sample.minuteBucket
    );

    const record: ActivitySample = {
      ...sample,
      id: sample.id || `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      isSync: false, // Maintain isSync: false flag for local storage
    };

    if (existingIndex >= 0) {
      this.activityQueue[existingIndex] = { ...this.activityQueue[existingIndex], ...record, isSync: false };
    } else {
      this.activityQueue.push(record);
    }

    this.saveFile(this.activityQueuePath, this.activityQueue);
    console.log(`[LocalQueue] Activity sample enqueued (isSync: false) for ${sample.minuteBucket}. Total: ${this.activityQueue.length}`);
  }

  public getPendingActivitySamples(limit: number = 50): ActivitySample[] {
    return this.activityQueue.filter((s) => !s.isSync).slice(0, limit);
  }

  public markActivitySamplesSynced(syncedIds: string[]) {
    const idSet = new Set(syncedIds);
    for (const sample of this.activityQueue) {
      if (sample.id && idSet.has(sample.id)) {
        sample.isSync = true; // Flag flipped to isSync: true once synced
      }
    }

    // Prune synced samples older than 24 hours to prevent file bloat
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.activityQueue = this.activityQueue.filter((s) => {
      if (!s.isSync) return true; // keep all unsynced
      const ts = new Date(s.timestamp).getTime();
      return ts > cutoff;
    });

    this.saveFile(this.activityQueuePath, this.activityQueue);
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── OFFLINE TIME ENTRIES (isSync flag) ──
  // ══════════════════════════════════════════════════════════════════════

  public enqueueTimeEntry(entry: Omit<OfflineTimeEntry, 'isSync'> & { isSync?: boolean }) {
    const existingIndex = this.timeEntriesQueue.findIndex((e) => e.id === entry.id);

    const record: OfflineTimeEntry = {
      ...entry,
      isSync: Boolean(entry.isSync), // default false when offline
    };

    if (existingIndex >= 0) {
      this.timeEntriesQueue[existingIndex] = { ...this.timeEntriesQueue[existingIndex], ...record };
    } else {
      this.timeEntriesQueue.push(record);
    }

    this.saveFile(this.timeEntriesQueuePath, this.timeEntriesQueue);
    console.log(`[LocalQueue] TimeEntry queued (isSync: ${record.isSync}) for user: ${entry.userId}, duration: ${entry.durationSeconds}s`);
  }

  public getPendingTimeEntries(): OfflineTimeEntry[] {
    return this.timeEntriesQueue.filter((e) => !e.isSync);
  }

  public markTimeEntriesSynced(syncedIds: string[]) {
    const idSet = new Set(syncedIds);
    const now = new Date().toISOString();
    for (const entry of this.timeEntriesQueue) {
      if (idSet.has(entry.id)) {
        entry.isSync = true;
        entry.syncedAt = now;
      }
    }
    this.saveFile(this.timeEntriesQueuePath, this.timeEntriesQueue);
    console.log(`[LocalQueue] Marked ${syncedIds.length} time entries as synced (isSync: true)`);
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── OFFLINE SCREENSHOTS (isSync flag) ──
  // ══════════════════════════════════════════════════════════════════════

  public enqueueScreenshot(sc: Omit<OfflineScreenshot, 'isSync'> & { isSync?: boolean }) {
    const record: OfflineScreenshot = {
      ...sc,
      isSync: Boolean(sc.isSync),
    };
    this.screenshotQueue.push(record);
    this.saveFile(this.screenshotQueuePath, this.screenshotQueue);
    console.log(`[LocalQueue] Screenshot queued (isSync: ${record.isSync}) at ${sc.filePath}`);
  }

  public getPendingScreenshots(): OfflineScreenshot[] {
    return this.screenshotQueue.filter((s) => !s.isSync);
  }

  public markScreenshotSynced(id: string) {
    const item = this.screenshotQueue.find((s) => s.id === id);
    if (item) {
      item.isSync = true;
      try {
        if (fs.existsSync(item.filePath)) {
          fs.unlinkSync(item.filePath);
        }
      } catch (_) {}
    }
    // Remove synced items from screenshot queue
    this.screenshotQueue = this.screenshotQueue.filter((s) => !s.isSync);
    this.saveFile(this.screenshotQueuePath, this.screenshotQueue);
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── SUMMARY COUNTS & BACKWARD COMPAT ──
  // ══════════════════════════════════════════════════════════════════════

  public getPendingCounts() {
    const pendingActivity = this.activityQueue.filter((s) => !s.isSync).length;
    const pendingEntries = this.timeEntriesQueue.filter((e) => !e.isSync).length;
    const pendingScreenshots = this.screenshotQueue.filter((s) => !s.isSync).length;
    return {
      pendingActivity,
      pendingEntries,
      pendingScreenshots,
      totalPending: pendingActivity + pendingEntries + pendingScreenshots,
    };
  }

  // Backward compatibility methods for existing code
  public enqueue(sample: ActivitySample) {
    this.enqueueActivitySample(sample);
  }

  public getPendingSamples(limit: number = 50): ActivitySample[] {
    return this.getPendingActivitySamples(limit);
  }

  public removeSamples(idsToRemove: string[]) {
    this.markActivitySamplesSynced(idsToRemove);
  }

  public getCount(): number {
    return this.getPendingCounts().totalPending;
  }
}

export const localQueue = new LocalQueueService();
