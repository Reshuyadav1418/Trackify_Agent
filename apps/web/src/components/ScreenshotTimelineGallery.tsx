import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  getScreenshotsApi,
  deleteScreenshotApi,
  getTimeEntriesApi,
  deleteTimeEntryApi,
  updateTimeEntryNotesApi,
  getUsersApi,
} from '../api/services';
import { LoadingSpinner } from './LoadingSpinner';
import {
  RotateCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  X,
  Maximize2,
  Clock,
  Activity as ActivityIcon,
  Laptop,
  Calendar,
  Briefcase,
  CheckSquare,
  Globe,
  Edit3,
  Camera,
  Layers,
  Table as TableIcon,
  ExternalLink,
} from 'lucide-react';

interface Props {
  forcedUserId?: string; // If specified, locks employee to this user
}

export const ScreenshotTimelineGallery: React.FC<Props> = ({ forcedUserId }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  // Filters state
  const [selectedUser, setSelectedUser] = useState<string>(
    forcedUserId || (isManagerOrAdmin ? 'all' : user?.id || 'all')
  );
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [dayReset, setDayReset] = useState<string>('04:00');
  const [timezone, setTimezone] = useState<string>('GMT+0530');
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

  // Modal states
  const [activeZoomScreenshot, setActiveZoomScreenshot] = useState<any | null>(null);
  const [activeScreenshotList, setActiveScreenshotList] = useState<any[]>([]);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [screenshotToDelete, setScreenshotToDelete] = useState<string | null>(null);
  const [editingNotesSession, setEditingNotesSession] = useState<{ id: string; notes: string } | null>(null);

  // Quick date steppers
  const handlePrevDay = () => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  // Compute 24-hour cycle boundaries from selectedDate + dayReset
  const { startDateISO, endDateISO, displayRangeText } = useMemo(() => {
    const [resetHour, resetMin] = dayReset.split(':').map(Number);
    const start = new Date(`${selectedDate}T00:00:00`);
    start.setHours(resetHour, resetMin, 0, 0);

    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1000); // 23h 59m 59s later

    const fmt = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      let h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      const ampm = h >= 12 ? 'pm' : 'am';
      h = h % 12;
      h = h ? h : 12;
      const hh = String(h).padStart(2, '0');
      return `${day} ${month} ${year}, ${hh}:${m} ${ampm}`;
    };

    return {
      startDateISO: start.toISOString(),
      endDateISO: end.toISOString(),
      displayRangeText: `${fmt(start)} to ${fmt(end)}`,
    };
  }, [selectedDate, dayReset]);

  // Queries
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsersApi,
    enabled: isManagerOrAdmin && !forcedUserId,
  });

  const queryParams = useMemo(() => ({
    userId: selectedUser !== 'all' ? selectedUser : undefined,
    startDate: startDateISO,
    endDate: endDateISO,
  }), [selectedUser, startDateISO, endDateISO]);

  const {
    data: screenshotsData,
    isLoading: isScreenshotsLoading,
    refetch: refetchScreenshots,
    isFetching: isFetchingScreenshots,
  } = useQuery({
    queryKey: ['screenshots', queryParams],
    queryFn: () => getScreenshotsApi(queryParams),
  });

  const {
    data: timeEntriesData,
    isLoading: isEntriesLoading,
    refetch: refetchEntries,
  } = useQuery({
    queryKey: ['timeEntries', queryParams],
    queryFn: () => getTimeEntriesApi(queryParams),
  });

  // Mutations
  const deleteScreenshotMutation = useMutation({
    mutationFn: (id: string) => deleteScreenshotApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screenshots'] });
      setScreenshotToDelete(null);
      if (activeZoomScreenshot?._id === screenshotToDelete) {
        setActiveZoomScreenshot(null);
      }
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => deleteTimeEntryApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['screenshots'] });
      setSessionToDelete(null);
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => updateTimeEntryNotesApi(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      setEditingNotesSession(null);
    },
  });

  const users = usersData?.users || [];
  const screenshots: any[] = screenshotsData?.screenshots || [];
  const timeEntries: any[] = timeEntriesData?.timeEntries || [];

  // Group screenshots into sessions
  const sessions = useMemo(() => {
    // Map entries to sessions
    const sessionMap = new Map<string, {
      id: string;
      entry: any;
      screenshots: any[];
      start: Date;
      end: Date;
      project: string;
      task: string;
      employee: string;
      ipAddress: string;
      notes: string;
    }>();

    timeEntries.forEach((entry: any) => {
      const sDate = new Date(entry.start);
      const eDate = entry.end ? new Date(entry.end) : new Date(sDate.getTime() + (entry.durationSeconds || 0) * 1000);
      sessionMap.set(String(entry._id), {
        id: String(entry._id),
        entry,
        screenshots: [],
        start: sDate,
        end: eDate,
        project: entry.projectId?.name || 'Default Project',
        task: entry.taskId?.name || 'Default Task',
        employee: entry.userId?.name || user?.name || 'Employee',
        ipAddress: '127.0.0.1',
        notes: entry.description || 'none',
      });
    });

    // Bucket screenshots into existing sessions, or a fallback session
    const unassignedScreenshots: any[] = [];

    screenshots.forEach((sc: any) => {
      const entryId = sc.timeEntryId?._id || sc.timeEntryId;
      if (entryId && sessionMap.has(String(entryId))) {
        sessionMap.get(String(entryId))!.screenshots.push(sc);
      } else {
        unassignedScreenshots.push(sc);
      }
    });

    const result = Array.from(sessionMap.values());

    // Sort screenshots within each session chronologically
    result.forEach((sess) => {
      sess.screenshots.sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
    });

    // If there are unassigned screenshots, cluster them into auto-sessions
    if (unassignedScreenshots.length > 0) {
      unassignedScreenshots.sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
      
      const firstSc = unassignedScreenshots[0];
      const lastSc = unassignedScreenshots[unassignedScreenshots.length - 1];
      const sDate = new Date(firstSc.capturedAt);
      const eDate = new Date(lastSc.capturedAt);

      result.push({
        id: 'unassigned-session',
        entry: null,
        screenshots: unassignedScreenshots,
        start: sDate,
        end: eDate,
        project: 'Work Session',
        task: 'General Tracking',
        employee: firstSc.userId?.name || user?.name || 'Employee',
        ipAddress: firstSc.deviceId?.ipAddress || '127.0.0.1',
        notes: 'Desktop tracking session',
      });
    }

    // Sort sessions chronologically (most recent first)
    return result.sort((a, b) => b.start.getTime() - a.start.getTime());
  }, [timeEntries, screenshots, user]);

  // Timeline ruler hourly tick marks (24 hours starting from dayReset)
  const timelineHours = useMemo(() => {
    const [startH] = dayReset.split(':').map(Number);
    const hours: string[] = [];
    for (let i = 0; i < 24; i++) {
      const h = (startH + i) % 24;
      hours.push(`${String(h).padStart(2, '0')}:30`);
    }
    return hours;
  }, [dayReset]);

  // Calculate timeline segments for the bar
  const timelineSegments = useMemo(() => {
    const [startH, startM] = dayReset.split(':').map(Number);
    const cycleStart = new Date(`${selectedDate}T00:00:00`);
    cycleStart.setHours(startH, startM, 0, 0);
    const cycleStartMs = cycleStart.getTime();
    const cycleDurationMs = 24 * 60 * 60 * 1000;

    return sessions.map((sess) => {
      const startMs = Math.max(sess.start.getTime(), cycleStartMs);
      const endMs = Math.min(sess.end.getTime(), cycleStartMs + cycleDurationMs);
      
      if (endMs <= startMs) return null;

      const leftPercent = ((startMs - cycleStartMs) / cycleDurationMs) * 100;
      const widthPercent = Math.max(((endMs - startMs) / cycleDurationMs) * 100, 0.6);

      // Determine segment type (active, meeting, idle, etc.)
      const isManual = sess.entry?.isManualEdit;
      const avgActivity = sess.screenshots.length > 0
        ? sess.screenshots.reduce((acc, s) => acc + (s.activityScore || 0), 0) / sess.screenshots.length
        : 85;

      let color = '#16a34a'; // Active (green)
      let label = 'Active';
      if (isManual) {
        color = '#f97316'; // Manual (orange)
        label = 'Manual';
      } else if (avgActivity < 30) {
        color = '#ef4444'; // Idle (red)
        label = 'Idle';
      }

      return {
        id: sess.id,
        left: leftPercent,
        width: widthPercent,
        color,
        label,
        startTime: sess.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        endTime: sess.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        project: sess.project,
        task: sess.task,
      };
    }).filter(Boolean);
  }, [sessions, selectedDate, dayReset]);

  // Lightbox helpers
  const handleOpenZoom = (screenshot: any, sessionScreenshots: any[]) => {
    setActiveScreenshotList(sessionScreenshots);
    setActiveZoomScreenshot(screenshot);
  };

  const handleNextZoom = () => {
    if (!activeZoomScreenshot || activeScreenshotList.length === 0) return;
    const currentIndex = activeScreenshotList.findIndex((s) => s._id === activeZoomScreenshot._id);
    if (currentIndex < activeScreenshotList.length - 1) {
      setActiveZoomScreenshot(activeScreenshotList[currentIndex + 1]);
    }
  };

  const handlePrevZoom = () => {
    if (!activeZoomScreenshot || activeScreenshotList.length === 0) return;
    const currentIndex = activeScreenshotList.findIndex((s) => s._id === activeZoomScreenshot._id);
    if (currentIndex > 0) {
      setActiveZoomScreenshot(activeScreenshotList[currentIndex - 1]);
    }
  };

  // Keyboard navigation for zoom lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeZoomScreenshot) return;
      if (e.key === 'ArrowRight') handleNextZoom();
      if (e.key === 'ArrowLeft') handlePrevZoom();
      if (e.key === 'Escape') setActiveZoomScreenshot(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeZoomScreenshot, activeScreenshotList]);

  // Helper formatters
  const formatSessionTime = (start: Date, end: Date) => {
    const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const diffMin = Math.round((end.getTime() - start.getTime()) / 60000);
    const hrs = String(Math.floor(diffMin / 60)).padStart(2, '0');
    const mins = String(diffMin % 60).padStart(2, '0');
    return `${fmt(start)} → ${fmt(end)} (${hrs}:${mins})`;
  };

  const formatCardTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const canDeleteSession = isManagerOrAdmin;
  const canDeleteScreenshot = isManagerOrAdmin;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Screenshots & Timeline</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center gap-1">
              <Camera className="w-3 h-3" />
              {screenshots.length} {screenshots.length === 1 ? 'Capture' : 'Captures'}
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Automated desktop monitoring captures, activity timeline ruler, and employee work sessions.
          </p>
        </div>
      </div>

      {/* ─── Top Filter Bar ─── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          {/* Employee Select */}
          <div className="lg:col-span-4">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Employee
            </label>
            {isManagerOrAdmin && !forcedUserId ? (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl shadow-xs">
                <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none text-sm text-[var(--text-primary)] font-medium cursor-pointer"
                >
                  <option value="all">All Employees</option>
                  {users.map((u: any) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl shadow-xs">
                <UserIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {user?.name || 'Reshu Yadav'}
                </span>
              </div>
            )}
          </div>

          {/* Date Picker with Prev / Today / Next Controls */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Date
              </label>
              <button
                type="button"
                onClick={handleToday}
                className="text-[11px] font-semibold text-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Today
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevDay}
                title="Previous Day"
                className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-secondary)] hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-xs"
              />
              <button
                type="button"
                onClick={handleNextDay}
                title="Next Day"
                className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-secondary)] hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer shadow-xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day Reset */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Day reset
            </label>
            <select
              value={dayReset}
              onChange={(e) => setDayReset(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-xs"
            >
              <option value="00:00">00:00 (Midnight)</option>
              <option value="04:00">04:00 (Default)</option>
              <option value="06:00">06:00 (Early)</option>
              <option value="08:00">08:00 (Morning)</option>
            </select>
          </div>

          {/* Timezone */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-xs"
            >
              <option value="GMT+0530">GMT+0530 (IST)</option>
              <option value="UTC">UTC (Universal)</option>
              <option value="GMT-0500">GMT-0500 (EST)</option>
              <option value="GMT-0800">GMT-0800 (PST)</option>
            </select>
          </div>

          {/* Refresh Button */}
          <div className="lg:col-span-1 flex items-end">
            <button
              type="button"
              onClick={() => {
                refetchScreenshots();
                refetchEntries();
              }}
              disabled={isFetchingScreenshots}
              className="w-full h-[42px] flex items-center justify-center gap-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh latest screenshots"
            >
              <RotateCw className={`w-4 h-4 ${isFetchingScreenshots ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline lg:hidden xl:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Cyan Status Ribbon & Permissions Banner (Matches reference design) ─── */}
      <div className="space-y-2">
        <div className="inline-block bg-[#e0f2fe] text-[#0369a1] text-xs font-bold px-3.5 py-1.5 rounded-lg border border-[#bae6fd] shadow-xs">
          {displayRangeText}
        </div>

        <div className="text-xs font-medium text-[var(--text-secondary)] flex flex-wrap items-center gap-4">
          <span>
            Your permissions:&nbsp;
            Delete Session:&nbsp;
            <strong className={canDeleteSession ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
              {canDeleteSession ? 'Allowed' : 'Denied'}
            </strong>
          </span>
          <span>
            Delete Screenshot:&nbsp;
            <strong className={canDeleteScreenshot ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
              {canDeleteScreenshot ? 'Allowed' : 'Denied'}
            </strong>
          </span>
        </div>
      </div>

      {/* ─── Activity Timeline Card ─── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <ActivityIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] leading-tight">Activity Timeline</h2>
              <p className="text-xs text-[var(--text-muted)]">24-hour employee productivity and work status ruler</p>
            </div>
          </div>

          {/* Legend and Toggle */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
            {/* Legend chips */}
            <div className="flex flex-wrap items-center gap-3 font-medium text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] shadow-xs" /> Active
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] shadow-xs" /> Meeting
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-xs" /> Idle
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#b91c1c] shadow-xs" /> Deducted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#64748b] shadow-xs" /> Break
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] shadow-xs" /> Manual
              </span>
            </div>

            {/* Timeline / Table View segmented control */}
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'timeline'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Timeline
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                Table
              </button>
            </div>
          </div>
        </div>

        {/* 24-Hour Timeline Bar & Ruler */}
        {viewMode === 'timeline' && (
          <div className="pt-2">
            <div className="relative w-full overflow-x-auto pb-2 scrollbar-thin">
              <div className="min-w-[960px]">
                {/* Hourly labels */}
                <div className="grid grid-cols-24 text-[10px] text-[var(--text-muted)] font-mono mb-1.5 text-center select-none">
                  {timelineHours.map((hr, idx) => (
                    <div key={idx} className="truncate">
                      {hr}
                    </div>
                  ))}
                </div>

                {/* Ruler tick marks */}
                <div className="grid grid-cols-24 h-2 border-b border-[var(--border-color)] mb-2">
                  {timelineHours.map((_, idx) => (
                    <div key={idx} className="border-l border-[var(--border-color)] h-full" />
                  ))}
                </div>

                {/* Timeline activity track */}
                <div className="relative h-9 w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-inner">
                  {/* Grid hour guidelines */}
                  <div className="absolute inset-0 grid grid-cols-24 pointer-events-none opacity-20">
                    {timelineHours.map((_, idx) => (
                      <div key={idx} className="border-r border-slate-400 h-full" />
                    ))}
                  </div>

                  {timelineSegments.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)] font-medium gap-2">
                      <Clock className="w-3.5 h-3.5 opacity-60" />
                      <span>No activity recorded in this 24-hour cycle</span>
                    </div>
                  ) : (
                    timelineSegments.map((seg: any) => (
                      <div
                        key={seg.id}
                        style={{
                          left: `${seg.left}%`,
                          width: `${seg.width}%`,
                          backgroundColor: seg.color,
                        }}
                        title={`${seg.startTime} → ${seg.endTime} (${seg.label}) - ${seg.project}: ${seg.task}`}
                        className="absolute top-1 bottom-1 rounded-md cursor-pointer hover:brightness-110 hover:shadow-md transition-all shadow-xs"
                        onClick={() => {
                          const el = document.getElementById(`session-${seg.id}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table View of Sessions */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs text-[var(--text-primary)] border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  <th className="p-3">Time Range</th>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Project / Task</th>
                  <th className="p-3">Screenshots</th>
                  <th className="p-3">Notes</th>
                  {canDeleteSession && <th className="p-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-[var(--text-muted)]">
                      No sessions found for this date.
                    </td>
                  </tr>
                ) : (
                  sessions.map((sess) => (
                    <tr key={sess.id} className="hover:bg-[var(--bg-main)]/50 transition-colors">
                      <td className="p-3 font-medium">
                        {formatSessionTime(sess.start, sess.end)}
                      </td>
                      <td className="p-3 font-medium">{sess.employee}</td>
                      <td className="p-3">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">{sess.project}</span>
                        <span className="text-[var(--text-muted)]"> &bull; {sess.task}</span>
                      </td>
                      <td className="p-3">
                        <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold px-2.5 py-0.5 rounded-full text-[11px] border border-indigo-200/50 dark:border-indigo-800/40">
                          {sess.screenshots.length} shots
                        </span>
                      </td>
                      <td className="p-3 text-[var(--text-muted)] truncate max-w-[200px]">
                        {sess.notes}
                      </td>
                      {canDeleteSession && (
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSessionToDelete(sess.id)}
                            className="text-red-500 hover:text-red-700 font-semibold transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Work Sessions Gallery Blocks ─── */}
      {isScreenshotsLoading || isEntriesLoading ? (
        <LoadingSpinner label="Loading screenshots and timeline..." />
      ) : sessions.length === 0 ? (
        /* Rich empty state */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '4rem 1.5rem',
          }}
          className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xs"
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
            }}
            className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-xs"
          >
            <Camera style={{ width: 30, height: 30 }} />
          </div>
          <h3
            className="text-lg font-bold text-[var(--text-primary)]"
            style={{ margin: '0 0 0.5rem 0' }}
          >
            No Work Sessions Found
          </h3>
          <p
            className="text-xs text-[var(--text-muted)] leading-relaxed"
            style={{ margin: '0 0 1.5rem 0', maxWidth: '420px' }}
          >
            No active tracking or screenshots recorded for the selected employee on this date.
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={handleToday}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              View Today
            </button>
            <button
              type="button"
              onClick={handlePrevDay}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous Day
            </button>
            <button
              type="button"
              onClick={() => {
                refetchScreenshots();
                refetchEntries();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Refresh Data
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              id={`session-${sess.id}`}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all space-y-4"
            >
              {/* Session Meta Header */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-3 border-b border-[var(--border-color)]">
                <div className="space-y-2 text-xs">
                  {/* Top badges row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/60 dark:border-indigo-800/40">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      {formatSessionTime(sess.start, sess.end)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[var(--text-secondary)] font-medium border border-[var(--border-color)]">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {selectedDate}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/60 dark:border-emerald-800/40">
                      <Camera className="w-3.5 h-3.5 text-emerald-500" />
                      {sess.screenshots.length} {sess.screenshots.length === 1 ? 'Screenshot' : 'Screenshots'}
                    </span>
                  </div>

                  {/* Meta details row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      <strong className="text-[var(--text-primary)]">Employee:</strong> {sess.employee}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <strong className="text-[var(--text-primary)]">Project:</strong> {sess.project}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                      <strong className="text-[var(--text-primary)]">Task:</strong> {sess.task}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <strong className="text-[var(--text-primary)]">IP:</strong> {sess.ipAddress}
                    </span>
                  </div>

                  {/* Notes row */}
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <span>Notes: {sess.notes}</span>
                    <button
                      onClick={() => setEditingNotesSession({ id: sess.id, notes: sess.notes === 'none' ? '' : sess.notes })}
                      className="inline-flex items-center gap-1 text-indigo-500 hover:text-indigo-600 font-semibold text-xs ml-1 cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      edit
                    </button>
                  </div>
                </div>

                {/* Delete Session link */}
                {canDeleteSession && sess.id !== 'unassigned-session' && (
                  <button
                    onClick={() => setSessionToDelete(sess.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/40 rounded-xl transition-all cursor-pointer self-start"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Session
                  </button>
                )}
              </div>

              {/* Instruction label */}
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <p>Click on any screenshot thumbnail to zoom in.</p>
                <span className="text-[11px] font-medium text-slate-400">Captured automatically every 5 mins</span>
              </div>

              {/* Screenshots Thumbnails Grid */}
              {sess.screenshots.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-main)]">
                  No screenshots taken during this session duration.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                  {sess.screenshots.map((sc: any) => (
                    <div
                      key={sc._id}
                      className="group relative border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-main)] hover:border-indigo-500 hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col cursor-pointer shadow-xs"
                      onClick={() => handleOpenZoom(sc, sess.screenshots)}
                    >
                      {/* Image Thumbnail Container */}
                      <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                        {sc.downloadUrl ? (
                          <img
                            src={sc.downloadUrl}
                            alt="Desktop screenshot"
                            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                              sc.isBlurred ? 'blur-sm hover:blur-none' : ''
                            }`}
                          />
                        ) : (
                          <div className="p-4 text-center">
                            <Clock className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                            <span className="text-[10px] text-slate-500">No preview</span>
                          </div>
                        )}

                        {/* Top-right overlay actions */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="p-2 rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors">
                            <Maximize2 className="w-4 h-4" />
                          </span>
                          {canDeleteScreenshot && (
                            <button
                              type="button"
                              className="p-2 rounded-xl bg-red-600/80 backdrop-blur-md text-white hover:bg-red-600 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setScreenshotToDelete(sc._id);
                              }}
                              title="Delete Screenshot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Activity Score chip */}
                        {sc.activityScore !== undefined && (
                          <span className="absolute bottom-1.5 right-1.5 bg-black/75 backdrop-blur-md text-[10px] font-bold text-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                sc.activityScore >= 70
                                  ? 'bg-emerald-400'
                                  : sc.activityScore >= 40
                                  ? 'bg-amber-400'
                                  : 'bg-red-400'
                              }`}
                            />
                            {sc.activityScore}%
                          </span>
                        )}
                      </div>

                      {/* Card Footer: Time label */}
                      <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between text-[11px] font-semibold text-[var(--text-primary)]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatCardTime(sc.capturedAt)}
                        </span>
                        {sc.isBlurred && <span className="text-[10px] text-amber-500 font-normal">Blurred</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── Modal: Zoom Lightbox ─── */}
      {activeZoomScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveZoomScreenshot(null)}
        >
          <div
            className="relative max-w-5xl w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-indigo-500" />
                  Screenshot Details — {formatCardTime(activeZoomScreenshot.capturedAt)}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Captured at: {new Date(activeZoomScreenshot.capturedAt).toLocaleString()} &bull;{' '}
                  Activity: {activeZoomScreenshot.activityScore || 0}%
                </p>
              </div>

              <div className="flex items-center gap-2">
                {canDeleteScreenshot && (
                  <button
                    onClick={() => {
                      setScreenshotToDelete(activeZoomScreenshot._id);
                    }}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                    title="Delete Screenshot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setActiveZoomScreenshot(null)}
                  className="p-2 text-[var(--text-muted)] hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Display with Navigation Arrows */}
            <div className="relative aspect-video max-h-[70vh] bg-slate-950 flex items-center justify-center">
              {activeZoomScreenshot.downloadUrl ? (
                <img
                  src={activeZoomScreenshot.downloadUrl}
                  alt="High-resolution view"
                  className="w-full h-full object-contain"
                />
              ) : (
                <p className="text-sm text-slate-400">No preview available</p>
              )}

              {/* Prev Button */}
              <button
                onClick={handlePrevZoom}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-2.5 rounded-full transition-all cursor-pointer shadow-lg backdrop-blur-xs"
                title="Previous Screenshot (Left Arrow)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Next Button */}
              <button
                onClick={handleNextZoom}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-2.5 rounded-full transition-all cursor-pointer shadow-lg backdrop-blur-xs"
                title="Next Screenshot (Right Arrow)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Footer info */}
            <div className="p-3.5 bg-[var(--bg-main)] text-xs text-[var(--text-muted)] flex items-center justify-between border-t border-[var(--border-color)]">
              <span>Use ◀ and ▶ to navigate between screenshots &bull; ESC to exit</span>
              <a
                href={activeZoomScreenshot.downloadUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo-500 hover:text-indigo-600 font-semibold"
              >
                Open Original in New Tab
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Edit Notes ─── */}
      {editingNotesSession && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setEditingNotesSession(null)}
        >
          <div
            className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[var(--text-primary)]">Edit Session Notes</h3>
            <textarea
              rows={3}
              value={editingNotesSession.notes}
              onChange={(e) => setEditingNotesSession({ ...editingNotesSession, notes: e.target.value })}
              className="w-full p-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Add notes describing work completed in this session..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingNotesSession(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--bg-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => updateNotesMutation.mutate({ id: editingNotesSession.id, notes: editingNotesSession.notes })}
                disabled={updateNotesMutation.isPending}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
              >
                {updateNotesMutation.isPending ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirmation Modal: Delete Session ─── */}
      {sessionToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSessionToDelete(null)}
        >
          <div
            className="max-w-sm w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-red-500">Delete Work Session?</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Are you sure you want to delete this session? This action will write an audit log and cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--bg-main)] text-[var(--text-secondary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteSessionMutation.mutate(sessionToDelete)}
                disabled={deleteSessionMutation.isPending}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
              >
                {deleteSessionMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirmation Modal: Delete Screenshot ─── */}
      {screenshotToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setScreenshotToDelete(null)}
        >
          <div
            className="max-w-sm w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-red-500">Delete Screenshot?</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              This will permanently delete this screenshot image. This action is audited.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setScreenshotToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--bg-main)] text-[var(--text-secondary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteScreenshotMutation.mutate(screenshotToDelete)}
                disabled={deleteScreenshotMutation.isPending}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
              >
                {deleteScreenshotMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

