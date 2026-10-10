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
  Coffee,
  Briefcase,
  Users,
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
            <select className="w-full input-custom py-2">
              <option>Custom</option>
              <option>Today</option>
              <option>This Week</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-neu-muted mb-1.5 uppercase tracking-wider text-[11px]">Start Date</label>
            <input type="date" defaultValue="2026-09-30" className="w-full input-custom py-2" />
          </div>

          <div>
            <label className="block font-bold text-neu-muted mb-1.5 uppercase tracking-wider text-[11px]">End Date</label>
            <input type="date" defaultValue="2026-09-30" className="w-full input-custom py-2" />
          </div>

          <div>
            <label className="block font-bold text-neu-muted mb-1.5 uppercase tracking-wider text-[11px]">Day Reset</label>
            <select className="w-full input-custom py-2">
              <option>04:00 to 03:59 Next day</option>
            </select>
          </div>

          <div>
            <button
              onClick={() => refetch()}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2"
            >
              <RotateCw size={14} />
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
          <h2 className="text-xl font-black text-neu-accent tabular-nums m-0">{formatHours(totalDurationSeconds)}</h2>
        </div>

        <div className="card-panel !p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-neu-muted uppercase tracking-wider">Timer (Active)</span>
            <div className="w-7 h-7 rounded-full neu-inset flex items-center justify-center text-emerald-500">
              <Play size={14} />
            </div>
          </div>
          <h2 className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums m-0">{formatHours(totalDurationSeconds)}</h2>
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
            <span className="text-[10px] font-bold text-neu-muted uppercase tracking-wider">Meeting Hours</span>
            <div className="w-7 h-7 rounded-full neu-inset flex items-center justify-center text-teal-500">
              <Users size={14} />
            </div>
          </div>
          <h2 className="text-xl font-black text-teal-600 dark:text-teal-400 tabular-nums m-0">0h</h2>
        </div>

        <div className="card-panel !p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-neu-muted uppercase tracking-wider">Idle Time</span>
            <div className="w-7 h-7 rounded-full neu-inset flex items-center justify-center text-rose-500">
              <Coffee size={14} />
            </div>
          </div>
          <h2 className="text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums m-0">{formatHours(idleTimeSeconds)}</h2>
        </div>

        <div className="card-panel !p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-neu-muted uppercase tracking-wider">Employees</span>
            <div className="w-7 h-7 rounded-full neu-inset flex items-center justify-center text-neu-primary">
              <User size={14} />
            </div>
          </div>
          <h2 className="text-xl font-black text-neu-primary tabular-nums m-0">1</h2>
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
                          <a
                            href="/screenshots"
                            className="text-[11px] font-bold text-neu-accent hover:underline no-underline"
                          >
                            Screenshots
                          </a>
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
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-mono text-xs tabular-nums">09:14</span>
                        <span className="text-neu-muted font-normal">➔</span>
                        <span className="font-mono text-xs tabular-nums">16:32</span>
                      </div>
                      <p className="text-[11px] text-neu-muted mt-1 m-0">Updated 3 min ago</p>
                    </div>
                  </td>

                  {/* Time Worked */}
                  <td className="text-center">
                    <span className="badge-emerald font-mono font-bold text-xs tabular-nums">
                      {formatClockTime(totalDurationSeconds)}
                    </span>
                  </td>

                  {/* Timer */}
                  <td className="text-center">
                    <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatClockTime(totalDurationSeconds)}
                    </span>
                  </td>

                  {/* Meeting Hours */}
                  <td className="text-center">
                    <span className="font-mono text-xs text-neu-muted tabular-nums">
                      00:00
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
                      <span className="font-mono font-bold text-xs text-neu-primary w-9 shrink-0 tabular-nums">95%</span>
                      <div className="w-24 h-2.5 neu-inset-sm rounded-full overflow-hidden p-0.5">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '95%' }} />
                      </div>
                    </div>
                  </td>

                  {/* % Active Sec */}
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs text-neu-primary w-9 shrink-0 tabular-nums">42%</span>
                      <div className="w-24 h-2.5 neu-inset-sm rounded-full overflow-hidden p-0.5">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '42%' }} />
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
