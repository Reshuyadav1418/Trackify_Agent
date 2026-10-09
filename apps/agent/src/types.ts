export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
}

export interface Project {
  _id: string;
  name: string;
  clientName?: string;
  status: string;
}

export interface Task {
  _id: string;
  title: string;
  projectId?: string | { _id: string; name: string };
  status: string;
}

export interface Policy {
  version: number;
  screenshotIntervalMinutes: number;
  idleTimeoutMinutes: number;
  isBlurEnabled: boolean;
  retentionDays: number;
  consentText: string;
  isActive: boolean;
}

export interface DeviceInfo {
  deviceId: string;
  hostname: string;
  platform: string;
  arch: string;
  osRelease: string;
}

export interface ActivitySample {
  id?: string;
  userId: string;
  minuteBucket: string;
  keyboardCount: number;
  mouseCount: number;
  isIdle: boolean;
  timestamp: string;
  windowTitle?: string;
  isSync: boolean; // Flag to indicate if synced to server
}

export interface OfflineTimeEntry {
  id: string;
  userId: string;
  projectId?: string | null;
  taskId?: string | null;
  description?: string;
  start: string;
  end: string | null;
  durationSeconds: number; // Active work time
  breakSeconds: number; // Break time
  isSync: boolean; // Flag to indicate if synced to server
  createdAt: string;
  syncedAt?: string | null;
}

export interface OfflineScreenshot {
  id: string;
  filePath: string;
  capturedAt: string;
  activityScore: number;
  isBlurred: boolean;
  isSync: boolean; // Flag to indicate if synced to server
}

export interface IdlePromptData {
  idleMinutes: number;
  idleSeconds: number;
  startedAt: string;
}
