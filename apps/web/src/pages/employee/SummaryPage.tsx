import React, { useState } from 'react';
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
} from 'lucide-react';

export const SummaryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [timerError, setTimerError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'productivity'>('summary');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [formatType, setFormatType] = useState<'hhmm' | 'decimal'>('hhmm');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: getTimeEntriesApi,
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

  if (isLoading) return <LoadingSpinner label="Loading employee summary report..." />;
  if (isError) return <ErrorAlert message={(error as any)?.message || 'Failed to load time entries'} onRetry={refetch} />;

  const entries = data?.timeEntries || [];
  const activeEntry = entries.find((e: any) => !e.end);

  // Calculate stats
  let totalDurationSeconds = entries.reduce((acc: number, e: any) => acc + (e.durationSeconds || 0), 0);
  let manualEntrySeconds = entries.filter((e: any) => e.isManualEdit).reduce((acc: number, e: any) => acc + (e.durationSeconds || 0), 0);
  let idleTimeSeconds = 240; // 4 mins sample idle

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
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Employee Summary</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Review employee time, client billability, and productivity from one unified report.
          </p>
        </div>

        {/* Auto Refresh Select */}
        <div className="flex items-center gap-2 bg-[var(--bg-card)] px-3.5 py-2 rounded-xl border border-[var(--border-color)] text-xs shadow-xs self-start sm:self-auto">
          <span className="text-[var(--text-muted)] font-medium">Auto Refresh:</span>
          <select className="bg-transparent border-0 outline-none font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer">
            <option value="off">Off</option>
            <option value="30s">30s</option>
            <option value="1m">1m</option>
          </select>
        </div>
      </div>

      {/* ─── Timer Action Control Bar ─── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className={`p-2.5 rounded-xl ${activeEntry ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            <Clock className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder={activeEntry ? `Currently tracking: ${activeEntry.description || 'Active Session'}` : "What are you working on right now?"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={Boolean(activeEntry)}
            className="flex-1 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
          />
        </div>

        <div>
          {activeEntry ? (
            <button
              onClick={() => stopMutation.mutate(activeEntry._id)}
              disabled={stopMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Square className="w-4 h-4 fill-white" />
              {stopMutation.isPending ? 'Stopping...' : 'Stop Timer'}
            </button>
          ) : (
            <button
              onClick={() => startMutation.mutate({ description })}
              disabled={startMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              {startMutation.isPending ? 'Starting...' : 'Start Timer'}
            </button>
          )}
        </div>
      </div>

      {timerError && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{timerError}</span>
        </div>
      )}

      {/* ─── Report Filter Controls Bar ─── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 items-end text-xs">
          <div>
            <label className="block font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider text-[11px]">Team</label>
            <select className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] font-medium cursor-pointer shadow-xs">
              <option>All Employees</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider text-[11px]">Range</label>
            <select className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] font-medium cursor-pointer shadow-xs">
              <option>Custom</option>
              <option>Today</option>
              <option>This Week</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider text-[11px]">Start Date</label>
            <input type="date" defaultValue="2026-09-30" className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] font-medium cursor-pointer shadow-xs" />
          </div>

          <div>
            <label className="block font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider text-[11px]">End Date</label>
            <input type="date" defaultValue="2026-09-30" className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] font-medium cursor-pointer shadow-xs" />
          </div>

          <div>
            <label className="block font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider text-[11px]">Day Reset</label>
            <select className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] font-medium cursor-pointer shadow-xs">
              <option>04:00 to 03:59 Next day</option>
            </select>
          </div>

          <div>
            <button
              onClick={() => refetch()}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ─── Sub Tabs Pill Row ─── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'summary'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Employee Summary
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'summary' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
            1
          </span>
        </button>
        <button
          onClick={() => setActiveTab('productivity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'productivity'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Productivity Summary
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'productivity' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
            0/1
          </span>
        </button>
      </div>

      {/* ─── Colorful Summary KPI Cards Grid ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-4 rounded-2xl shadow-sm space-y-1">
          <h2 className="text-xl font-extrabold">{formatHours(totalDurationSeconds)}</h2>
          <p className="text-[11px] font-semibold text-indigo-100 uppercase tracking-wider">Time Worked</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-4 rounded-2xl shadow-sm space-y-1">
          <h2 className="text-xl font-extrabold">{formatHours(totalDurationSeconds)}</h2>
          <p className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wider">Timer (Active)</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-4 rounded-2xl shadow-sm space-y-1">
          <h2 className="text-xl font-extrabold">{formatHours(manualEntrySeconds)}</h2>
          <p className="text-[11px] font-semibold text-amber-100 uppercase tracking-wider">Manual Entry</p>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white p-4 rounded-2xl shadow-sm space-y-1">
          <h2 className="text-xl font-extrabold">0h</h2>
          <p className="text-[11px] font-semibold text-teal-100 uppercase tracking-wider">Meeting Hours</p>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white p-4 rounded-2xl shadow-sm space-y-1">
          <h2 className="text-xl font-extrabold">{formatHours(idleTimeSeconds)}</h2>
          <p className="text-[11px] font-semibold text-rose-100 uppercase tracking-wider">Idle Time</p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-2xl shadow-xs space-y-1">
          <h2 className="text-xl font-extrabold text-[var(--text-primary)]">1</h2>
          <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Employees Worked</p>
        </div>
      </div>

      {/* ─── Main Employee Summary Table Card ─── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs space-y-4">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-color)]/60">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />
              Employee Summary
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              1 employee with recorded activity &bull; Updated just now
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Table Search */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search employees.."
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-48 transition-all"
              />
            </div>

            {/* HH:MM / Decimal Toggle */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-[var(--border-color)] text-xs">
              <button
                type="button"
                onClick={() => setFormatType('hhmm')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  formatType === 'hhmm'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                HH:MM
              </button>
              <button
                type="button"
                onClick={() => setFormatType('decimal')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  formatType === 'decimal'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Decimal
              </button>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--bg-card-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold cursor-pointer shadow-xs transition-colors"
            >
              <Columns className="w-3.5 h-3.5 text-slate-400" />
              Columns
            </button>

            <button
              type="button"
              onClick={() => {
                const csvRows = [
                  ['Employee', 'Activity Span', 'Time Worked', 'Timer', 'Meeting Hours', 'Manual Entry', '% Active Minutes', '% Active Sec'],
                  [
                    user?.name || 'User Account',
                    '09:14 - 16:32',
                    formatClockTime(totalDurationSeconds),
                    formatClockTime(totalDurationSeconds),
                    '00:00',
                    formatClockTime(manualEntrySeconds),
                    '95%',
                    '42%'
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--bg-card-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold cursor-pointer shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Export
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <table className="w-full min-w-[1020px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-900/60 border-b border-[var(--border-color)] text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th scope="col" className="px-5 py-3.5 whitespace-nowrap min-w-[220px]">
                  EMPLOYEE
                </th>
                <th scope="col" className="px-5 py-3.5 whitespace-nowrap min-w-[180px]">
                  ACTIVITY SPAN
                </th>
                <th scope="col" className="px-4 py-3.5 whitespace-nowrap text-center min-w-[125px]">
                  <span className="inline-flex items-center gap-1">
                    TIME WORKED
                    <span className="text-indigo-600 dark:text-indigo-400">▴</span>
                  </span>
                </th>
                <th scope="col" className="px-4 py-3.5 whitespace-nowrap text-center min-w-[110px]">
                  TIMER
                </th>
                <th scope="col" className="px-4 py-3.5 whitespace-nowrap text-center min-w-[130px]">
                  MEETING HOURS
                </th>
                <th scope="col" className="px-4 py-3.5 whitespace-nowrap text-center min-w-[130px]">
                  MANUAL ENTRY
                </th>
                <th scope="col" className="px-5 py-3.5 whitespace-nowrap min-w-[180px]">
                  % ACTIVE MINUTES
                </th>
                <th scope="col" className="px-5 py-3.5 whitespace-nowrap min-w-[180px]">
                  % ACTIVE SEC
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                {/* Employee Name & Sublinks */}
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0 border border-indigo-200/50 dark:border-indigo-800/40">
                      {(user?.name || 'User').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[var(--text-primary)] leading-tight">
                        {user?.name || 'User Account'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <a
                          href="/screenshots"
                          className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
                        >
                          Screenshots
                        </a>
                        <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-[var(--border-color)] tracking-wider">
                          AUTO
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Activity Span */}
                <td className="px-5 py-4 whitespace-nowrap">
                  <div>
                    <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                      <span className="font-mono text-xs">09:14</span>
                      <span className="text-slate-400 font-normal">➔</span>
                      <span className="font-mono text-xs">16:32</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">Updated 3 min ago</p>
                  </div>
                </td>

                {/* Time Worked */}
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50 shadow-2xs">
                    {formatClockTime(totalDurationSeconds)}
                  </span>
                </td>

                {/* Timer */}
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                    {formatClockTime(totalDurationSeconds)}
                  </span>
                </td>

                {/* Meeting Hours */}
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    00:00
                  </span>
                </td>

                {/* Manual Entry */}
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                    {formatClockTime(manualEntrySeconds)}
                  </span>
                </td>

                {/* % Active Minutes */}
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs text-[var(--text-primary)] w-9 shrink-0">95%</span>
                    <div className="w-24 h-2 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: '95%' }} />
                    </div>
                  </div>
                </td>

                {/* % Active Sec */}
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs text-[var(--text-primary)] w-9 shrink-0">42%</span>
                    <div className="w-24 h-2 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: '42%' }} />
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>

            {/* Table Footer / Summary Row */}
            <tfoot>
              <tr className="bg-slate-50/90 dark:bg-slate-900/80 font-bold border-t-2 border-[var(--border-color)] text-xs text-[var(--text-primary)]">
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span className="font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                    TOTAL (1 employees)
                  </span>
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap text-[var(--text-muted)]">-</td>
                <td className="px-4 py-3.5 whitespace-nowrap text-center">
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatClockTime(totalDurationSeconds)}
                  </span>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-center">
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatClockTime(totalDurationSeconds)}
                  </span>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-center text-[var(--text-muted)] font-mono">
                  00:00
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                  {formatClockTime(manualEntrySeconds)}
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-[var(--text-primary)]">
                  95%
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-[var(--text-primary)]">
                  42%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;

