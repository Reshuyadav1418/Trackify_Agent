import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTimeEntriesApi, startTimerApi, stopTimerApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorAlert } from '../../components/ErrorAlert';

import {
  RotateCw,
  Search,
  Download,
  Columns,
  Play,
  Square,
  AlertCircle,
  Clock,
  User,
  TrendingUp,
  Coffee,
  Briefcase,
  Users,
  Activity,
} from 'lucide-react';

export const SummaryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [timerError, setTimerError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'productivity'>('summary');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [formatType, setFormatType] = useState<'hhmm' | 'decimal'>('hhmm');

  // Date filters bound to state
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [rangeType, setRangeType] = useState<'today' | 'week' | 'custom'>('today');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [dayReset, setDayReset] = useState('04:00');

  const handleRangeChange = (val: 'today' | 'week' | 'custom') => {
    setRangeType(val);
    if (val === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (val === 'week') {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  const queryParams = useMemo(() => {
    return {
      startDate: `${startDate}T00:00:00.000Z`,
      endDate: `${endDate}T23:59:59.999Z`,
    };
  }, [startDate, endDate]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['timeEntries', queryParams],
    queryFn: () => getTimeEntriesApi(queryParams),
  });

  const startMutation = useMutation({
    mutationFn: startTimerApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      setDescription('');
      setTimerError(null);
    },
    onError: (err: any) => {
      setTimerError(err.response?.data?.error || 'Failed to start timer');
    },
  });

  const stopMutation = useMutation({
    mutationFn: stopTimerApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      setTimerError(null);
    },
    onError: (err: any) => {
      setTimerError(err.response?.data?.error || 'Failed to stop timer');
    },
  });

  const entries = useMemo(() => data?.timeEntries || [], [data?.timeEntries]);
  const activeEntry = useMemo(() => entries.find((e: any) => !e.end), [entries]);

  // Calculate activity span from earliest to latest time entry
  const activitySpan = useMemo(() => {
    if (entries.length === 0) return 'No recorded sessions';
    const startTimestamps = entries.map((e: any) => new Date(e.start).getTime()).filter((t: number) => !isNaN(t));
    const endTimestamps = entries.map((e: any) => new Date(e.end || e.start).getTime()).filter((t: number) => !isNaN(t));
    if (startTimestamps.length === 0) return 'No recorded sessions';
    const minStart = new Date(Math.min(...startTimestamps));
    const maxEnd = new Date(Math.max(...endTimestamps));
    const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${fmt(minStart)} ➔ ${fmt(maxEnd)}`;
  }, [entries]);

  // Timeline ruler hourly tick marks (24 hours starting from dayReset)
  const timelineHours = useMemo(() => {
    const [startH] = (dayReset || '04:00').split(':').map(Number);
    const hours: string[] = [];
    for (let i = 0; i < 24; i++) {
      const h = ((isNaN(startH) ? 4 : startH) + i) % 24;
      hours.push(`${String(h).padStart(2, '0')}:30`);
    }
    return hours;
  }, [dayReset]);

  // Timeline segments (Active: Green, Idle: Red, Stopped/Break: Black, Manual: Amber)
  const timelineSegments = useMemo(() => {
    const [startH, startM] = (dayReset || '04:00').split(':').map(Number);
    const dateStr = startDate || new Date().toISOString().split('T')[0];
    const cycleStart = new Date(`${dateStr}T00:00:00`);
    if (isNaN(cycleStart.getTime())) return [];
    cycleStart.setHours(isNaN(startH) ? 4 : startH, isNaN(startM) ? 0 : startM, 0, 0);
    const cycleStartMs = cycleStart.getTime();
    const cycleDurationMs = 24 * 60 * 60 * 1000;

    const segments: Array<{
      id: string;
      left: number;
      width: number;
      color: string;
      label: string;
      startTime: string;
      endTime: string;
    }> = [];

    const sortedEntries = [...entries].sort(
      (a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    sortedEntries.forEach((entry: any, idx: number) => {
      const sMs = new Date(entry.start).getTime();
      const eMs = entry.end ? new Date(entry.end).getTime() : Date.now();
      const sessStartMs = Math.max(sMs, cycleStartMs);
      const sessEndMs = Math.min(eMs, cycleStartMs + cycleDurationMs);
      if (sessEndMs <= sessStartMs) return;

      const durMs = sessEndMs - sessStartMs;
      const idleMs = (Number(entry.idleSeconds) || 0) * 1000;
      const breakMs = (Number(entry.breakSeconds) || 0) * 1000;
      const netActiveMs = Math.max(0, durMs - idleMs - breakMs);

      // Active Work segment (Green)
      if (netActiveMs > 0) {
        const left = ((sessStartMs - cycleStartMs) / cycleDurationMs) * 100;
        const width = Math.max((netActiveMs / cycleDurationMs) * 100, 0.5);
        segments.push({
          id: `${entry._id || idx}-active`,
          left,
          width,
          color: entry.isManualEdit ? '#F59E0B' : '#10B981',
          label: entry.isManualEdit ? 'Manual' : 'Active Work',
          startTime: new Date(sessStartMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          endTime: new Date(sessStartMs + netActiveMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      // Idle segment (Red)
      if (idleMs > 0) {
        const idleStart = sessStartMs + netActiveMs;
        const left = ((idleStart - cycleStartMs) / cycleDurationMs) * 100;
        const width = Math.max((idleMs / cycleDurationMs) * 100, 0.5);
        segments.push({
          id: `${entry._id || idx}-idle`,
          left,
          width,
          color: '#EF4444',
          label: `Idle (${Math.round(idleMs / 60000)}m)`,
          startTime: new Date(idleStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          endTime: new Date(idleStart + idleMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      // Break segment (Black)
      if (breakMs > 0) {
        const breakStart = sessEndMs - breakMs;
        const left = ((breakStart - cycleStartMs) / cycleDurationMs) * 100;
        const width = Math.max((breakMs / cycleDurationMs) * 100, 0.5);
        segments.push({
          id: `${entry._id || idx}-break`,
          left,
          width,
          color: '#0F172A',
          label: `Break (${Math.round(breakMs / 60000)}m)`,
          startTime: new Date(breakStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          endTime: new Date(sessEndMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      // Stopped period between sessions or after latest session
      const next = sortedEntries[idx + 1];
      const gapStart = sessEndMs;
      const gapEnd = next 
        ? Math.max(gapStart, new Date(next.start).getTime())
        : (new Date().toISOString().split('T')[0] === dateStr ? Math.min(Date.now(), cycleStartMs + cycleDurationMs) : null);

      if (gapEnd && gapEnd - gapStart >= 60000) {
        const left = ((gapStart - cycleStartMs) / cycleDurationMs) * 100;
        const width = Math.max(((gapEnd - gapStart) / cycleDurationMs) * 100, 0.5);
        segments.push({
          id: `stopped-${entry._id || idx}`,
          left,
          width,
          color: '#0F172A',
          label: 'Stopped (Timer Off)',
          startTime: new Date(gapStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          endTime: new Date(gapEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    });

    return segments;
  }, [entries, startDate, dayReset]);

  if (isLoading) return <LoadingSpinner label="Loading employee summary report..." />;
  if (isError) return <ErrorAlert message={(error as any)?.message || 'Failed to load time entries'} onRetry={refetch} />;

  // Dynamic calculations from actual synced work sessions matching the selected date filter
  let totalWorkedSeconds = 0;
  let timerActiveSeconds = 0;
  let manualEntrySeconds = 0;
  let breakSecondsTotal = 0;
  let idleSecondsTotal = 0;

  entries.forEach((e: any) => {
    const dur = Number(e.durationSeconds) || 0;
    const brk = Number(e.breakSeconds) || 0;
    const idle = Number(e.idleSeconds) || 0;
    totalWorkedSeconds += dur;
    breakSecondsTotal += brk;
    idleSecondsTotal += idle;
    if (e.isManualEdit) {
      manualEntrySeconds += dur;
    } else {
      timerActiveSeconds += dur;
    }
  });

  const activePercent = totalWorkedSeconds > 0
    ? Math.min(100, Math.max(0, Math.round(((totalWorkedSeconds - idleSecondsTotal) / totalWorkedSeconds) * 100)))
    : 0;

  const idlePercent = totalWorkedSeconds > 0
    ? Math.min(100, Math.max(0, Math.round((idleSecondsTotal / totalWorkedSeconds) * 100)))
    : 0;

  const totalCycleSeconds = totalWorkedSeconds + breakSecondsTotal;
  const breakPercent = totalCycleSeconds > 0
    ? Math.min(100, Math.max(0, Math.round((breakSecondsTotal / totalCycleSeconds) * 100)))
    : 0;

  const formatHours = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (formatType === 'decimal') {
      return `${(seconds / 3600).toFixed(2)}h`;
    }
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatClockTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {/* ─── Header Title Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Employee Summary</h1>
          <p className="page-subtitle">
            Review employee time, client billability, and productivity from one unified report.
          </p>
        </div>

        {/* Auto Refresh Select */}
        <div className="flex items-center gap-2 neu-inset-sm px-3.5 py-2 rounded-xl text-xs self-start sm:self-auto">
          <span className="text-neu-muted font-bold text-[11px] uppercase tracking-wider">Auto Refresh:</span>
          <select className="bg-transparent border-0 outline-none font-bold text-neu-accent cursor-pointer">
            <option value="off">Off</option>
            <option value="30s">30s</option>
            <option value="1m">1m</option>
          </select>
        </div>
      </div>

      {/* ─── Timer Action Control Bar ─── */}
      <div className="card-panel flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="w-10 h-10 rounded-xl neu-inset flex items-center justify-center text-neu-accent">
            <Clock size={20} />
          </div>
          <input
            type="text"
            placeholder={activeEntry ? `Currently tracking: ${activeEntry.description || 'Active Session'}` : "What are you working on right now?"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={Boolean(activeEntry)}
            className="flex-1 input-custom"
          />
        </div>

        <div>
          {activeEntry ? (
            <button
              onClick={() => stopMutation.mutate(activeEntry._id)}
              disabled={stopMutation.isPending}
              className="btn-danger flex items-center gap-2 text-xs py-2 px-5 font-bold"
            >
              <Square size={14} className="fill-current" />
              {stopMutation.isPending ? 'Stopping...' : 'Stop Timer'}
            </button>
          ) : (
            <button
              onClick={() => startMutation.mutate({ description })}
              disabled={startMutation.isPending}
              className="btn-primary text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-xs py-2 px-5 font-bold"
            >
              <Play size={14} className="fill-current" />
              {startMutation.isPending ? 'Starting...' : 'Start Timer'}
            </button>
          )}
        </div>
      </div>

      {timerError && (
        <div className="neu-inset-sm text-rose-500 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{timerError}</span>
        </div>
      )}

      {/* ─── Report Filter Controls Bar ─── */}
      <div className="card-panel space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 items-end text-xs">
          <div>
            <label className="block font-bold text-neu-muted mb-1.5 uppercase tracking-wider text-[11px]">Team</label>
            <select className="w-full input-custom py-2">
              <option>All Employees</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-neu-muted mb-1.5 uppercase tracking-wider text-[11px]">Range</label>
            <select
              value={rangeType}
              onChange={(e) => handleRangeChange(e.target.value as any)}
              className="w-full input-custom py-2 cursor-pointer font-bold"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-neu-muted mb-1.5 uppercase tracking-wider text-[11px]">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setRangeType('custom');
              }}
              className="w-full input-custom py-2 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-neu-muted mb-1.5 uppercase tracking-wider text-[11px]">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setRangeType('custom');
              }}
              className="w-full input-custom py-2 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-neu-muted mb-1.5 uppercase tracking-wider text-[11px]">Day Reset</label>
            <select
              value={dayReset}
              onChange={(e) => setDayReset(e.target.value)}
              className="w-full input-custom py-2 cursor-pointer"
            >
              <option value="04:00">04:00 to 03:59 Next day</option>
              <option value="00:00">00:00 (Midnight)</option>
              <option value="06:00">06:00 (Early)</option>
            </select>
          </div>

          <div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2"
            >
              <RotateCw size={14} className={isFetching ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Sub Tabs Pill Row ─── */}
      <div className="inline-flex p-1.5 neu-inset rounded-2xl gap-2">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border-none ${
            activeTab === 'summary'
              ? 'neu-raised text-neu-accent shadow-neu-raised-sm'
              : 'bg-transparent text-neu-muted hover:text-neu-primary'
          }`}
        >
          <User size={14} />
          <span>Employee Summary</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'summary' ? 'neu-inset-sm text-neu-accent' : 'neu-inset-sm text-neu-muted'}`}>
            1
          </span>
        </button>
        <button
          onClick={() => setActiveTab('productivity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border-none ${
            activeTab === 'productivity'
              ? 'neu-raised text-neu-accent shadow-neu-raised-sm'
              : 'bg-transparent text-neu-muted hover:text-neu-primary'
          }`}
        >
          <TrendingUp size={14} />
          <span>Productivity Summary</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'productivity' ? 'neu-inset-sm text-neu-accent' : 'neu-inset-sm text-neu-muted'}`}>
            0/1
          </span>
        </button>
      </div>

      {/* ─── Soft Neumorphic Summary KPI Cards Grid ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="card-panel !p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-neu-muted uppercase tracking-wider">Time Worked</span>
            <div className="w-7 h-7 rounded-full neu-inset flex items-center justify-center text-neu-accent">
              <Clock size={14} />
            </div>
          </div>
          <h2 className="text-xl font-black text-neu-accent tabular-nums m-0">{formatHours(totalWorkedSeconds)}</h2>
        </div>

        <div className="card-panel !p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-neu-muted uppercase tracking-wider">Timer (Active)</span>
            <div className="w-7 h-7 rounded-full neu-inset flex items-center justify-center text-emerald-500">
              <Play size={14} />
            </div>
          </div>
          <h2 className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums m-0">{formatHours(timerActiveSeconds)}</h2>
        </div>

        <div className="card-panel !p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-neu-muted uppercase tracking-wider">Manual Entry</span>
            <div className="w-7 h-7 rounded-full neu-inset flex items-center justify-center text-amber-500">
              <Briefcase size={14} />
            </div>
          </div>
          <h2 className="text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums m-0">{formatHours(manualEntrySeconds)}</h2>
        </div>

        <div className="card-panel !p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-neu-muted uppercase tracking-wider">Meeting / Break</span>
            <div className="w-7 h-7 rounded-full neu-inset flex items-center justify-center text-teal-500">
              <Users size={14} />
            </div>
          </div>
          <h2 className="text-xl font-black text-teal-600 dark:text-teal-400 tabular-nums m-0">{formatHours(breakSecondsTotal)}</h2>
        </div>

        <div className="card-panel !p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-neu-muted uppercase tracking-wider">Idle Time</span>
            <div className="w-7 h-7 rounded-full neu-inset flex items-center justify-center text-rose-500">
              <Coffee size={14} />
            </div>
          </div>
          <h2 className="text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums m-0">{formatHours(idleSecondsTotal)}</h2>
        </div>

        <div className="card-panel !p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-neu-muted uppercase tracking-wider">Employees</span>
            <div className="w-7 h-7 rounded-full neu-inset flex items-center justify-center text-neu-primary">
              <User size={14} />
            </div>
          </div>
          <h2 className="text-xl font-black text-neu-primary tabular-nums m-0">{entries.length > 0 ? 1 : 0}</h2>
        </div>
      </div>

      {/* ─── Activity Timeline Card ─── */}
      <div className="card-panel space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 neu-inset-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Activity size={19} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-neu-primary leading-tight m-0">Activity Timeline</h2>
              <p className="text-xs text-neu-muted m-0 font-medium">24-hour employee productivity and work status ruler</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3.5 font-bold text-neu-secondary text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" /> Active (Work)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]" /> Idle Time
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0F172A] border border-white/30 shadow-[0_0_8px_rgba(15,23,42,0.7)]" /> Break / Stopped Time
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]" /> Manual
            </span>
          </div>
        </div>

        {/* 24-Hour Timeline Bar & Ruler */}
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
                  timelineSegments.map((seg) => (
                    <div
                      key={seg.id}
                      style={{
                        left: `${seg.left}%`,
                        width: `${seg.width}%`,
                        backgroundColor: seg.color,
                      }}
                      title={`${seg.startTime} → ${seg.endTime} (${seg.label})`}
                      className="absolute top-1.5 bottom-1.5 rounded-lg cursor-pointer hover:brightness-110 hover:shadow-md transition-all"
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Employee Summary Table Card ─── */}
      <div className="space-y-3">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-neu-primary flex items-center gap-2 m-0">
              <User size={16} className="text-neu-accent" />
              Employee Summary
            </h3>
            <p className="text-xs text-neu-muted mt-0.5 font-medium m-0">
              1 employee with recorded activity &bull; Updated just now
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Table Search */}
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3.5 text-indigo-500 dark:text-indigo-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                className="input-custom input-with-icon-left pl-11 py-1.5 text-xs w-48"
              />
            </div>

            {/* HH:MM / Decimal Toggle */}
            <div className="inline-flex p-1 neu-inset-sm rounded-xl text-xs gap-1">
              <button
                type="button"
                onClick={() => setFormatType('hhmm')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border-none ${
                  formatType === 'hhmm'
                    ? 'neu-raised text-neu-accent shadow-neu-raised-sm'
                    : 'bg-transparent text-neu-muted hover:text-neu-primary'
                }`}
              >
                HH:MM
              </button>
              <button
                type="button"
                onClick={() => setFormatType('decimal')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border-none ${
                  formatType === 'decimal'
                    ? 'neu-raised text-neu-accent shadow-neu-raised-sm'
                    : 'bg-transparent text-neu-muted hover:text-neu-primary'
                }`}
              >
                Decimal
              </button>
            </div>

            <button
              type="button"
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold"
            >
              <Columns size={13} className="text-neu-muted" />
              <span>Columns</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const csvRows = [
                  ['Employee', 'Activity Span', 'Time Worked', 'Timer', 'Meeting Hours', 'Manual Entry', '% Active Minutes', '% Active Sec'],
                  [
                    user?.name || 'User Account',
                    activitySpan,
                    formatClockTime(totalWorkedSeconds),
                    formatClockTime(timerActiveSeconds),
                    formatClockTime(breakSecondsTotal),
                    formatClockTime(manualEntrySeconds),
                    `${activePercent}%`,
                    `${Math.round(activePercent * 0.95)}%`
                  ]
                ];
                const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement('a');
                link.setAttribute('href', encodedUri);
                link.setAttribute('download', `employee_summary_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                link.remove();
              }}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold"
            >
              <Download size={13} className="text-neu-muted" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="table-custom-wrapper">
          <div className="overflow-x-auto">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>ACTIVITY SPAN</th>
                  <th className="text-center">TIME WORKED</th>
                  <th className="text-center">TIMER</th>
                  <th className="text-center">MEETING HOURS</th>
                  <th className="text-center">MANUAL ENTRY</th>
                  <th>% ACTIVE MINUTES</th>
                  <th>% ACTIVE SEC</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {/* Employee Name & Sublinks */}
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full neu-raised flex items-center justify-center text-xs font-bold text-neu-accent">
                        {(user?.name || 'User').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-neu-primary leading-tight m-0">
                          {user?.name || 'User Account'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Link
                            to="/screenshots"
                            className="text-[11px] font-bold text-neu-accent hover:underline no-underline"
                          >
                            Screenshots
                          </Link>
                          <span className="badge-indigo text-[10px] py-0 px-1.5">
                            AUTO
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Activity Span */}
                  <td>
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-neu-primary">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${entries.length > 0 ? 'bg-emerald-500' : 'bg-neu-muted'}`} />
                        <span className="font-mono text-xs tabular-nums">{activitySpan}</span>
                      </div>
                      <p className="text-[11px] text-neu-muted mt-1 m-0">
                        {entries.length > 0 ? `${entries.length} recorded session${entries.length > 1 ? 's' : ''}` : 'No sessions'}
                      </p>
                    </div>
                  </td>

                  {/* Time Worked */}
                  <td className="text-center">
                    <span className="badge-emerald font-mono font-bold text-xs tabular-nums">
                      {formatClockTime(totalWorkedSeconds)}
                    </span>
                  </td>

                  {/* Timer */}
                  <td className="text-center">
                    <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatClockTime(timerActiveSeconds)}
                    </span>
                  </td>

                  {/* Meeting Hours */}
                  <td className="text-center">
                    <span className="font-mono text-xs text-neu-muted tabular-nums">
                      {formatClockTime(breakSecondsTotal)}
                    </span>
                  </td>

                  {/* Manual Entry */}
                  <td className="text-center">
                    <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400 tabular-nums">
                      {formatClockTime(manualEntrySeconds)}
                    </span>
                  </td>

                  {/* % Active Minutes */}
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs text-neu-primary w-9 shrink-0 tabular-nums">{activePercent}%</span>
                      <div className="w-28 h-2.5 neu-inset-sm rounded-full overflow-hidden p-0.5 flex" title={`Active: ${activePercent}% | Idle: ${idlePercent}% | Break: ${breakPercent}%`}>
                        <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${activePercent}%` }} />
                        {idlePercent > 0 && (
                          <div className="h-full bg-rose-500 transition-all" style={{ width: `${idlePercent}%` }} />
                        )}
                        {breakPercent > 0 && (
                          <div className="h-full bg-[#0F172A] rounded-r-full transition-all" style={{ width: `${breakPercent}%` }} />
                        )}
                      </div>
                    </div>
                  </td>

                  {/* % Active Sec */}
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs text-neu-primary w-9 shrink-0 tabular-nums">{Math.round(activePercent * 0.95)}%</span>
                      <div className="w-28 h-2.5 neu-inset-sm rounded-full overflow-hidden p-0.5 flex" title={`Active: ${Math.round(activePercent * 0.95)}% | Idle: ${idlePercent}% | Break: ${breakPercent}%`}>
                        <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${Math.round(activePercent * 0.95)}%` }} />
                        {idlePercent > 0 && (
                          <div className="h-full bg-rose-500 transition-all" style={{ width: `${idlePercent}%` }} />
                        )}
                        {breakPercent > 0 && (
                          <div className="h-full bg-[#0F172A] rounded-r-full transition-all" style={{ width: `${breakPercent}%` }} />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;
