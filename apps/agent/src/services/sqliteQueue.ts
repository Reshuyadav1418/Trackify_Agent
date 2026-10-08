import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { ActivitySample } from '../types';

export class LocalQueueService {
  private queueFilePath: string;
  private queue: ActivitySample[] = [];

  constructor() {
    const userDataPath = app?.getPath ? app.getPath('userData') : process.cwd();
    this.queueFilePath = path.join(userDataPath, 'activity_queue.json');
    this.loadQueue();
  }

  private loadQueue() {
    try {
      if (fs.existsSync(this.queueFilePath)) {
        const raw = fs.readFileSync(this.queueFilePath, 'utf-8');
        this.queue = JSON.parse(raw) || [];
      } else {
        this.queue = [];
        this.saveQueue();
      }
    } catch (err) {
      console.error('[QueueService] Error loading queue file:', err);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      const dir = path.dirname(this.queueFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.queueFilePath, JSON.stringify(this.queue, null, 2), 'utf-8');
    } catch (err) {
      console.error('[QueueService] Error saving queue file:', err);
    }
  }

  public enqueue(sample: ActivitySample) {
    // Avoid duplicate minuteBucket for the same user
    const existingIndex = this.queue.findIndex(
      (s) => s.userId === sample.userId && s.minuteBucket === sample.minuteBucket
    );

    if (existingIndex >= 0) {
      this.queue[existingIndex] = { ...this.queue[existingIndex], ...sample };
    } else {
      this.queue.push({
        ...sample,
        id: sample.id || `sample_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      });
    }

    this.saveQueue();
    console.log(`[QueueService] Sample queued for bucket ${sample.minuteBucket}. Total pending: ${this.queue.length}`);
  }

  public getPendingSamples(limit: number = 50): ActivitySample[] {
    return this.queue.slice(0, limit);
  }

  public removeSamples(idsToRemove: string[]) {
    const removeSet = new Set(idsToRemove);
    this.queue = this.queue.filter((s) => !s.id || !removeSet.has(s.id));
    this.saveQueue();
  }

  public getCount(): number {
    return this.queue.length;
  }

  public clearAll() {
    this.queue = [];
    this.saveQueue();
  }
}

export const localQueue = new LocalQueueService();
