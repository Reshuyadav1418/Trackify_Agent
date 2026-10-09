import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('trackifyApi', {
  // Auth & Device
  login: (credentials: { email: string; password: string }) => ipcRenderer.invoke('auth:login', credentials),
  registerDevice: () => ipcRenderer.invoke('device:register'),
  getPermissions: () => ipcRenderer.invoke('platform:permissions'),

  // Projects & Tasks
  getProjects: () => ipcRenderer.invoke('projects:get'),
  getTasks: () => ipcRenderer.invoke('tasks:get'),

  // Timer & Idle & Break
  startTimer: (params: { projectId: string | null; taskId: string | null }) => ipcRenderer.invoke('timer:start', params),
  stopTimer: () => ipcRenderer.invoke('timer:stop'),
  pauseBreak: () => ipcRenderer.invoke('timer:pauseBreak'),
  resumeBreak: () => ipcRenderer.invoke('timer:resumeBreak'),
  resetDailyTimer: () => ipcRenderer.invoke('timer:resetDaily'),
  getTimerStatus: () => ipcRenderer.invoke('timer:status'),
  respondIdle: (action: 'keep' | 'discard' | 'stay_stopped') => ipcRenderer.invoke('idle:respond', action),
  dismissIdleWarning: () => ipcRenderer.invoke('idle:dismissWarning'),
  userActivityDetected: () => ipcRenderer.invoke('idle:userActivity'),
  openExternalUrl: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // Queue & Sync & Screenshot
  getQueueCount: () => ipcRenderer.invoke('queue:count'),
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  flushQueue: () => ipcRenderer.invoke('queue:flush'),
  captureScreenshotNow: () => ipcRenderer.invoke('screenshot:captureNow'),

  // IPC Event Listeners from Main Process
  onTimerStatusChange: (callback: (status: any) => void) => {
    ipcRenderer.on('timer:statusChange', (_event, status) => callback(status));
  },
  onSyncStatusChange: (callback: (status: any) => void) => {
    ipcRenderer.on('sync:statusChange', (_event, status) => callback(status));
  },
  onIdleWarning: (callback: (data: { remainingSeconds: number; idleSeconds: number; timeoutMinutes: number }) => void) => {
    ipcRenderer.on('idle:warning', (_event, data) => callback(data));
  },
  onIdleWarningDismissed: (callback: () => void) => {
    ipcRenderer.on('idle:warningDismissed', () => callback());
  },
  onIdleDetected: (callback: (data: any) => void) => {
    ipcRenderer.on('idle:detected', (_event, data) => callback(data));
  },
  onUserReturned: (callback: () => void) => {
    ipcRenderer.on('idle:userReturned', () => callback());
  },
  onPolicyUpdate: (callback: (policy: any) => void) => {
    ipcRenderer.on('policy:update', (_event, policy) => callback(policy));
  },
  onScreenshotCaptured: (callback: (data: { timestamp: string }) => void) => {
    ipcRenderer.on('screenshot:captured', (_event, data) => callback(data));
  },
});
