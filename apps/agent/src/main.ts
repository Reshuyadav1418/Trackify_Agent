import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, powerMonitor, Notification } from 'electron';
import * as path from 'path';
import { autoUpdater } from 'electron-updater';
import { apiClient } from './services/apiClient';
import { localQueue } from './services/sqliteQueue';
import { inputTracker } from './services/inputTracker';
import { screenshotService } from './services/screenshotService';
import { syncService } from './services/syncService';
import { PlatformPermissions } from './platform/permissions';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Tracking state & daily cumulative worked time
let isTracking = false;
let isOnBreak = false;
let isAutoIdle = false;
let idleWarningActive = false;

let currentSegmentStartTime: number | null = null;
let accumulatedWorkedSeconds = 0; // Total active work seconds accumulated today (excluding breaks & idle)
let lastTrackedDate = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
let breakStartTime: number | null = null;
let totalBreakSecondsToday = 0;
let totalIdleSecondsToday = 0;

let currentSessionId: string | null = null;
let currentSessionStartIso: string | null = null;

let activeProject: any = null;
let activeTask: any = null;
let activeUser: any = null;
let activePolicy: any = null;

// Timer interval references
let minuteTimer: NodeJS.Timeout | null = null;
let screenshotTimer: NodeJS.Timeout | null = null;

function checkNewDayReset() {
  const today = new Date().toISOString().slice(0, 10);
  if (lastTrackedDate !== today) {
    console.log(`[Main] New day detected (${today} vs ${lastTrackedDate}). Resetting daily timer.`);
    accumulatedWorkedSeconds = 0;
    totalBreakSecondsToday = 0;
    totalIdleSecondsToday = 0;
    lastTrackedDate = today;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 640,
    minWidth: 420,
    minHeight: 560,
    maxWidth: 580,
    resizable: true,
    autoHideMenuBar: true,
    title: 'Trackify Agent',
    icon: path.join(__dirname, '../icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  try {
    const icon = nativeImage.createFromNamedImage('NSImageNameStatusAvailable', [16, 16]);
    tray = new Tray(icon);
    tray.setToolTip('Trackify Agent');
    updateTrayMenu();
  } catch (err) {
    console.warn('[Main] Tray creation fallback:', err);
  }
}

function updateTrayMenu() {
  if (!tray) return;

  let statusLabel = '🔴 Tracking: OFF';
  if (isTracking) {
    if (isOnBreak) {
      statusLabel = isAutoIdle ? '💤 Status: Auto-Break (Idle)' : '☕ Status: On Break (Paused)';
    } else {
      statusLabel = '🟢 Tracking: ON (Active)';
    }
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Trackify Agent', enabled: false },
    { type: 'separator' },
    {
      label: statusLabel,
      enabled: false,
    },
    {
      label: 'Open App Window',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    {
      label: !isTracking ? 'Start Tracking' : (isOnBreak ? 'Resume Work' : 'Take a Break'),
      click: () => {
        if (!isTracking) {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        } else if (isOnBreak) {
          handleResumeBreak();
        } else {
          handlePauseBreak(false);
        }
      },
    },
    {
      label: 'Stop Tracking',
      enabled: isTracking,
      click: () => {
        handleStopTracking(false);
      },
    },
    {
      label: '📸 Take Screenshot Now',
      click: async () => {
        try {
          const isBlur = Boolean(activePolicy?.isBlurEnabled);
          await screenshotService.captureAndUpload(isBlur);
          const timeStr = new Date().toLocaleTimeString();
          console.log(`[Tray] 📸 Screenshot captured on demand at ${timeStr}`);
          if (mainWindow) {
            mainWindow.webContents.send('screenshot:captured', {
              timestamp: timeStr,
            });
          }
          if (Notification.isSupported()) {
            new Notification({
              title: 'Trackify - Screenshot Captured',
              body: `Captured desktop screen at ${timeStr}`,
            }).show();
          }
        } catch (err: any) {
          console.error('[Tray] Screenshot capture error:', err?.message || err);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        handleStopTracking(false);
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// ══════════════════════════════════════════════════════════════════════
// ── TRACKING SESSION MANAGEMENT ──
// ══════════════════════════════════════════════════════════════════════

function startTrackingSession(project: any, task: any, serverEntryId?: string) {
  checkNewDayReset();

  isTracking = true;
  isOnBreak = false;
  isAutoIdle = false;
  idleWarningActive = false;

  currentSegmentStartTime = Date.now();
  currentSessionStartIso = new Date().toISOString();
  currentSessionId = serverEntryId || `entry_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  breakStartTime = null;
  activeProject = project;
  activeTask = task;

  inputTracker.start();
  syncService.startSyncLoop();
  updateTrayMenu();

  // Minute-level activity sample logger
  if (minuteTimer) clearInterval(minuteTimer);
  minuteTimer = setInterval(() => {
    if (!isOnBreak) {
      logMinuteSample();
    }
  }, 60000);

  // Schedule screenshot timer
  scheduleNextScreenshot(true);

  notifyStatusChange();
}

/**
 * Pause / Break Logic:
 * When user takes a break (or auto-break applies due to inactivity):
 * - Pause the tracker
 * - No data is recorded in the break period (no activity samples, no screenshots)
 */
function handlePauseBreak(isAuto: boolean = false) {
  if (!isTracking || isOnBreak) return;

  const now = Date.now();
  if (currentSegmentStartTime) {
    const elapsedSec = Math.max(0, Math.floor((now - currentSegmentStartTime) / 1000));
    if (isAuto) {
      // Inactivity timeout: 10 seconds deducted upon entering idle auto-break
      const timeoutSec = 10;
      const activeWorkSec = Math.max(0, elapsedSec - timeoutSec);
      accumulatedWorkedSeconds += activeWorkSec;
      totalIdleSecondsToday += timeoutSec;
      console.log(`[Main] Auto-Break applied (10s inactivity). Deducted: ${timeoutSec}s. Banked active work: ${accumulatedWorkedSeconds}s`);
    } else {
      accumulatedWorkedSeconds += elapsedSec;
      console.log(`[Main] Manual break taken. Banked active work: ${accumulatedWorkedSeconds}s`);
    }
    currentSegmentStartTime = null;
  }

  isOnBreak = true;
  isAutoIdle = isAuto;
  breakStartTime = now;

  // NO DATA RECORDED IN BREAK PERIOD: Stop input tracker, minute samples, and screenshots
  inputTracker.stop();
  if (minuteTimer) {
    clearInterval(minuteTimer);
    minuteTimer = null;
  }
  if (screenshotTimer) {
    clearTimeout(screenshotTimer);
    screenshotTimer = null;
  }

  updateTrayMenu();
  notifyStatusChange();
}

/**
 * Resume Break Logic:
 * When user resumes work after break:
 * - Accumulate break seconds to totalBreakSecondsToday
 * - Resume active work timer from accumulatedWorkedSeconds
 * - Resume activity logging and screenshot scheduling
 */
function handleResumeBreak() {
  if (!isTracking || !isOnBreak) return;

  if (breakStartTime) {
    const breakDuration = Math.max(0, Math.floor((Date.now() - breakStartTime) / 1000));
    totalBreakSecondsToday += breakDuration;
    breakStartTime = null;
  }

  isOnBreak = false;
  isAutoIdle = false;
  idleWarningActive = false;
  currentSegmentStartTime = Date.now();

  // Resume active activity collection and random screenshots
  inputTracker.start();
  if (minuteTimer) clearInterval(minuteTimer);
  minuteTimer = setInterval(() => {
    if (!isOnBreak) {
      logMinuteSample();
    }
  }, 60000);

  scheduleNextScreenshot(false);
  console.log(`[Main] Break ended. Resuming active work directly from: ${accumulatedWorkedSeconds}s`);
  updateTrayMenu();
  notifyStatusChange();
}

/**
 * Stop Tracking Logic:
 * Persists session data. If offline, stores locally with isSync: false.
 */
async function handleStopTracking(resetDaily = false) {
  const now = Date.now();
  let sessionActiveSeconds = accumulatedWorkedSeconds;

  if (isTracking && !isOnBreak && currentSegmentStartTime) {
    const elapsedSec = Math.max(0, Math.floor((now - currentSegmentStartTime) / 1000));
    accumulatedWorkedSeconds += elapsedSec;
    sessionActiveSeconds = accumulatedWorkedSeconds;
  }

  let sessionBreakSeconds = totalBreakSecondsToday;
  if (isOnBreak && breakStartTime) {
    const breakSec = Math.max(0, Math.floor((now - breakStartTime) / 1000));
    totalBreakSecondsToday += breakSec;
    sessionBreakSeconds = totalBreakSecondsToday;
  }

  // Save the work session entry
  if (isTracking && activeUser && currentSessionId) {
    const startIso = currentSessionStartIso || new Date(now - sessionActiveSeconds * 1000).toISOString();
    const endIso = new Date().toISOString();
    const entryId = currentSessionId;
    const pId = activeProject?._id || activeProject?.id || null;
    const tId = activeTask?._id || activeTask?.id || null;

    console.log(`[Main] Saving time entry: ${sessionActiveSeconds}s active, ${sessionBreakSeconds}s break...`);

    // Try stopping server timer online
    let synced = false;
    try {
      await apiClient.stopTimer(entryId, sessionActiveSeconds, sessionBreakSeconds);
      synced = true;
      console.log('[Main] Server timer stopped and confirmed successfully.');
    } catch (err: any) {
      console.warn('[Main] Server stopTimer offline / failed, queuing locally (isSync: false):', err?.message);
    }

    // Always record locally with appropriate isSync flag
    localQueue.enqueueTimeEntry({
      id: entryId,
      userId: activeUser._id || activeUser.id,
      projectId: pId,
      taskId: tId,
      description: activeTask?.title || activeProject?.name || '',
      start: startIso,
      end: endIso,
      durationSeconds: sessionActiveSeconds,
      breakSeconds: sessionBreakSeconds,
      isSync: synced, // isSync: true if online call succeeded, false if offline
      createdAt: new Date().toISOString(),
      syncedAt: synced ? new Date().toISOString() : null,
    });
  }

  if (resetDaily) {
    accumulatedWorkedSeconds = 0;
    totalBreakSecondsToday = 0;
    totalIdleSecondsToday = 0;
  }

  isTracking = false;
  isOnBreak = false;
  isAutoIdle = false;
  idleWarningActive = false;
  currentSegmentStartTime = null;
  breakStartTime = null;
  currentSessionId = null;
  currentSessionStartIso = null;

  inputTracker.stop();
  if (minuteTimer) {
    clearInterval(minuteTimer);
    minuteTimer = null;
  }
  if (screenshotTimer) {
    clearTimeout(screenshotTimer);
    screenshotTimer = null;
  }

  updateTrayMenu();
  notifyStatusChange();

  // Trigger flush attempt in case network is available
  syncService.flushAll().catch(() => {});
}

function logMinuteSample() {
  if (!isTracking || isOnBreak || !activeUser) return;

  const timeoutSec = 10;
  const metrics = inputTracker.getMinuteMetrics(timeoutSec);
  const minuteBucket = new Date().toISOString().slice(0, 16);

  localQueue.enqueueActivitySample({
    userId: activeUser._id || activeUser.id,
    minuteBucket,
    keyboardCount: metrics.keyboardCount,
    mouseCount: metrics.mouseCount,
    isIdle: metrics.isIdle,
    timestamp: new Date().toISOString(),
    windowTitle: 'Trackify Agent Workspace',
    isSync: false, // Flag maintained as isSync: false until synced
  });

  syncService.flushAll().catch(() => {});
  notifyStatusChange();
}

function scheduleNextScreenshot(isInitial = false) {
  if (screenshotTimer) clearTimeout(screenshotTimer);
  if (!isTracking) return;

  const intervalMin = activePolicy?.screenshotIntervalMinutes || 5;
  // If first start, take initial verification screenshot in 25-35s; otherwise within policy interval
  const delayMs = isInitial
    ? (Math.floor(Math.random() * 10) + 25) * 1000
    : (Math.floor(Math.random() * (intervalMin * 60 - 30)) + 30) * 1000;

  console.log(`[Main] Next screenshot scheduled in ${Math.round(delayMs / 1000)} seconds (interval: ${intervalMin}m, isInitial: ${isInitial}).`);

  screenshotTimer = setTimeout(async () => {
    if (isTracking && !isOnBreak) {
      try {
        const isBlur = Boolean(activePolicy?.isBlurEnabled);
        await screenshotService.captureAndUpload(isBlur);
        const timeStr = new Date().toLocaleTimeString();
        console.log(`[Main] 📸 Screenshot captured at ${timeStr}`);

        if (mainWindow) {
          mainWindow.webContents.send('screenshot:captured', {
            timestamp: timeStr,
          });
        }
      } catch (err: any) {
        console.warn('[Main] Screenshot capture notice:', err?.message || err);
      }
      scheduleNextScreenshot(false);
    }
  }, delayMs);
}

function notifyStatusChange() {
  if (mainWindow) {
    const counts = localQueue.getPendingCounts();
    mainWindow.webContents.send('timer:statusChange', {
      isTracking,
      isOnBreak,
      isAutoIdle,
      currentSegmentStartTime,
      accumulatedWorkedSeconds,
      breakStartTime,
      totalBreakSecondsToday,
      totalIdleSecondsToday,
      activeProject,
      activeTask,
      activePolicy,
      pendingQueueCount: counts.totalPending,
      pendingActivityCount: counts.pendingActivity,
      pendingEntriesCount: counts.pendingEntries,
      pendingScreenshotsCount: counts.pendingScreenshots,
      isOnline: syncService.getStatus().isOnline,
    });
  }
}

// ══════════════════════════════════════════════════════════════════════
// ── IDLE MONITORING (Configurable timeout, Auto-Break applied) ──
// ══════════════════════════════════════════════════════════════════════

function setupPowerMonitor() {
  // Poll system idle time every 1 second
  setInterval(() => {
    // Idle limit configured to 10 seconds; countdown warning begins at 5 seconds
    const idleTimeoutSec = 10;
    const warningThresholdSec = 5;

    if (isTracking && !isOnBreak) {
      const idleSec = powerMonitor.getSystemIdleTime();

      if (idleSec >= idleTimeoutSec) {
        // ── 10 SECONDS INACTIVITY REACHED: Apply Auto-Break, Pause Work Timer ──
        console.log(`[Main] User inactive for ${idleSec}s (threshold: ${idleTimeoutSec}s). Applying Auto-Break.`);
        idleWarningActive = false;

        if (mainWindow) {
          mainWindow.setAlwaysOnTop(false);
          mainWindow.webContents.send('idle:warningDismissed');
        }

        handlePauseBreak(true); // isAuto = true

        if (Notification.isSupported()) {
          new Notification({
            title: 'Trackify Agent - Auto Break',
            body: 'Inactive for 10 seconds. Work timer paused automatically.',
            silent: false,
          }).show();
        }

      } else if (idleSec >= warningThresholdSec) {
        // ── 5-SECOND WARNING COUNTDOWN: Notify user on screen ──
        idleWarningActive = true;
        const remainingSeconds = Math.max(1, idleTimeoutSec - idleSec);

        if (mainWindow) {
          if (!mainWindow.isVisible()) {
            mainWindow.show();
          }
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
          mainWindow.focus();

          mainWindow.webContents.send('idle:warning', {
            remainingSeconds,
            idleSeconds: idleSec,
            timeoutSeconds: idleTimeoutSec,
          });
        }
      } else {
        // Active work interaction (idleSec < 5s): User is active, dismiss countdown warning
        if (idleWarningActive) {
          idleWarningActive = false;
          if (mainWindow) {
            mainWindow.setAlwaysOnTop(false);
            mainWindow.webContents.send('idle:warningDismissed');
          }
        }
      }
    } else if (isAutoIdle && isOnBreak) {
      // User is currently paused on auto-break: if they touch mouse or keyboard, resume automatically
      const idleSec = powerMonitor.getSystemIdleTime();
      if (idleSec < 2) {
        console.log(`[Main] User activity detected after auto-break (${idleSec}s idle). Resuming tracking as normal.`);
        handleResumeBreak();
      }
    } else {
      if (idleWarningActive) {
        idleWarningActive = false;
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(false);
          mainWindow.webContents.send('idle:warningDismissed');
        }
      }
    }
  }, 1000);

  // System sleep & lock listeners
  powerMonitor.on('suspend', () => {
    console.log('[PowerMonitor] System suspend/sleep detected. Pausing tracker...');
    if (isTracking && !isOnBreak) handlePauseBreak(true);
  });

  powerMonitor.on('lock-screen', () => {
    console.log('[PowerMonitor] Screen lock detected. Pausing tracker...');
    if (isTracking && !isOnBreak) handlePauseBreak(true);
  });
}

// ══════════════════════════════════════════════════════════════════════
// ── IPC HANDLERS ──
// ══════════════════════════════════════════════════════════════════════

function registerIpcHandlers() {
  // Sync status listener
  syncService.onStatusChange((status) => {
    if (mainWindow) {
      mainWindow.webContents.send('sync:statusChange', status);
    }
  });

  // Auth & Login
  ipcMain.handle('auth:login', async (_event, { email, password }) => {
    await handleStopTracking(true);

    const res = await apiClient.login(email, password);
    activeUser = res.user;
    lastTrackedDate = new Date().toISOString().slice(0, 10);

    // Sync active policy (with idleTimeoutMinutes)
    try {
      const policyRes = await apiClient.getActivePolicy();
      activePolicy = policyRes.policy;
      if (activePolicy?.version) {
        try { await apiClient.acceptConsent(activePolicy.version); } catch (_) {}
      }
    } catch (_) {
      activePolicy = { version: 1, screenshotIntervalMinutes: 5, idleTimeoutMinutes: 5, isBlurEnabled: false };
    }

    // Restore today's recorded work time from server
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const entriesRes = await apiClient.getTimeEntries(todayStart.toISOString());
      if (entriesRes && Array.isArray(entriesRes.timeEntries)) {
        const sumSec = entriesRes.timeEntries.reduce((acc: number, e: any) => acc + (e.durationSeconds || 0), 0);
        accumulatedWorkedSeconds = sumSec;
        console.log(`[Main] Restored ${sumSec} seconds of work recorded today for ${res.user.email}`);
      }
    } catch (_) {}

    notifyStatusChange();
    return res;
  });

  ipcMain.handle('device:register', async () => {
    return await apiClient.registerDevice();
  });

  ipcMain.handle('platform:permissions', () => {
    return PlatformPermissions.checkPermissions();
  });

  // Projects & Tasks
  ipcMain.handle('projects:get', async () => {
    try {
      const res = await apiClient.getProjects();
      return res.projects || [];
    } catch (_) {
      return [];
    }
  });

  ipcMain.handle('tasks:get', async () => {
    try {
      const res = await apiClient.getTasks();
      return res.tasks || [];
    } catch (_) {
      return [];
    }
  });

  // Timer & Idle & Break
  ipcMain.handle('timer:start', async (_event, { projectId, taskId }) => {
    let serverEntryId: string | undefined;
    try {
      if (projectId && taskId) {
        const res = await apiClient.startTimer(projectId, taskId);
        serverEntryId = res.timeEntry?._id;
      }
    } catch (err: any) {
      console.warn('[Main] Server timer start offline / error, starting local session:', err?.message);
    }
    startTrackingSession(projectId, taskId, serverEntryId);
    return { success: true };
  });

  ipcMain.handle('timer:pauseBreak', () => {
    handlePauseBreak(false);
    return { success: true, isOnBreak: true };
  });

  ipcMain.handle('timer:resumeBreak', () => {
    handleResumeBreak();
    return { success: true, isOnBreak: false };
  });

  ipcMain.handle('timer:resetDaily', () => {
    accumulatedWorkedSeconds = 0;
    totalBreakSecondsToday = 0;
    totalIdleSecondsToday = 0;
    if (isTracking && !isOnBreak) {
      currentSegmentStartTime = Date.now();
    }
    notifyStatusChange();
    return { success: true };
  });

  ipcMain.handle('timer:stop', async () => {
    await handleStopTracking(false);
    return { success: true, message: 'Tracking stopped' };
  });

  ipcMain.handle('timer:status', () => {
    const counts = localQueue.getPendingCounts();
    return {
      isTracking,
      isOnBreak,
      isAutoIdle,
      currentSegmentStartTime,
      accumulatedWorkedSeconds,
      breakStartTime,
      totalBreakSecondsToday,
      totalIdleSecondsToday,
      activeProject,
      activeTask,
      activeUser,
      activePolicy,
      pendingQueueCount: counts.totalPending,
      pendingActivityCount: counts.pendingActivity,
      pendingEntriesCount: counts.pendingEntries,
      pendingScreenshotsCount: counts.pendingScreenshots,
      isOnline: syncService.getStatus().isOnline,
    };
  });

  ipcMain.handle('sync:status', () => {
    return syncService.getStatus();
  });

  ipcMain.handle('idle:dismissWarning', () => {
    idleWarningActive = false;
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(false);
      mainWindow.webContents.send('idle:warningDismissed');
    }
    return { success: true };
  });

  ipcMain.handle('idle:userActivity', () => {
    if (idleWarningActive) {
      idleWarningActive = false;
      if (mainWindow) {
        mainWindow.setAlwaysOnTop(false);
        mainWindow.webContents.send('idle:warningDismissed');
      }
    }
    if (isAutoIdle && isOnBreak) {
      console.log('[Main] User interacted with app during auto-idle. Resuming tracking as normal.');
      handleResumeBreak();
    }
    return { success: true };
  });

  ipcMain.handle('idle:respond', (_event, action) => {
    if (action === 'keep' || action === 'discard') {
      handleResumeBreak();
    } else if (action === 'stay_stopped') {
      handleStopTracking(false);
    }
    return { success: true };
  });

  // Queue & Screenshot
  ipcMain.handle('queue:count', () => localQueue.getCount());

  ipcMain.handle('queue:flush', async () => {
    return await syncService.flushAll();
  });

  ipcMain.handle('screenshot:captureNow', async () => {
    const isBlur = Boolean(activePolicy?.isBlurEnabled);
    const result = await screenshotService.captureAndUpload(isBlur);
    if (mainWindow) {
      mainWindow.webContents.send('screenshot:captured', {
        timestamp: new Date().toLocaleTimeString(),
      });
    }
    return result;
  });

  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    const { shell } = require('electron');
    return await shell.openExternal(url);
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupPowerMonitor();
  registerIpcHandlers();

  try {
    autoUpdater.checkForUpdatesAndNotify();
  } catch (_) {}

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
