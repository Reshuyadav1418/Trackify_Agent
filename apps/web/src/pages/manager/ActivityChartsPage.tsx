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
        <div className="flex items-center gap-2 neu-inset-sm px-3 py-2 rounded-xl">
          <Filter size={14} className="text-neu-muted" />
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="bg-transparent border-none p-0 text-xs text-neu-primary font-bold cursor-pointer outline-none"
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
          <div className="w-12 h-12 rounded-2xl neu-inset flex items-center justify-center text-neu-accent">
            <Keyboard size={22} />
          </div>
          <div>
            <p className="text-[11px] text-neu-muted font-bold uppercase tracking-wider m-0">Keyboard Strokes</p>
            <p className="text-2xl font-black text-neu-primary mt-0.5 tabular-nums m-0">{totalKeyboard.toLocaleString()}</p>
          </div>
        </div>

        <div className="card-panel flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-inset flex items-center justify-center text-emerald-500">
            <MousePointer size={22} />
          </div>
          <div>
            <p className="text-[11px] text-neu-muted font-bold uppercase tracking-wider m-0">Mouse Clicks</p>
            <p className="text-2xl font-black text-neu-primary mt-0.5 tabular-nums m-0">{totalMouse.toLocaleString()}</p>
          </div>
        </div>

        <div className="card-panel flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-inset flex items-center justify-center text-blue-500">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-[11px] text-neu-muted font-bold uppercase tracking-wider m-0">Active Samples</p>
            <p className="text-2xl font-black text-neu-primary mt-0.5 tabular-nums m-0">{activeCount.toLocaleString()}</p>
          </div>
        </div>

        <div className="card-panel flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-inset flex items-center justify-center text-amber-500">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[11px] text-neu-muted font-bold uppercase tracking-wider m-0">Idle Samples</p>
            <p className="text-2xl font-black text-neu-primary mt-0.5 tabular-nums m-0">{idleCount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <EmptyState title="No Activity Data" message="No keyboard/mouse activity samples recorded yet." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Keypress & Mouse Area Chart */}
          <div className="card-panel">
            <h3 className="text-base font-extrabold text-neu-primary mb-1">Input Activity Over Time</h3>
            <p className="text-xs text-neu-muted mb-6 font-medium">Keyboard strokes vs mouse clicks per minute bucket.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorKeyboard" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5B6CFF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#5B6CFF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMouse" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg)', border: 'none', borderRadius: '1rem', boxShadow: 'var(--shadow-raised-lg)', color: 'var(--text-primary)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                  <Area
                    type="monotone"
                    dataKey="keyboard"
                    name="Keyboard Strokes"
                    stroke="#5B6CFF"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorKeyboard)"
                  />
                  <Area
                    type="monotone"
                    dataKey="mouse"
                    name="Mouse Clicks"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMouse)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Active vs Idle Bar Chart */}
          <div className="card-panel">
            <h3 className="text-base font-extrabold text-neu-primary mb-1">Active vs Idle State</h3>
            <p className="text-xs text-neu-muted mb-6 font-medium">Distribution of active and idle state flags.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg)', border: 'none', borderRadius: '1rem', boxShadow: 'var(--shadow-raised-lg)', color: 'var(--text-primary)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                  <Bar dataKey="active" name="Active Minutes" fill="#5B6CFF" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="idle" name="Idle Minutes" fill="#F59E0B" radius={[6, 6, 0, 0]} />
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
