import { buildTimelineSegments, TIMELINE_COLORS } from '@teamlogger/shared';

describe('buildTimelineSegments Unit Tests', () => {
  const baseDate = '2026-10-11';
  const dayReset = '04:00';

  it('1. Running + active samples gives one growing green segment', () => {
    const timeEntries = [
      {
        id: 'entry-1',
        start: '2026-10-11T10:00:00.000Z',
        end: null, // running
      },
    ];

    const activitySamples = [
      { minuteBucket: '2026-10-11T10:00:00.000Z', isIdle: false },
      { minuteBucket: '2026-10-11T10:01:00.000Z', isIdle: false },
      { minuteBucket: '2026-10-11T10:02:00.000Z', isIdle: false },
    ];

    const currentTime = '2026-10-11T10:03:00.000Z';

    const segments = buildTimelineSegments({
      timeEntries,
      activitySamples,
      currentTime,
      dateStr: baseDate,
      dayReset,
    });

    expect(segments).toHaveLength(1);
    expect(segments[0].status).toBe('ACTIVE');
    expect(segments[0].color).toBe(TIMELINE_COLORS.ACTIVE); // #10B981
    expect(new Date(segments[0].start).toISOString()).toBe('2026-10-11T10:00:00.000Z');
    expect(new Date(segments[0].end).toISOString()).toBe('2026-10-11T10:03:00.000Z');
  });

  it('2. Idle samples in the middle splits it into green, red, green', () => {
    const timeEntries = [
      {
        id: 'entry-1',
        start: '2026-10-11T10:00:00.000Z',
        end: '2026-10-11T10:05:00.000Z',
      },
    ];

    const activitySamples = [
      { minuteBucket: '2026-10-11T10:00:00.000Z', isIdle: false },
      { minuteBucket: '2026-10-11T10:01:00.000Z', isIdle: false },
      { minuteBucket: '2026-10-11T10:02:00.000Z', isIdle: true },
      { minuteBucket: '2026-10-11T10:03:00.000Z', isIdle: true },
      { minuteBucket: '2026-10-11T10:04:00.000Z', isIdle: false },
    ];

    const currentTime = '2026-10-11T10:05:00.000Z';

    const segments = buildTimelineSegments({
      timeEntries,
      activitySamples,
      currentTime,
      dateStr: baseDate,
      dayReset,
    });

    expect(segments).toHaveLength(3);
    // 1st segment: Active (Green)
    expect(segments[0].status).toBe('ACTIVE');
    expect(segments[0].color).toBe(TIMELINE_COLORS.ACTIVE);
    expect(new Date(segments[0].start).toISOString()).toBe('2026-10-11T10:00:00.000Z');
    expect(new Date(segments[0].end).toISOString()).toBe('2026-10-11T10:02:00.000Z');

    // 2nd segment: Idle (Red)
    expect(segments[1].status).toBe('IDLE');
    expect(segments[1].color).toBe(TIMELINE_COLORS.IDLE); // #EF4444
    expect(new Date(segments[1].start).toISOString()).toBe('2026-10-11T10:02:00.000Z');
    expect(new Date(segments[1].end).toISOString()).toBe('2026-10-11T10:04:00.000Z');

    // 3rd segment: Active (Green)
    expect(segments[2].status).toBe('ACTIVE');
    expect(segments[2].color).toBe(TIMELINE_COLORS.ACTIVE);
    expect(new Date(segments[2].start).toISOString()).toBe('2026-10-11T10:04:00.000Z');
    expect(new Date(segments[2].end).toISOString()).toBe('2026-10-11T10:05:00.000Z');
  });

  it('3. After Stop, the time up to now is black and a new session starts green again', () => {
    const timeEntries = [
      {
        id: 'entry-1',
        start: '2026-10-11T10:00:00.000Z',
        end: '2026-10-11T10:10:00.000Z', // Stopped at 10:10
      },
      {
        id: 'entry-2',
        start: '2026-10-11T10:20:00.000Z', // New session started at 10:20
        end: null, // Running
      },
    ];

    const activitySamples = [
      { minuteBucket: '2026-10-11T10:00:00.000Z', isIdle: false },
      { minuteBucket: '2026-10-11T10:20:00.000Z', isIdle: false },
      { minuteBucket: '2026-10-11T10:21:00.000Z', isIdle: false },
    ];

    const currentTime = '2026-10-11T10:22:00.000Z';

    const segments = buildTimelineSegments({
      timeEntries,
      activitySamples,
      currentTime,
      dateStr: baseDate,
      dayReset,
    });

    expect(segments).toHaveLength(3);
    // 1: Active
    expect(segments[0].status).toBe('ACTIVE');
    expect(new Date(segments[0].start).toISOString()).toBe('2026-10-11T10:00:00.000Z');
    expect(new Date(segments[0].end).toISOString()).toBe('2026-10-11T10:10:00.000Z');

    // 2: Gap after stop is Black
    expect(segments[1].status).toBe('STOPPED');
    expect(segments[1].color).toBe(TIMELINE_COLORS.STOPPED); // #111827
    expect(new Date(segments[1].start).toISOString()).toBe('2026-10-11T10:10:00.000Z');
    expect(new Date(segments[1].end).toISOString()).toBe('2026-10-11T10:20:00.000Z');

    // 3: New session starts Green
    expect(segments[2].status).toBe('ACTIVE');
    expect(segments[2].color).toBe(TIMELINE_COLORS.ACTIVE);
    expect(new Date(segments[2].start).toISOString()).toBe('2026-10-11T10:20:00.000Z');
    expect(new Date(segments[2].end).toISOString()).toBe('2026-10-11T10:22:00.000Z');
  });

  it('4. A missing heartbeat for over 2 minutes turns the tail black', () => {
    const timeEntries = [
      {
        id: 'entry-open',
        start: '2026-10-11T10:00:00.000Z',
        end: null, // open
      },
    ];

    // Samples exist only until 10:04 (representing minute 10:04 to 10:05)
    const activitySamples = [
      { minuteBucket: '2026-10-11T10:00:00.000Z', isIdle: false },
      { minuteBucket: '2026-10-11T10:01:00.000Z', isIdle: false },
      { minuteBucket: '2026-10-11T10:02:00.000Z', isIdle: false },
      { minuteBucket: '2026-10-11T10:03:00.000Z', isIdle: false },
      { minuteBucket: '2026-10-11T10:04:00.000Z', isIdle: false },
    ];

    // Current time is 10:15 (more than 10 minutes since last sample arrived)
    const currentTime = '2026-10-11T10:15:00.000Z';

    const segments = buildTimelineSegments({
      timeEntries,
      activitySamples,
      currentTime,
      dateStr: baseDate,
      dayReset,
    });

    expect(segments).toHaveLength(2);
    // First part: Active work with samples (Green)
    expect(segments[0].status).toBe('ACTIVE');
    expect(segments[0].color).toBe(TIMELINE_COLORS.ACTIVE);
    expect(new Date(segments[0].start).toISOString()).toBe('2026-10-11T10:00:00.000Z');
    expect(new Date(segments[0].end).toISOString()).toBe('2026-10-11T10:05:00.000Z');

    // Tail: Heartbeat missing > 2 min -> Stopped (Black)
    expect(segments[1].status).toBe('STOPPED');
    expect(segments[1].color).toBe(TIMELINE_COLORS.STOPPED);
    expect(new Date(segments[1].start).toISOString()).toBe('2026-10-11T10:05:00.000Z');
    expect(new Date(segments[1].end).toISOString()).toBe('2026-10-11T10:15:00.000Z');
  });

  it('5. Adjacent same-status minutes merge into a single segment', () => {
    const timeEntries = [
      {
        id: 'entry-1',
        start: '2026-10-11T10:00:00.000Z',
        end: '2026-10-11T10:03:00.000Z',
      },
    ];

    const activitySamples = [
      { minuteBucket: '2026-10-11T10:00:00.000Z', isIdle: false },
      { minuteBucket: '2026-10-11T10:01:00.000Z', isIdle: false },
      { minuteBucket: '2026-10-11T10:02:00.000Z', isIdle: false },
    ];

    const segments = buildTimelineSegments({
      timeEntries,
      activitySamples,
      currentTime: '2026-10-11T10:03:00.000Z',
      dateStr: baseDate,
      dayReset,
    });

    // Merged into 1 segment, not 3 separate minutes
    expect(segments).toHaveLength(1);
    expect(segments[0].status).toBe('ACTIVE');
    expect(segments[0].durationMinutes).toBe(3);
  });

  it('6. Manual entries show orange; future time is empty', () => {
    const timeEntries = [
      {
        id: 'manual-1',
        start: '2026-10-11T10:00:00.000Z',
        end: '2026-10-11T11:00:00.000Z',
        isManualEdit: true,
      },
    ];

    const currentTime = '2026-10-11T11:30:00.000Z';

    const segments = buildTimelineSegments({
      timeEntries,
      currentTime,
      dateStr: baseDate,
      dayReset,
    });

    expect(segments).toHaveLength(2);
    // Manual segment is Orange
    expect(segments[0].status).toBe('MANUAL');
    expect(segments[0].color).toBe(TIMELINE_COLORS.MANUAL); // #F59E0B
    expect(new Date(segments[0].start).toISOString()).toBe('2026-10-11T10:00:00.000Z');
    expect(new Date(segments[0].end).toISOString()).toBe('2026-10-11T11:00:00.000Z');

    // Stopped after manual entry up to current time
    expect(segments[1].status).toBe('STOPPED');
    expect(segments[1].color).toBe(TIMELINE_COLORS.STOPPED);
    expect(new Date(segments[1].start).toISOString()).toBe('2026-10-11T11:00:00.000Z');
    expect(new Date(segments[1].end).toISOString()).toBe('2026-10-11T11:30:00.000Z');

    // Any time after 11:30 is future and not in segments
    const maxEndMs = Math.max(...segments.map((s) => new Date(s.end).getTime()));
    expect(maxEndMs).toBeLessThanOrEqual(new Date(currentTime).getTime());
  });
});
