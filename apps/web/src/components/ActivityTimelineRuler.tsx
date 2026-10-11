import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Clock, AlertCircle } from 'lucide-react';
import {
  buildTimelineSegments,
  TimelineSegment,
  TimelineStatus,
  TIMELINE_COLORS,
} from '@teamlogger/shared';
import { getTimelineApi } from '../api/services';

interface ActivityTimelineRulerProps {
  userId?: string;
  dateStr?: string; // 'YYYY-MM-DD'
  dayReset?: string; // default '04:00'
  fallbackTimeEntries?: any[];
  title?: string;
  subtitle?: string;
  className?: string;
  onSelectSegment?: (segment: TimelineSegment) => void;
}

export const ActivityTimelineRuler: React.FC<ActivityTimelineRulerProps> = ({
  userId,
  dateStr,
  dayReset = '04:00',
  fallbackTimeEntries = [],
  title = 'Activity Timeline',
  subtitle = '24-hour employee productivity and work status ruler',
  className = '',
  onSelectSegment,
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<TimelineSegment | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<TimelineStatus | null>(null);

  // Check if viewing today's date
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const activeDateStr = dateStr || todayStr;
  const isToday = activeDateStr === todayStr;

  // Real-time smooth local clock tick (1-second updates when viewing today)
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isToday]);

  // Server data query (auto-polls every 15-30s if today, pauses on background tab)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['timeline', userId, activeDateStr, dayReset],
    queryFn: () =>
      getTimelineApi({
        userId,
        dateStr: activeDateStr,
        dayReset,
      }),
    refetchInterval: isToday ? 15000 : false,
    refetchIntervalInBackground: false,
    staleTime: isToday ? 10000 : 5 * 60 * 1000,
  });

  // 24 Hourly Labels based on dayReset (e.g. 04:00 to 03:00)
  const timelineHours = useMemo(() => {
    const [startH] = (dayReset || '04:00').split(':').map(Number);
    const startHour = isNaN(startH) ? 4 : startH;
    const hours: string[] = [];
    for (let i = 0; i < 24; i++) {
      const hr = (startHour + i) % 24;
      hours.push(`${String(hr).padStart(2, '0')}:00`);
    }
    return hours;
  }, [dayReset]);

  // Compute 24-hour cycle window start & end in milliseconds
  const { windowStartMs, windowEndMs, windowDurationMs } = useMemo(() => {
    const [startH, startM] = (dayReset || '04:00').split(':').map(Number);
    const validH = isNaN(startH) ? 4 : startH;
    const validM = isNaN(startM) ? 0 : startM;

    const cycleStart = new Date(`${activeDateStr}T00:00:00`);
    cycleStart.setHours(validH, validM, 0, 0);

    const startMs = cycleStart.getTime();
    const durationMs = 24 * 60 * 60 * 1000;
    return {
      windowStartMs: startMs,
      windowEndMs: startMs + durationMs,
      windowDurationMs: durationMs,
    };
  }, [activeDateStr, dayReset]);

  // Now Marker percentage position
  const nowMarkerLeft = useMemo(() => {
    if (!isToday) return null;
    if (currentTime < windowStartMs || currentTime > windowEndMs) return null;
    return ((currentTime - windowStartMs) / windowDurationMs) * 100;
  }, [currentTime, windowStartMs, windowEndMs, windowDurationMs, isToday]);

  // Single source of truth segments computation
  const segments: TimelineSegment[] = useMemo(() => {
    const entries = data?.timeEntries || fallbackTimeEntries;
    const samples = data?.activitySamples || [];
    const screenshots = data?.screenshots || [];

    // If no samples/screenshots and server provided segments, use server segments directly
    if (samples.length === 0 && screenshots.length === 0 && data?.segments && data.segments.length > 0) {
      return data.segments as TimelineSegment[];
    }

    return buildTimelineSegments({
      timeEntries: entries,
      activitySamples: samples,
      screenshots,
      currentTime,
      dayReset,
      dateStr: activeDateStr,
    });
  }, [data, fallbackTimeEntries, currentTime, dayReset, activeDateStr]);

  // Filtered segments if legend item clicked
  const displayedSegments = useMemo(() => {
    if (!statusFilter) return segments;
    return segments.filter((s: TimelineSegment) => s.status === statusFilter);
  }, [segments, statusFilter]);

  // Formatter for duration
  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const handleMouseEnter = (seg: TimelineSegment, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredSegment(seg);
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
  };

  const handleMouseLeave = () => {
    setHoveredSegment(null);
    setTooltipPos(null);
  };

  return (
    <div className={`card-panel space-y-4 ${className}`}>
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-indigo-500/20 neu-inset-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Activity size={19} className={isToday ? 'animate-pulse' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-neu-primary leading-tight m-0">{title}</h2>
              {isToday && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live
                </span>
              )}
            </div>
            <p className="text-xs text-neu-muted m-0 font-medium">{subtitle}</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 font-bold text-neu-secondary text-xs select-none">
          {/* Active Work */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? null : 'ACTIVE')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-500/15 ring-2 ring-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'hover:bg-slate-200/50 dark:hover:bg-white/5'
            }`}
            title="Click to toggle highlight"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.7)]"
              style={{ backgroundColor: TIMELINE_COLORS.ACTIVE }}
            />
            <span>Active (Work)</span>
          </button>

          {/* Idle Time */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'IDLE' ? null : 'IDLE')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
              statusFilter === 'IDLE'
                ? 'bg-rose-500/15 ring-2 ring-rose-500 text-rose-600 dark:text-rose-400 font-extrabold'
                : 'hover:bg-slate-200/50 dark:hover:bg-white/5'
            }`}
            title="Click to toggle highlight"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.7)]"
              style={{ backgroundColor: TIMELINE_COLORS.IDLE }}
            />
            <span>Idle Time</span>
          </button>

          {/* Break / Stopped */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'STOPPED' ? null : 'STOPPED')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
              statusFilter === 'STOPPED'
                ? 'bg-slate-900/20 ring-2 ring-slate-700 text-slate-800 dark:text-slate-200 font-extrabold'
                : 'hover:bg-slate-200/50 dark:hover:bg-white/5'
            }`}
            title="Click to toggle highlight"
          >
            <span
              className="w-2.5 h-2.5 rounded-full border border-slate-600 dark:border-white/30 shadow-[0_0_8px_rgba(17,24,39,0.7)]"
              style={{ backgroundColor: TIMELINE_COLORS.STOPPED }}
            />
            <span>Break / Stopped</span>
          </button>

          {/* Manual */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'MANUAL' ? null : 'MANUAL')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
              statusFilter === 'MANUAL'
                ? 'bg-amber-500/15 ring-2 ring-amber-500 text-amber-600 dark:text-amber-400 font-extrabold'
                : 'hover:bg-slate-200/50 dark:hover:bg-white/5'
            }`}
            title="Click to toggle highlight"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.7)]"
              style={{ backgroundColor: TIMELINE_COLORS.MANUAL }}
            />
            <span>Manual</span>
          </button>
        </div>
      </div>

      {/* 24-Hour Ruler & Segment Track */}
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
            <div className="grid grid-cols-24 h-2 border-b border-white/20 dark:border-white/10 mb-2">
              {timelineHours.map((_, idx) => (
                <div key={idx} className="border-l border-white/20 dark:border-white/10 h-full" />
              ))}
            </div>

            {/* Main Activity Track */}
            <div className="relative h-11 w-full neu-inset rounded-xl overflow-hidden bg-slate-200/40 dark:bg-slate-900/40">
              {/* Hour Grid Dividers */}
              <div className="absolute inset-0 grid grid-cols-24 pointer-events-none opacity-20">
                {timelineHours.map((_, idx) => (
                  <div key={idx} className="border-r border-slate-500/40 dark:border-slate-400/20 h-full" />
                ))}
              </div>

              {/* Loading Skeleton */}
              {isLoading && segments.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-200/30 dark:bg-slate-800/30 animate-pulse">
                  <span className="text-xs font-bold text-neu-muted flex items-center gap-2">
                    <Clock size={14} className="animate-spin" />
                    Synchronizing real-time timeline...
                  </span>
                </div>
              ) : isError && segments.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-rose-500 font-bold gap-2">
                  <AlertCircle size={14} />
                  <span>Failed to load timeline: {(error as any)?.message || 'Network error'}</span>
                </div>
              ) : displayedSegments.length === 0 ? (
                /* Empty State */
                <div className="h-full flex items-center justify-center text-xs text-neu-muted font-bold gap-2 select-none">
                  <Clock size={14} className="opacity-60" />
                  <span>No activity for this day</span>
                </div>
              ) : (
                /* Colored Continuous Segments */
                displayedSegments.map((seg, idx) => {
                  const isBlackSegment = seg.status === 'STOPPED';
                  // Outer end rounding for continuous flow
                  const isFirst = idx === 0;
                  const isLast = idx === displayedSegments.length - 1;
                  const roundedClass = isFirst && isLast
                    ? 'rounded-lg'
                    : isFirst
                    ? 'rounded-l-lg'
                    : isLast
                    ? 'rounded-r-lg'
                    : 'rounded-none';

                  return (
                    <div
                      key={seg.id}
                      style={{
                        left: `${seg.left}%`,
                        width: `${seg.width}%`,
                        backgroundColor: seg.color,
                      }}
                      onMouseEnter={(e) => handleMouseEnter(seg, e)}
                      onMouseLeave={handleMouseLeave}
                      onClick={() => onSelectSegment?.(seg)}
                      className={`absolute top-1 bottom-1 ${roundedClass} cursor-pointer transition-all ${
                        isBlackSegment
                          ? 'border border-slate-700/60 dark:border-white/20 dark:bg-black shadow-inner'
                          : 'shadow-sm'
                      } hover:brightness-125 hover:z-20 hover:scale-y-105`}
                    />
                  );
                })
              )}

              {/* Now Marker Line */}
              {nowMarkerLeft !== null && (
                <div
                  style={{ left: `${nowMarkerLeft}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-500 dark:bg-rose-400 z-30 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.9)]"
                >
                  <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Tooltip */}
      {hoveredSegment && tooltipPos && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 12}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white text-xs rounded-xl shadow-2xl px-3 py-2 border border-white/15 backdrop-blur-md space-y-1 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: hoveredSegment.color }}
              />
              <span className="font-extrabold text-[13px] tracking-wide text-white">
                {hoveredSegment.label}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono flex items-center justify-between gap-4">
              <span>{hoveredSegment.startTime} &rarr; {hoveredSegment.endTime}</span>
              <span className="font-extrabold text-amber-400">
                {formatDuration(hoveredSegment.durationMinutes)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
