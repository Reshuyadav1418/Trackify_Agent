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
let currentSegmentStartTime: number | null = null;
let accumulatedWorkedSeconds = 0; // Total active work seconds accumulated today
let lastTrackedDate = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
let breakStartTime: number | null = null;
let totalBreakSecondsToday = 0;
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
    alwaysOnTop: true,
    title: 'Trackify Agent',
    icon: path.join(__dirname, '../icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setVisibleOnAllWorkspaces(true);

  mainWindow.loadFile(path.join(__dirname, '../index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  try {
    // Generate a simple 16x16 colored tray icon
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
    statusLabel = isOnBreak ? '🟡 Status: On Break (Paused)' : '🟢 Tracking: ON (Active)';
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
          handlePauseBreak();
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

function startTrackingSession(project: any, task: any) {
  checkNewDayReset();

  isTracking = true;
  isOnBreak = false;
  isAutoIdle = false;
  idleWarningActive = false;
  currentSegmentStartTime = Date.now();
  breakStartTime = null;
  activeProject = project;
  activeTask = task;

  // Keep app window directly in front of any active website or software window
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.setAlwaysOnTop(true, 'floating');
    mainWindow.focus();
  }

  inputTracker.start();
  syncService.startSyncLoop();
  updateTrayMenu();

  // Minute-level sample logger
  if (minuteTimer) clearInterval(minuteTimer);
  minuteTimer = setInterval(() => {
    if (!isOnBreak) {
      logMinuteSample();
    }
  }, 60000);

  // Schedule screenshot timer (initial fast check in 25-35s, then recurring)
  scheduleNextScreenshot(true);

  notifyStatusChange();
}

function handlePauseBreak() {
  if (!isTracking || isOnBreak) return;

  // Save elapsed seconds in current active segment to accumulatedWorkedSeconds
  if (currentSegmentStartTime) {
    const elapsedSec = Math.floor((Date.now() - currentSegmentStartTime) / 1000);
    accumulatedWorkedSeconds += Math.max(0, elapsedSec);
    currentSegmentStartTime = null;
  }

  isOnBreak = true;
  breakStartTime = Date.now();

  // Pause input tracking and screenshots while employee is on break
  inputTracker.stop();
  if (minuteTimer) {
    clearInterval(minuteTimer);
    minuteTimer = null;
  }
  if (screenshotTimer) {
    clearTimeout(screenshotTimer);
    screenshotTimer = null;
  }

  console.log(`[Main] Break started. Active work paused at: ${accumulatedWorkedSeconds}s`);
  updateTrayMenu();
  notifyStatusChange();
}

function handleResumeBreak() {
  if (!isTracking || !isOnBreak) return;

  if (breakStartTime) {
    totalBreakSecondsToday += Math.max(0, Math.floor((Date.now() - breakStartTime) / 1000));
    breakStartTime = null;
  }

  isOnBreak = false;
  currentSegmentStartTime = Date.now(); // Start new active segment continuing from accumulatedWorkedSeconds

  // Resume active activity collection and random screenshots
  inputTracker.start();
  if (minuteTimer) clearInterval(minuteTimer);
  minuteTimer = setInterval(() => {
    if (!isOnBreak) {
      logMinuteSample();
    }
  }, 60000);

  scheduleNextScreenshot();
  console.log(`[Main] Break ended. Resuming work directly from: ${accumulatedWorkedSeconds}s`);
  updateTrayMenu();
  notifyStatusChange();
}

function handleStopTracking(resetDaily = false) {
  if (isTracking && !isOnBreak && currentSegmentStartTime) {
    const elapsedSec = Math.floor((Date.now() - currentSegmentStartTime) / 1000);
    accumulatedWorkedSeconds += Math.max(0, elapsedSec);
  }
  if (isOnBreak && breakStartTime) {
    totalBreakSecondsToday += Math.max(0, Math.floor((Date.now() - breakStartTime) / 1000));
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

function logMinuteSample() {
  if (!isTracking || !activeUser) return;

  const metrics = inputTracker.getMinuteMetrics(10);
  const minuteBucket = new Date().toISOString().slice(0, 16);

  localQueue.enqueue({
    userId: activeUser._id || activeUser.id,
    minuteBucket,
    keyboardCount: metrics.keyboardCount,
    mouseCount: metrics.mouseCount,
    isIdle: metrics.isIdle,
    timestamp: new Date().toISOString(),
    windowTitle: 'Trackify Agent Workspace',
  });

  syncService.flushQueue();
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
        console.log(`[Main] ✅ Automatic screenshot captured & uploaded at ${timeStr}`);

        if (mainWindow) {
          mainWindow.webContents.send('screenshot:captured', {
            timestamp: timeStr,
          });
        }
        // Native OS notification alert removed per user preference
      } catch (err: any) {
        console.error('[Main] Random screenshot upload error:', err?.message || err);
      }
      scheduleNextScreenshot(false);
    }
  }, delayMs);
}

function notifyStatusChange() {
  if (mainWindow) {
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
      pendingQueueCount: localQueue.getCount(),
    });
  }
}

// ── IDLE MONITORING (10-second auto-idle, 5-second warning countdown, auto-resume on touch) ──
let idleWarningActive = false;
let isAutoIdle = false;
let totalIdleSecondsToday = 0;

function handleAutoIdleStop(idleSec: number) {
  // Save active work up to the moment user became inactive (idleSec seconds ago)
  if (isTracking && !isOnBreak && currentSegmentStartTime) {
    const elapsedSegment = Math.max(0, Math.floor((Date.now() - currentSegmentStartTime) / 1000));
    const activeWorkSec = Math.max(0, elapsedSegment - idleSec);
    accumulatedWorkedSeconds += activeWorkSec;
    currentSegmentStartTime = null;
  }

  isTracking = false;
  isOnBreak = false;

  inputTracker.stop();
  if (minuteTimer) {
    clearInterval(minuteTimer);
    minuteTimer = null;
  }
  if (screenshotTimer) {
    clearTimeout(screenshotTimer);
    screenshotTimer = null;
  }

  console.log(`[Main] Auto-idle entered (inactivity: ${idleSec}s). Timer paused. Active work banked: ${accumulatedWorkedSeconds}s, Total idle today: ${totalIdleSecondsToday}s`);
  updateTrayMenu();
  notifyStatusChange();
}

function autoResumeFromIdle() {
  if (!isAutoIdle) return;
  console.log(`[Main] User interaction detected! Auto-resuming timer. Banked work: ${accumulatedWorkedSeconds}s`);
  isAutoIdle = false;
  idleWarningActive = false;
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(true, 'floating');
    mainWindow.webContents.send('idle:warningDismissed');
  }
  startTrackingSession(activeProject, activeTask);
}

function setupPowerMonitor() {
  // Poll system-wide idle every 1 second
  setInterval(() => {
    if (isTracking && !isOnBreak) {
      const idleSec = powerMonitor.getSystemIdleTime();
      // Standard idle threshold from policy or default 3 minutes (180s)
      const idleThreshold = activePolicy?.idleThresholdSeconds || 180;

      if (idleSec >= idleThreshold) {
        if (!isAutoIdle) {
          isAutoIdle = true;
          idleWarningActive = false;
          totalIdleSecondsToday += idleSec;

          // Keep window visible on top showing idle pause
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.setAlwaysOnTop(true, 'floating');
          }

          handleAutoIdleStop(idleSec);
        }
      }
    } else if (isAutoIdle) {
      // ── CURRENTLY IN AUTO-IDLE STATE ──
      const idleSec = powerMonitor.getSystemIdleTime();

      // If user touches touchpad, mouse, or keyboard anywhere in Windows:
      if (idleSec < 2) {
        autoResumeFromIdle();
      } else {
        // User still away: increment idle count each second
        totalIdleSecondsToday += 1;
        notifyStatusChange();
      }
    }
  }, 1000);

  // Sleep & Lock screen handlers
  powerMonitor.on('suspend', () => {
    console.log('[PowerMonitor] System suspend/sleep detected. Pausing tracker...');
    if (isTracking) handleStopTracking(false);
  });

  powerMonitor.on('resume', () => {
    console.log('[PowerMonitor] System resume detected.');
  });

  powerMonitor.on('lock-screen', () => {
    console.log('[PowerMonitor] Screen lock detected. Pausing tracker...');
    if (isTracking) handleStopTracking(false);
  });

  powerMonitor.on('unlock-screen', () => {
    console.log('[PowerMonitor] Screen unlock detected.');
  });
}

function registerIpcHandlers() {
  // Auth & Devices
  ipcMain.handle('auth:login', async (_event, { email, password }) => {
    // Reset previous session for a clean login
    handleStopTracking(true);

    const res = await apiClient.login(email, password);
    activeUser = res.user;

    // Set today's date
    lastTrackedDate = new Date().toISOString().slice(0, 10);

    // Try to restore today's already recorded work time for this user from server
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

    try {
      const policyRes = await apiClient.getActivePolicy();
      activePolicy = policyRes.policy;
      if (activePolicy?.version) {
        try {
          await apiClient.acceptConsent(activePolicy.version);
        } catch (_) {}
      }
    } catch (e) {
      activePolicy = { version: 1, screenshotIntervalMinutes: 5, isBlurEnabled: false };
    }

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
    const res = await apiClient.getProjects();
    return res.projects || [];
  });

  ipcMain.handle('tasks:get', async () => {
    const res = await apiClient.getTasks();
    return res.tasks || [];
  });

  // Timer & Idle & Break
  ipcMain.handle('timer:start', async (_event, { projectId, taskId }) => {
    try {
      if (projectId && taskId) {
        const res = await apiClient.startTimer(projectId, taskId);
        startTrackingSession(res.timeEntry?.projectId, res.timeEntry?.taskId);
        return res;
      } else {
        // Start local tracking
        startTrackingSession(null, null);
        return { success: true, message: 'Local tracking started' };
      }
    } catch (err: any) {
      console.warn('[Main] API timer start error, fallback to local tracking:', err?.message);
      startTrackingSession(null, null);
      return { success: true, message: 'Local tracking started' };
    }
  });

  ipcMain.handle('timer:pauseBreak', () => {
    handlePauseBreak();
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
    try {
      await apiClient.stopTimer();
    } catch (err: any) {
      console.warn('[Main] Server stopTimer error (safe to ignore for local session):', err?.message);
    }
    handleStopTracking(false);
    return { success: true, message: 'Tracking stopped' };
  });

  ipcMain.handle('timer:status', () => {
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
      pendingQueueCount: localQueue.getCount(),
    };
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
    if (isAutoIdle) {
      autoResumeFromIdle();
    }
    return { success: true };
  });

  ipcMain.handle('idle:respond', (_event, action) => {
    isAutoIdle = false;
    idleWarningActive = false;

    if (action === 'keep' || action === 'discard') {
      startTrackingSession(activeProject, activeTask);
    } else if (action === 'stay_stopped') {
      handleStopTracking(false);
    }
    return { success: true };
  });

  // Queue & Screenshot
  ipcMain.handle('queue:count', () => localQueue.getCount());

  ipcMain.handle('queue:flush', async () => {
    return await syncService.flushQueue();
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

  ipcMain.handle('window:toggleAlwaysOnTop', () => {
    if (!mainWindow) return false;
    const current = mainWindow.isAlwaysOnTop();
    const next = !current;
    mainWindow.setAlwaysOnTop(next, 'floating');
    return next;
  });

  ipcMain.handle('window:isAlwaysOnTop', () => {
    return mainWindow ? mainWindow.isAlwaysOnTop() : false;
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupPowerMonitor();
  registerIpcHandlers();

  // Check for updates
  try {
    autoUpdater.checkForUpdatesAndNotify();
  } catch (e) {
    // Ignore update check in dev mode
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
