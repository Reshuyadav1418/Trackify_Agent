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

const getValidImageUrl = (sc: any): string => {
  if (!sc) return '';
  if (sc.downloadUrl && !sc.downloadUrl.includes('localhost') && !sc.downloadUrl.includes('127.0.0.1')) {
    return sc.downloadUrl;
  }
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
  return `${apiBase}/api/screenshots/${sc._id}/image`;
};

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
      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${day} ${month} ${year} ${time}`;
    };

    return {
      startDateISO: start.toISOString(),
      endDateISO: end.toISOString(),
      displayRangeText: `${fmt(start)} to ${fmt(end)}`,
    };
  }, [selectedDate, dayReset]);

  // Fetch users list for dropdown (only if admin/manager)
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsersApi,
    enabled: isManagerOrAdmin && !forcedUserId,
  });

  const users = usersData?.users || [];

  // Query parameters for screenshots and time-entries
  const queryParams = useMemo(() => {
    const p: Record<string, string> = {
      startDate: startDateISO,
      endDate: endDateISO,
    };
    if (selectedUser && selectedUser !== 'all') {
      p.userId = selectedUser;
    }
    return p;
  }, [startDateISO, endDateISO, selectedUser]);

  // Fetch screenshots
  const {
    data: screenshotsData,
    isLoading: isScreenshotsLoading,
    isFetching: isFetchingScreenshots,
    refetch: refetchScreenshots,
  } = useQuery({
    queryKey: ['screenshots', queryParams],
    queryFn: () => getScreenshotsApi(queryParams),
  });

  // Fetch time entries (to group screenshots into work sessions)
  const {
    data: timeEntriesData,
    isLoading: isEntriesLoading,
    refetch: refetchEntries,
  } = useQuery({
    queryKey: ['timeEntries', queryParams],
    queryFn: () => getTimeEntriesApi(queryParams),
  });

  const screenshots = screenshotsData?.screenshots || [];
  const timeEntries = timeEntriesData?.timeEntries || [];

  // Mutations
  const deleteScreenshotMutation = useMutation({
    mutationFn: deleteScreenshotApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screenshots'] });
      setScreenshotToDelete(null);
      if (activeZoomScreenshot) setActiveZoomScreenshot(null);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: deleteTimeEntryApi,
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

  // Group screenshots into sessions
  const sessions = useMemo(() => {
    const result: Array<{
      id: string;
      entry?: any;
      start: Date;
      end: Date;
      screenshots: any[];
      project: string;
      task: string;
      employee: string;
      ipAddress: string;
      notes: string;
    }> = [];

    // Map time entries as sessions
    timeEntries.forEach((entry: any) => {
      const start = new Date(entry.start);
      const end = entry.end ? new Date(entry.end) : new Date();

      // Find matching screenshots within this entry's timeframe (with 2 min buffer)
      const matchingShots = screenshots.filter((sc: any) => {
        const scTime = new Date(sc.capturedAt).getTime();
        return scTime >= start.getTime() - 120000 && scTime <= end.getTime() + 120000;
      });

      result.push({
        id: entry._id,
        entry,
        start,
        end,
        screenshots: matchingShots,
        project: entry.projectId?.name || entry.project || 'General Project',
        task: entry.taskId?.title || entry.task || 'Active Task',
        employee: entry.userId?.name || user?.name || 'Employee',
        ipAddress: matchingShots[0]?.deviceId?.ipAddress || '127.0.0.1',
        notes: entry.notes || 'none',
      });
    });

    // Unassigned screenshots fallback (if screenshots exist without a matching time entry)
    const assignedIds = new Set(result.flatMap((r) => r.screenshots.map((s) => s._id)));
    const unassignedShots = screenshots.filter((s: any) => !assignedIds.has(s._id));

    if (unassignedShots.length > 0) {
      const sortedUnassigned = [...unassignedShots].sort(
        (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
      );
      const firstSc = sortedUnassigned[0];
      const lastSc = sortedUnassigned[sortedUnassigned.length - 1];

      result.push({
        id: 'unassigned-session',
        start: new Date(firstSc.capturedAt),
        end: new Date(new Date(lastSc.capturedAt).getTime() + 10 * 60 * 1000),
        screenshots: sortedUnassigned,
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

      let color = '#10B981'; // Active (emerald)
      let label = 'Active';
      if (isManual) {
        color = '#F59E0B'; // Manual (amber)
        label = 'Manual';
      } else if (avgActivity < 30) {
        color = '#EF4444'; // Idle (rose)
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
            <h1 className="page-title">Screenshots & Timeline</h1>
            <span className="badge-indigo font-bold">
              <Camera size={13} />
              {screenshots.length} {screenshots.length === 1 ? 'Capture' : 'Captures'}
            </span>
          </div>
          <p className="page-subtitle">
            Automated desktop monitoring captures, activity timeline ruler, and employee work sessions.
          </p>
        </div>
      </div>

      {/* ─── Top Filter Bar ─── */}
      <div className="card-panel space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          {/* Employee Select */}
          <div className="lg:col-span-4">
            <label className="block text-xs font-bold text-neu-muted mb-1.5 uppercase tracking-wider pl-1">
              Employee
            </label>
            {isManagerOrAdmin && !forcedUserId ? (
              <div className="flex items-center gap-2.5 px-3 py-2 neu-inset-sm rounded-xl">
                <UserIcon size={16} className="text-neu-muted shrink-0" />
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none text-xs text-neu-primary font-bold cursor-pointer"
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
              <div className="flex items-center gap-2.5 px-3 py-2.5 neu-inset-sm rounded-xl">
                <UserIcon size={16} className="text-neu-accent shrink-0" />
                <span className="text-xs font-bold text-neu-primary">
                  {user?.name || 'Reshu Yadav'}
                </span>
              </div>
            )}
          </div>

          {/* Date Picker with Prev / Today / Next Controls */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-1.5 pl-1">
              <label className="block text-xs font-bold text-neu-muted uppercase tracking-wider">
                Date
              </label>
              <button
                type="button"
                onClick={handleToday}
                className="text-[11px] font-bold text-neu-accent hover:underline cursor-pointer border-none bg-transparent"
              >
                Today
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevDay}
                title="Previous Day"
                className="btn-icon-circle w-9 h-9"
              >
                <ChevronLeft size={16} />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 input-custom py-2 text-xs"
              />
              <button
                type="button"
                onClick={handleNextDay}
                title="Next Day"
                className="btn-icon-circle w-9 h-9"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Day Reset */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-neu-muted mb-1.5 uppercase tracking-wider pl-1">
              Day reset
            </label>
            <select
              value={dayReset}
              onChange={(e) => setDayReset(e.target.value)}
              className="w-full input-custom py-2 text-xs cursor-pointer"
            >
              <option value="00:00">00:00 (Midnight)</option>
              <option value="04:00">04:00 (Default)</option>
              <option value="06:00">06:00 (Early)</option>
              <option value="08:00">08:00 (Morning)</option>
            </select>
          </div>

          {/* Timezone */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-neu-muted mb-1.5 uppercase tracking-wider pl-1">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full input-custom py-2 text-xs cursor-pointer"
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
              className="w-full h-10 btn-primary py-2 px-3 text-xs flex items-center justify-center gap-1.5"
              title="Refresh latest screenshots"
            >
              <RotateCw size={14} className={isFetchingScreenshots ? 'animate-spin' : ''} />
              <span className="hidden sm:inline lg:hidden xl:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Cyan Status Ribbon & Permissions Banner ─── */}
      <div className="space-y-2">
        <div className="inline-block neu-inset-sm text-neu-accent text-xs font-bold px-3.5 py-1.5 rounded-xl">
          {displayRangeText}
        </div>

        <div className="text-xs font-semibold text-neu-muted flex flex-wrap items-center gap-4 pl-1">
          <span>
            Your permissions:&nbsp;
            Delete Session:&nbsp;
            <strong className={canDeleteSession ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
              {canDeleteSession ? 'Allowed' : 'Denied'}
            </strong>
          </span>
          <span>
            Delete Screenshot:&nbsp;
            <strong className={canDeleteScreenshot ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
              {canDeleteScreenshot ? 'Allowed' : 'Denied'}
            </strong>
          </span>
        </div>
      </div>

      {/* ─── Activity Timeline Card ─── */}
      <div className="card-panel space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full neu-inset flex items-center justify-center text-neu-accent">
              <ActivityIcon size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-neu-primary leading-tight m-0">Activity Timeline</h2>
              <p className="text-xs text-neu-muted m-0 font-medium">24-hour employee productivity and work status ruler</p>
            </div>
          </div>

          {/* Legend and Toggle */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
            {/* Legend chips */}
            <div className="flex flex-wrap items-center gap-3 font-semibold text-neu-secondary">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" /> Active
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] shadow-sm" /> Meeting
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" /> Idle
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" /> Manual
              </span>
            </div>

            {/* Timeline / Table View segmented control */}
            <div className="inline-flex p-1 neu-inset rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border-none ${
                  viewMode === 'timeline'
                    ? 'neu-raised text-neu-accent shadow-neu-raised-sm'
                    : 'bg-transparent text-neu-muted hover:text-neu-primary'
                }`}
              >
                <Layers size={13} />
                <span>Timeline</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border-none ${
                  viewMode === 'table'
                    ? 'neu-raised text-neu-accent shadow-neu-raised-sm'
                    : 'bg-transparent text-neu-muted hover:text-neu-primary'
                }`}
              >
                <TableIcon size={13} />
                <span>Table</span>
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
                <div className="grid grid-cols-24 text-[10px] text-neu-muted font-mono mb-1.5 text-center select-none tabular-nums">
                  {timelineHours.map((hr, idx) => (
                    <div key={idx} className="truncate">
                      {hr}
                    </div>
                  ))}
                </div>

                {/* Ruler tick marks */}
                <div className="grid grid-cols-24 h-2 border-b border-white/10 dark:border-white/5 mb-2">
                  {timelineHours.map((_, idx) => (
                    <div key={idx} className="border-l border-white/10 dark:border-white/5 h-full" />
                  ))}
                </div>

                {/* Timeline activity track */}
                <div className="relative h-10 w-full neu-inset rounded-xl overflow-hidden">
                  {/* Grid hour guidelines */}
                  <div className="absolute inset-0 grid grid-cols-24 pointer-events-none opacity-15">
                    {timelineHours.map((_, idx) => (
                      <div key={idx} className="border-r border-slate-400 h-full" />
                    ))}
                  </div>

                  {timelineSegments.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-neu-muted font-bold gap-2">
                      <Clock size={14} className="opacity-60" />
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
                        className="absolute top-1.5 bottom-1.5 rounded-lg cursor-pointer hover:brightness-110 hover:shadow-md transition-all"
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
          <div className="table-custom-wrapper pt-2">
            <div className="overflow-x-auto">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>Time Range</th>
                    <th>Employee</th>
                    <th>Project / Task</th>
                    <th>Screenshots</th>
                    <th>Notes</th>
                    {canDeleteSession && <th className="text-right">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-neu-muted font-medium">
                        No sessions found for this date.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((sess) => (
                      <tr key={sess.id}>
                        <td className="font-bold tabular-nums">
                          {formatSessionTime(sess.start, sess.end)}
                        </td>
                        <td className="font-bold text-neu-primary">{sess.employee}</td>
                        <td>
                          <span className="font-extrabold text-neu-accent">{sess.project}</span>
                          <span className="text-neu-muted"> &bull; {sess.task}</span>
                        </td>
                        <td>
                          <span className="badge-indigo font-bold">
                            {sess.screenshots.length} shots
                          </span>
                        </td>
                        <td className="text-neu-muted truncate max-w-[200px] font-medium">
                          {sess.notes}
                        </td>
                        {canDeleteSession && (
                          <td className="text-right">
                            <button
                              onClick={() => setSessionToDelete(sess.id)}
                              className="text-rose-500 hover:text-rose-600 font-bold text-xs bg-transparent border-none cursor-pointer"
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
          </div>
        )}
      </div>

      {/* ─── Work Sessions Gallery Blocks ─── */}
      {isScreenshotsLoading || isEntriesLoading ? (
        <LoadingSpinner label="Loading screenshots and timeline..." />
      ) : sessions.length === 0 ? (
        <div className="card-panel py-16 px-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl neu-raised flex items-center justify-center mb-4 text-neu-accent">
            <Camera size={30} />
          </div>
          <h3 className="text-base font-extrabold text-neu-primary m-0 mb-1.5">
            No Work Sessions Found
          </h3>
          <p className="text-xs text-neu-muted max-w-sm m-0 mb-6 font-medium">
            No active tracking or screenshots recorded for the selected employee on this date.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleToday}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-2"
            >
              <Clock size={14} />
              <span>View Today</span>
            </button>
            <button
              type="button"
              onClick={handlePrevDay}
              className="btn-secondary text-xs py-2 px-4 flex items-center gap-2"
            >
              <ChevronLeft size={14} />
              <span>Previous Day</span>
            </button>
            <button
              type="button"
              onClick={() => {
                refetchScreenshots();
                refetchEntries();
              }}
              className="btn-secondary text-xs py-2 px-4 flex items-center gap-2"
            >
              <RotateCw size={14} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              id={`session-${sess.id}`}
              className="card-panel space-y-4"
            >
              {/* Session Meta Header */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-3 border-b border-white/10 dark:border-white/5">
                <div className="space-y-2 text-xs">
                  {/* Top badges row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-indigo font-bold">
                      <Clock size={12} />
                      {formatSessionTime(sess.start, sess.end)}
                    </span>
                    <span className="badge-indigo">
                      <Calendar size={12} />
                      {selectedDate}
                    </span>
                    <span className="badge-emerald font-bold">
                      <Camera size={12} />
                      {sess.screenshots.length} {sess.screenshots.length === 1 ? 'Screenshot' : 'Screenshots'}
                    </span>
                  </div>

                  {/* Meta details row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-neu-secondary font-medium">
                    <span className="inline-flex items-center gap-1">
                      <UserIcon size={13} className="text-neu-muted" />
                      <strong className="text-neu-primary">Employee:</strong> {sess.employee}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Briefcase size={13} className="text-neu-muted" />
                      <strong className="text-neu-primary">Project:</strong> {sess.project}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CheckSquare size={13} className="text-neu-muted" />
                      <strong className="text-neu-primary">Task:</strong> {sess.task}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Globe size={13} className="text-neu-muted" />
                      <strong className="text-neu-primary">IP:</strong> {sess.ipAddress}
                    </span>
                  </div>

                  {/* Notes row */}
                  <div className="flex items-center gap-2 text-neu-muted font-medium">
                    <span>Notes: {sess.notes}</span>
                    <button
                      onClick={() => setEditingNotesSession({ id: sess.id, notes: sess.notes === 'none' ? '' : sess.notes })}
                      className="inline-flex items-center gap-1 text-neu-accent font-bold text-xs ml-1 cursor-pointer border-none bg-transparent"
                    >
                      <Edit3 size={12} />
                      edit
                    </button>
                  </div>
                </div>

                {/* Delete Session link */}
                {canDeleteSession && sess.id !== 'unassigned-session' && (
                  <button
                    onClick={() => setSessionToDelete(sess.id)}
                    className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5 self-start"
                  >
                    <Trash2 size={13} />
                    <span>Delete Session</span>
                  </button>
                )}
              </div>

              {/* Instruction label */}
              <div className="flex items-center justify-between text-xs text-neu-muted font-medium">
                <p className="m-0">Click on any screenshot thumbnail to zoom in.</p>
                <span className="text-[11px] text-neu-muted">Captured automatically every 5 mins</span>
              </div>

              {/* Screenshots Thumbnails Grid */}
              {sess.screenshots.length === 0 ? (
                <div className="py-8 text-center text-xs text-neu-muted neu-inset-sm rounded-xl">
                  No screenshots taken during this session duration.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {sess.screenshots.map((sc: any) => (
                    <div
                      key={sc._id}
                      className="group relative neu-raised-sm rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-200 hover:shadow-neu-raised"
                      onClick={() => handleOpenZoom(sc, sess.screenshots)}
                    >
                      {/* Image Thumbnail Container */}
                      <div className="relative aspect-video bg-neu-bg flex items-center justify-center overflow-hidden">
                        {sc ? (
                          <img
                            src={getValidImageUrl(sc)}
                            alt="Desktop screenshot"
                            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                              sc.isBlurred ? 'blur-sm hover:blur-none' : ''
                            }`}
                            onError={(e) => {
                              const target = e.currentTarget;
                              const fallback = getValidImageUrl(sc);
                              if (target.src !== fallback) {
                                target.src = fallback;
                              }
                            }}
                          />
                        ) : (
                          <div className="p-4 text-center">
                            <Clock size={20} className="text-neu-muted mx-auto mb-1" />
                            <span className="text-[10px] text-neu-muted">No preview</span>
                          </div>
                        )}

                        {/* Top-right overlay actions */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="p-2 rounded-xl bg-white/20 backdrop-blur-md text-white">
                            <Maximize2 size={16} />
                          </span>
                          {canDeleteScreenshot && (
                            <button
                              type="button"
                              className="p-2 rounded-xl bg-rose-600/80 backdrop-blur-md text-white border-none cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setScreenshotToDelete(sc._id);
                              }}
                              title="Delete Screenshot"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        {/* Activity Score chip */}
                        {sc.activityScore !== undefined && (
                          <span className="absolute bottom-1.5 right-1.5 bg-black/75 backdrop-blur-md text-[10px] font-bold text-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs tabular-nums">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                sc.activityScore >= 70
                                  ? 'bg-emerald-400'
                                  : sc.activityScore >= 40
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                              }`}
                            />
                            {sc.activityScore}%
                          </span>
                        )}
                      </div>

                      {/* Card Footer: Time label */}
                      <div className="px-3 py-2 bg-neu-bg flex items-center justify-between text-[11px] font-bold text-neu-primary">
                        <span className="flex items-center gap-1 tabular-nums">
                          <Clock size={12} className="text-neu-muted" />
                          {formatCardTime(sc.capturedAt)}
                        </span>
                        {sc.isBlurred && <span className="text-[10px] text-amber-500 font-semibold">Blurred</span>}
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveZoomScreenshot(null)}
        >
          <div
            className="neu-modal-card relative max-w-5xl w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 dark:border-white/5 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-neu-primary flex items-center gap-2 m-0">
                  <Laptop size={18} className="text-neu-accent" />
                  Screenshot Details — {formatCardTime(activeZoomScreenshot.capturedAt)}
                </h3>
                <p className="text-xs text-neu-muted mt-1 m-0 font-medium">
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
                    className="btn-icon-circle w-9 h-9 text-rose-500"
                    title="Delete Screenshot"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => setActiveZoomScreenshot(null)}
                  className="btn-icon-circle w-9 h-9 text-neu-muted hover:text-neu-primary"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Image Display with Navigation Arrows */}
            <div className="relative aspect-video max-h-[70vh] neu-inset rounded-2xl flex items-center justify-center overflow-hidden">
              {activeZoomScreenshot ? (
                <img
                  src={getValidImageUrl(activeZoomScreenshot)}
                  alt="High-resolution view"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const fallback = getValidImageUrl(activeZoomScreenshot);
                    if (target.src !== fallback) {
                      target.src = fallback;
                    }
                  }}
                />
              ) : (
                <p className="text-sm text-neu-muted">No preview available</p>
              )}

              {/* Prev Button */}
              <button
                onClick={handlePrevZoom}
                className="absolute left-4 top-1/2 -translate-y-1/2 btn-icon-circle w-10 h-10 shadow-neu-raised"
                title="Previous Screenshot (Left Arrow)"
              >
                <ChevronLeft size={20} />
              </button>

              {/* Next Button */}
              <button
                onClick={handleNextZoom}
                className="absolute right-4 top-1/2 -translate-y-1/2 btn-icon-circle w-10 h-10 shadow-neu-raised"
                title="Next Screenshot (Right Arrow)"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Modal Footer info */}
            <div className="pt-2 text-xs text-neu-muted flex items-center justify-between font-semibold">
              <span>Use ◀ and ▶ to navigate between screenshots &bull; ESC to exit</span>
              <a
                href={getValidImageUrl(activeZoomScreenshot)}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-neu-accent hover:underline no-underline"
              >
                Open Original in New Tab
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Edit Notes ─── */}
      {editingNotesSession && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingNotesSession(null)}
        >
          <div
            className="neu-modal-card max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-extrabold text-neu-primary m-0">Edit Session Notes</h3>
            <textarea
              rows={3}
              value={editingNotesSession.notes}
              onChange={(e) => setEditingNotesSession({ ...editingNotesSession, notes: e.target.value })}
              className="input-custom w-full leading-relaxed"
              placeholder="Add notes describing work completed in this session..."
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingNotesSession(null)}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                onClick={() => updateNotesMutation.mutate({ id: editingNotesSession.id, notes: editingNotesSession.notes })}
                disabled={updateNotesMutation.isPending}
                className="btn-primary text-xs py-2 px-4"
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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSessionToDelete(null)}
        >
          <div
            className="neu-modal-card max-w-sm w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-extrabold text-rose-500 m-0">Delete Work Session?</h3>
            <p className="text-xs text-neu-muted leading-relaxed font-medium m-0">
              Are you sure you want to delete this session? This action will write an audit log and cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSessionToDelete(null)}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteSessionMutation.mutate(sessionToDelete)}
                disabled={deleteSessionMutation.isPending}
                className="btn-danger text-xs py-2 px-4"
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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setScreenshotToDelete(null)}
        >
          <div
            className="neu-modal-card max-w-sm w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-extrabold text-rose-500 m-0">Delete Screenshot?</h3>
            <p className="text-xs text-neu-muted leading-relaxed font-medium m-0">
              This will permanently delete this screenshot image. This action is audited.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setScreenshotToDelete(null)}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteScreenshotMutation.mutate(screenshotToDelete)}
                disabled={deleteScreenshotMutation.isPending}
                className="btn-danger text-xs py-2 px-4"
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

export default ScreenshotTimelineGallery;
