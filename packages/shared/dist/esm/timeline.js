export const TIMELINE_COLORS = {
    ACTIVE: '#10B981',
    IDLE: '#EF4444',
    STOPPED: '#111827',
    MANUAL: '#F59E0B',
};
export const TIMELINE_LABELS = {
    ACTIVE: 'Active Work',
    IDLE: 'Idle',
    STOPPED: 'Stopped / Break',
    MANUAL: 'Manual',
};
/**
 * Builds merged, real-time status-based colored segments for a 24-hour cycle.
 * Serves as the single source of truth for both backend and frontend.
 */
export function buildTimelineSegments(options) {
    const { timeEntries = [], activitySamples = [], screenshots = [], currentTime, dayReset = '04:00', dateStr, } = options;
    if (timeEntries.length === 0 && activitySamples.length === 0 && screenshots.length === 0) {
        return [];
    }
    // 1. Establish 24-hour cycle window (default 04:00 to 03:59:59)
    const [startH, startM] = dayReset.split(':').map((v) => parseInt(v, 10));
    const validStartH = isNaN(startH) ? 4 : startH;
    const validStartM = isNaN(startM) ? 0 : startM;
    const now = currentTime ? new Date(currentTime) : new Date();
    const nowMs = now.getTime();
    const baseDateStr = dateStr ||
        (() => {
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
    // 2. Index activity samples and screenshots by minute bucket
    const sampleMap = new Map(); // minuteMs -> isIdle
    let earliestDataMinuteMs = null;
    let latestDataMinuteMs = null;
    for (const s of activitySamples) {
        const rawTime = s.minuteBucket || s.timestamp;
        if (!rawTime)
            continue;
        const t = new Date(rawTime).getTime();
        if (isNaN(t) || t < windowStartMs || t > windowEndMs)
            continue;
        const minuteMs = Math.floor(t / 60000) * 60000;
        sampleMap.set(minuteMs, Boolean(s.isIdle));
        if (earliestDataMinuteMs === null || minuteMs < earliestDataMinuteMs) {
            earliestDataMinuteMs = minuteMs;
        }
        if (latestDataMinuteMs === null || minuteMs > latestDataMinuteMs) {
            latestDataMinuteMs = minuteMs;
        }
    }
    // Also include screenshots as active/idle evidence if not already covered
    for (const sc of screenshots) {
        if (!sc.capturedAt)
            continue;
        const t = new Date(sc.capturedAt).getTime();
        if (isNaN(t) || t < windowStartMs || t > windowEndMs)
            continue;
        const minuteMs = Math.floor(t / 60000) * 60000;
        const isIdle = Boolean(sc.isOnBreak) || (sc.activityScore !== undefined && sc.activityScore < 30);
        if (!sampleMap.has(minuteMs)) {
            sampleMap.set(minuteMs, isIdle);
        }
        if (earliestDataMinuteMs === null || minuteMs < earliestDataMinuteMs) {
            earliestDataMinuteMs = minuteMs;
        }
        if (latestDataMinuteMs === null || minuteMs > latestDataMinuteMs) {
            latestDataMinuteMs = minuteMs;
        }
    }
    if (validEntries.length === 0 && sampleMap.size === 0) {
        return [];
    }
    // Determine earliest minute on the timeline
    const candidateStarts = [];
    if (validEntries.length > 0) {
        candidateStarts.push(new Date(validEntries[0].start).getTime());
    }
    if (earliestDataMinuteMs !== null) {
        candidateStarts.push(earliestDataMinuteMs);
    }
    const earliestStartMs = candidateStarts.length > 0 ? Math.min(...candidateStarts) : windowStartMs;
    const startMinuteMs = Math.max(windowStartMs, Math.floor(earliestStartMs / 60000) * 60000);
    // Upper boundary: cannot exceed window end or future time (nowMs)
    const isPastDay = nowMs >= windowEndMs;
    let maxMinuteMs;
    if (isPastDay) {
        const latestBound = Math.max(...validEntries.map((e) => (e.end ? new Date(e.end).getTime() : windowEndMs)), latestDataMinuteMs ? latestDataMinuteMs + 60000 : windowStartMs);
        maxMinuteMs = Math.min(windowEndMs, Math.ceil(latestBound / 60000) * 60000);
    }
    else {
        maxMinuteMs = Math.min(windowEndMs, nowMs);
    }
    if (maxMinuteMs <= startMinuteMs) {
        return [];
    }
    const minuteStatuses = [];
    for (let m = startMinuteMs; m < maxMinuteMs; m += 60000) {
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
                const entryStartMs = new Date(entry.start).getTime();
                // Heartbeat Safety: if open and no sample for > 2 minutes, treat tail as STOPPED
                const lastActivityMs = (latestDataMinuteMs !== null && latestDataMinuteMs >= entryStartMs)
                    ? latestDataMinuteMs + 60000
                    : entryStartMs;
                const silenceMs = nowMs - lastActivityMs;
                const isHeartbeatMissing = silenceMs > 2 * 60 * 1000;
                if (isHeartbeatMissing && m >= lastActivityMs) {
                    minuteStatuses.push({ minuteMs: m, status: 'STOPPED' });
                    continue;
                }
            }
            // Check activity sample for this minute
            if (sampleMap.has(m)) {
                const isIdle = sampleMap.get(m);
                minuteStatuses.push({ minuteMs: m, status: isIdle ? 'IDLE' : 'ACTIVE' });
            }
            else {
                // Fallback inside entry when no sample exists: default to ACTIVE
                minuteStatuses.push({ minuteMs: m, status: 'ACTIVE' });
            }
        }
        else {
            // Not inside an explicit TimeEntry record
            if (sampleMap.has(m)) {
                // Direct activity sample / screenshot exists for this minute!
                const isIdle = sampleMap.get(m);
                minuteStatuses.push({ minuteMs: m, status: isIdle ? 'IDLE' : 'ACTIVE' });
            }
            else {
                // Gap between sessions or after Stop up to now -> STOPPED (black)
                minuteStatuses.push({ minuteMs: m, status: 'STOPPED' });
            }
        }
    }
    if (minuteStatuses.length === 0) {
        return [];
    }
    const merged = [];
    let current = null;
    for (const item of minuteStatuses) {
        if (!current) {
            current = { status: item.status, startMs: item.minuteMs, endMs: item.minuteMs + 60000 };
        }
        else if (current.status === item.status && item.minuteMs === current.endMs) {
            current.endMs = item.minuteMs + 60000;
        }
        else {
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
//# sourceMappingURL=timeline.js.map