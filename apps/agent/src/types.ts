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
}

export interface IdlePromptData {
  idleMinutes: number;
  idleSeconds: number;
  startedAt: string;
}
