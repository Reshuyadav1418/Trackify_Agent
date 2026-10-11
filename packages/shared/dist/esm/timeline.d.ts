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
export interface RawScreenshot {
    capturedAt: string | Date;
    activityScore?: number;
    isOnBreak?: boolean;
}
export interface TimelineSegment {
    id: string;
    status: TimelineStatus;
    start: string;
    end: string;
    durationMinutes: number;
    left: number;
    width: number;
    color: string;
    label: string;
    startTime: string;
    endTime: string;
}
export interface BuildTimelineOptions {
    timeEntries?: RawTimeEntry[];
    activitySamples?: RawActivitySample[];
    screenshots?: RawScreenshot[];
    currentTime?: Date | string | number;
    dayReset?: string;
    dateStr?: string;
}
export declare const TIMELINE_COLORS: {
    readonly ACTIVE: "#10B981";
    readonly IDLE: "#EF4444";
    readonly STOPPED: "#111827";
    readonly MANUAL: "#F59E0B";
};
export declare const TIMELINE_LABELS: {
    readonly ACTIVE: "Active Work";
    readonly IDLE: "Idle";
    readonly STOPPED: "Stopped / Break";
    readonly MANUAL: "Manual";
};
/**
 * Builds merged, real-time status-based colored segments for a 24-hour cycle.
 * Serves as the single source of truth for both backend and frontend.
 */
export declare function buildTimelineSegments(options: BuildTimelineOptions): TimelineSegment[];
//# sourceMappingURL=timeline.d.ts.map