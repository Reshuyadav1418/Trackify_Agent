import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getActivityReportApi, getUsersApi } from '../../api/services';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorAlert } from '../../components/ErrorAlert';
import { EmptyState } from '../../components/EmptyState';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Activity, Keyboard, MousePointer, Clock, Filter } from 'lucide-react';

export const ActivityChartsPage: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<string>('all');

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsersApi,
  });

  const { data: activityData, isLoading, error } = useQuery({
    queryKey: ['activityReport'],
    queryFn: () => getActivityReportApi(),
  });

  if (isLoading) return <LoadingSpinner label="Loading activity analytics..." />;
  if (error) return <ErrorAlert message={(error as Error).message} />;

  const apiUsers = usersData?.users || [];
  const samples = activityData?.reports || [];
  const sampleUserNames = Array.from(new Set(samples.map((s: any) => s.user).filter(Boolean)));
  const existingNames = new Set(apiUsers.map((u: any) => u.name));
  const fallbackUsers = sampleUserNames
    .filter((name) => !existingNames.has(name))
    .map((name) => ({ _id: name, name, role: 'member' }));
  const users = [...apiUsers, ...fallbackUsers];

  // Filter samples by selected user
  const filteredSamples = samples.filter((s: any) => {
    return selectedUser === 'all' || s.user === selectedUser || s.userEmail === selectedUser;
  });

  // Group activity data by minute/time for line/area chart
  const timeMap: Record<string, { time: string; keyboard: number; mouse: number; idle: number; active: number }> = {};

  filteredSamples.forEach((sample: any) => {
    const timeStr = new Date(sample.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!timeMap[timeStr]) {
      timeMap[timeStr] = { time: timeStr, keyboard: 0, mouse: 0, idle: 0, active: 0 };
    }
    timeMap[timeStr].keyboard += sample.keyboardCount || 0;
    timeMap[timeStr].mouse += sample.mouseCount || 0;
    if (sample.isIdle) {
      timeMap[timeStr].idle += 1;
    } else {
      timeMap[timeStr].active += 1;
    }
  });

  const chartData = Object.values(timeMap).slice(-30); // Last 30 time buckets

  // Calculate summary totals
  const totalKeyboard = filteredSamples.reduce((acc: number, s: any) => acc + (s.keyboardCount || 0), 0);
  const totalMouse = filteredSamples.reduce((acc: number, s: any) => acc + (s.mouseCount || 0), 0);
  const idleCount = filteredSamples.filter((s: any) => s.isIdle).length;
  const activeCount = filteredSamples.length - idleCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Activity Charts</h1>
          <p className="page-subtitle">Minute-level keyboard and mouse metrics, idle time analytics.</p>
        </div>

        {/* User filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="input-custom text-xs cursor-pointer"
          >
            <option value="all">All Team Members</option>
            {users.map((u: any) => (
              <option key={u._id} value={u.name}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-panel flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
            <Keyboard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Keyboard Keypresses</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-0.5">{totalKeyboard.toLocaleString()}</p>
          </div>
        </div>

        <div className="card-panel flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <MousePointer className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Mouse Clicks</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-0.5">{totalMouse.toLocaleString()}</p>
          </div>
        </div>

        <div className="card-panel flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Active Samples</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-0.5">{activeCount}</p>
          </div>
        </div>

        <div className="card-panel flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Idle Samples</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-0.5">{idleCount}</p>
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <EmptyState title="No Activity Data" message="No keyboard/mouse activity samples recorded yet." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Keypress & Mouse Area Chart */}
          <div className="card-panel">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Input Activity Over Time</h3>
            <p className="text-xs text-[var(--text-muted)] mb-6">Keyboard strokes vs mouse clicks per minute bucket.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorKeyboard" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMouse" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-modal)', borderColor: 'var(--border-color)', borderRadius: '0.75rem', color: 'var(--text-primary)' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="keyboard"
                    name="Keyboard Strokes"
                    stroke="#818cf8"
                    fillOpacity={1}
                    fill="url(#colorKeyboard)"
                  />
                  <Area
                    type="monotone"
                    dataKey="mouse"
                    name="Mouse Clicks"
                    stroke="#34d399"
                    fillOpacity={1}
                    fill="url(#colorMouse)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Active vs Idle Bar Chart */}
          <div className="card-panel">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Active vs Idle State</h3>
            <p className="text-xs text-[var(--text-muted)] mb-6">Distribution of active and idle state flags.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-modal)', borderColor: 'var(--border-color)', borderRadius: '0.75rem', color: 'var(--text-primary)' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="active" name="Active Minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="idle" name="Idle Minutes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityChartsPage;

