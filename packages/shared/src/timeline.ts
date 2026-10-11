export type TimelineStatus = 'ACTIVE' | 'IDLE' | 'STOPPED' | 'MANUAL';

export interface RawTimeEntry {
  id?: string;
  _id?: string;
  start: string | Date;
  end?: string | Date | null;
  isManualEdit?: boolean;
  source?: string;
  durationSeconds?: number;
  breakSeconds?: number;
  idleSeconds?: number;
}

export interface RawActivitySample {
  minuteBucket?: string | Date;
  timestamp?: string | Date;
  isIdle?: boolean;
}

export interface TimelineSegment {
  id: string;
  status: TimelineStatus;
  start: string; // ISO string
  end: string;   // ISO string
  durationMinutes: number;
  left: number;  // 0 to 100 percentage in 24h ruler
  width: number; // 0 to 100 percentage in 24h ruler
  color: string;
  label: string;
  startTime: string; // e.g. "04:30 AM" or "04:30"
  endTime: string;   // e.g. "05:15 AM" or "05:15"
}

export interface BuildTimelineOptions {
  timeEntries: RawTimeEntry[];
  activitySamples?: RawActivitySample[];
  currentTime?: Date | string | number;
  dayReset?: string; // '04:00'
  dateStr?: string;  // 'YYYY-MM-DD'
}

export const TIMELINE_COLORS = {
  ACTIVE: '#10B981',
  IDLE: '#EF4444',
  STOPPED: '#111827',
  MANUAL: '#F59E0B',
} as const;

export const TIMELINE_LABELS = {
  ACTIVE: 'Active Work',
  IDLE: 'Idle',
  STOPPED: 'Stopped / Break',
  MANUAL: 'Manual',
} as const;

/**
 * Builds merged, real-time status-based colored segments for a 24-hour cycle.
 * Serves as the single source of truth for both backend and frontend.
 */
export function buildTimelineSegments(options: BuildTimelineOptions): TimelineSegment[] {
  const {
    timeEntries = [],
    activitySamples = [],
    currentTime,
    dayReset = '04:00',
    dateStr,
  } = options;

  if (timeEntries.length === 0 && activitySamples.length === 0) {
    return [];
  }

  // 1. Establish 24-hour cycle window (default 04:00 to 03:59:59)
  const [startH, startM] = dayReset.split(':').map((v) => parseInt(v, 10));
  const validStartH = isNaN(startH) ? 4 : startH;
  const validStartM = isNaN(startM) ? 0 : startM;

  const now = currentTime ? new Date(currentTime) : new Date();
  const nowMs = now.getTime();

  const baseDateStr =
    dateStr ||
    (() => {
      // If currentTime is provided, get date string in local or ISO representation
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    })();

  // Construct cycle start in local time
  const cycleStart = new Date(`${baseDateStr}T00:00:00`);
  cycleStart.setHours(validStartH, validStartM, 0, 0);

  const windowStartMs = cycleStart.getTime();
  const windowDurationMs = 24 * 60 * 60 * 1000;
  const windowEndMs = windowStartMs + windowDurationMs;

  // Filter and sort entries overlapping this 24-hour cycle
  const validEntries = timeEntries
    .filter((e) => {
      const s = new Date(e.start).getTime();
      const end = e.end ? new Date(e.end).getTime() : nowMs;
      return !isNaN(s) && s < windowEndMs && end > windowStartMs;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  if (validEntries.length === 0 && activitySamples.length === 0) {
    return [];
  }

  // 2. Index activity samples by minute bucket (minute start in ms)
  const sampleMap = new Map<number, boolean>(); // minuteMs -> isIdle
  let latestSampleMinuteMs: number | null = null;

  for (const s of activitySamples) {
    const rawTime = s.minuteBucket || s.timestamp;
    if (!rawTime) continue;
    const t = new Date(rawTime).getTime();
    if (isNaN(t)) continue;
    const minuteMs = Math.floor(t / 60000) * 60000;
    sampleMap.set(minuteMs, Boolean(s.isIdle));
    if (latestSampleMinuteMs === null || minuteMs > latestSampleMinuteMs) {
      latestSampleMinuteMs = minuteMs;
    }
  }

  // Determine timeline boundary
  // Earliest active minute
  const earliestEntryStartMs = validEntries.length > 0
    ? Math.max(windowStartMs, new Date(validEntries[0].start).getTime())
    : (latestSampleMinuteMs ? Math.max(windowStartMs, latestSampleMinuteMs) : windowStartMs);

  const startMinuteMs = Math.floor(earliestEntryStartMs / 60000) * 60000;

  // Upper boundary: cannot exceed window end or future time (nowMs)
  const isPastDay = nowMs >= windowEndMs;
  let maxMinuteMs: number;

  if (isPastDay) {
    // If past day, upper bound is the end of the latest entry or windowEndMs
    const latestEntryEnd = validEntries.reduce((max, e) => {
      const end = e.end ? new Date(e.end).getTime() : windowEndMs;
      return Math.max(max, end);
    }, windowStartMs);
    maxMinuteMs = Math.min(windowEndMs, Math.ceil(latestEntryEnd / 60000) * 60000);
  } else {
    // If today, upper bound is nowMs (future time stays empty)
    maxMinuteMs = Math.min(windowEndMs, nowMs);
  }

  if (maxMinuteMs <= startMinuteMs) {
    return [];
  }

  // 3. Classify minute-by-minute status
  interface MinuteStatus {
    minuteMs: number;
    status: TimelineStatus;
  }

  const minuteStatuses: MinuteStatus[] = [];

  for (let m = startMinuteMs; m < maxMinuteMs; m += 60000) {
    const minuteEndMs = m + 60000;

    // Check if minute falls inside an entry
    const entry = validEntries.find((e) => {
      const eStart = new Date(e.start).getTime();
      const eEnd = e.end ? new Date(e.end).getTime() : nowMs;
      return m >= eStart && m < eEnd;
    });

    if (entry) {
      // Manual entry
      if (entry.isManualEdit || entry.source === 'manual') {
        minuteStatuses.push({ minuteMs: m, status: 'MANUAL' });
        continue;
      }

      // Running / open entry (no end)
      const isOpenEntry = !entry.end;
      if (isOpenEntry) {
        // Heartbeat Safety: if open and no sample for > 2 minutes, treat as STOPPED
        const lastActivityMs = latestSampleMinuteMs !== null
          ? latestSampleMinuteMs + 60000
          : new Date(entry.start).getTime();

        const silenceMs = nowMs - lastActivityMs;
        const isHeartbeatMissing = silenceMs > 2 * 60 * 1000;

        if (isHeartbeatMissing && m >= lastActivityMs) {
          minuteStatuses.push({ minuteMs: m, status: 'STOPPED' });
          continue;
        }
      }

      // Check activity sample for this minute
      if (sampleMap.has(m)) {
        const isIdle = sampleMap.get(m)!;
        minuteStatuses.push({ minuteMs: m, status: isIdle ? 'IDLE' : 'ACTIVE' });
      } else {
        // Fallback inside entry when no sample exists: default to ACTIVE
        minuteStatuses.push({ minuteMs: m, status: 'ACTIVE' });
      }
    } else {
      // Gap between entries or after Stop up to now -> STOPPED (black)
      minuteStatuses.push({ minuteMs: m, status: 'STOPPED' });
    }
  }

  if (minuteStatuses.length === 0) {
    return [];
  }

  // 4. Merge adjacent minutes with the same status into continuous segments
  interface IntermediateSegment {
    status: TimelineStatus;
    startMs: number;
    endMs: number;
  }

  const merged: IntermediateSegment[] = [];
  let current: IntermediateSegment | null = null;

  for (const item of minuteStatuses) {
    if (!current) {
      current = { status: item.status, startMs: item.minuteMs, endMs: item.minuteMs + 60000 };
    } else if (current.status === item.status && item.minuteMs === current.endMs) {
      current.endMs = item.minuteMs + 60000;
    } else {
      merged.push(current);
      current = { status: item.status, startMs: item.minuteMs, endMs: item.minuteMs + 60000 };
    }
  }

  if (current) {
    // If this is the last open segment and we are on today, extend to exact nowMs for smooth live growth
    if (!isPastDay && nowMs > current.startMs && nowMs <= windowEndMs) {
      current.endMs = Math.max(current.endMs, nowMs);
    }
    merged.push(current);
  }

  // 5. Convert to final TimelineSegment objects with percentage geometry
  return merged.map((seg, idx) => {
    const left = Math.max(0, Math.min(100, ((seg.startMs - windowStartMs) / windowDurationMs) * 100));
    const rawWidth = ((seg.endMs - seg.startMs) / windowDurationMs) * 100;
    // 1px minimum width (~0.08% of 24h on a 1200px track) so short segments stay visible
    const width = Math.max(0.08, Math.min(100 - left, rawWidth));

    const durationMinutes = Math.max(1, Math.round((seg.endMs - seg.startMs) / 60000));
    const startDate = new Date(seg.startMs);
    const endDate = new Date(seg.endMs);

    const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      id: `seg-${idx}-${seg.status.toLowerCase()}-${seg.startMs}`,
      status: seg.status,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      durationMinutes,
      left,
      width,
      color: TIMELINE_COLORS[seg.status],
      label: TIMELINE_LABELS[seg.status],
      startTime,
      endTime,
    };
  });
}
