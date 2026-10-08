/**
 * Tests for BullMQ job handlers.
 * All DB and S3 calls are mocked — no real infrastructure needed.
 */

// ─── Query helper for chained Mongoose calls (.lean(), .sort(), etc.) ─────────
function makeQuery(val: any) {
  const q: any = {
    lean: jest.fn().mockReturnValue(val),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    then(onResolve: any, onReject: any) {
      return Promise.resolve(val).then(onResolve, onReject);
    },
    catch(onReject: any) {
      return Promise.resolve(val).catch(onReject);
    },
  };
  return q;
}

// ─── Global mock factories ────────────────────────────────────────────────────
const mockFindOne     = jest.fn();
const mockFind        = jest.fn();
const mockAggregate   = jest.fn();
const mockCountDocs   = jest.fn();
const mockDeleteMany  = jest.fn();
const mockFindByIdUpd = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockCreate      = jest.fn();

// Build a shared mock model that every mongoose.model() call returns
const mockModel = {
  findOne:           mockFindOne,
  find:              mockFind,
  findOneAndUpdate:  mockFindOneAndUpdate,
  findByIdAndUpdate: mockFindByIdUpd,
  aggregate:         mockAggregate,
  countDocuments:    mockCountDocs,
  deleteMany:        mockDeleteMany,
  create:            mockCreate,
};

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect:    jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    models:     {},
    model:      jest.fn().mockReturnValue(mockModel),
    Types:      actual.Types,
    Schema:     actual.Schema,
  };
});

const mockS3Send = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  GetObjectCommand:     jest.fn(),
  PutObjectCommand:     jest.fn(),
  DeleteObjectsCommand: jest.fn(),
}));

jest.mock('sharp', () => {
  const mockSharp = jest.fn().mockReturnValue({
    resize:   jest.fn().mockReturnThis(),
    jpeg:     jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('thumb-data')),
  });
  return {
    __esModule: true,
    default: mockSharp,
  };
});

// ─── Job imports ──────────────────────────────────────────────────────────────
import { Job } from 'bullmq';
import { thumbnailProcessor } from '../jobs/thumbnail.job';
import { dailyAggregationProcessor } from '../jobs/dailyAggregation.job';
import { retentionPurgeProcessor } from '../jobs/retentionPurge.job';
import { alertProcessor } from '../jobs/alerts.job';
import { reportProcessor } from '../jobs/reports.job';

function makeJob<T>(data: T): Job<T> {
  return {
    id:             'test-job-1',
    name:           'test',
    data,
    attemptsMade:   0,
    updateProgress: jest.fn().mockResolvedValue(undefined),
  } as unknown as Job<T>;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Fresh async generator on each S3 call
  mockS3Send.mockImplementation(async () => ({
    Body:   (async function* () { yield Buffer.from('fake-image-data'); })(),
    Errors: [],
  }));
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. Thumbnail job
// ═════════════════════════════════════════════════════════════════════════════
describe('thumbnailProcessor', () => {
  it('downloads, resizes, uploads, and updates DB', async () => {
    mockFindByIdUpd.mockResolvedValue({});

    const job = makeJob({ screenshotId: 'sc1', s3Key: 'shots/img.jpg', userId: 'u1' });
    await expect(thumbnailProcessor(job)).resolves.toBeUndefined();

    // S3 called twice: GetObject + PutObject
    expect(mockS3Send).toHaveBeenCalledTimes(2);
    // DB updated with thumbKey
    expect(mockFindByIdUpd).toHaveBeenCalledWith(
      'sc1',
      expect.objectContaining({ thumbKey: expect.stringContaining('_thumb.jpg') })
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. Daily aggregation job
// ═════════════════════════════════════════════════════════════════════════════
describe('dailyAggregationProcessor', () => {
  it('aggregates samples and upserts daily summaries', async () => {
    mockAggregate.mockResolvedValue([
      { _id: 'user1', totalKeyboardEvents: 100, totalMouseEvents: 50, totalMinutes: 60, activeMinutes: 45, idleMinutes: 15 },
    ]);
    mockFindOneAndUpdate.mockResolvedValue({});

    const job = makeJob({ date: '2026-09-30' });
    await expect(dailyAggregationProcessor(job)).resolves.toBeUndefined();
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { userId: 'user1', date: '2026-09-30' },
      expect.objectContaining({ $set: expect.objectContaining({ activityPercent: 75 }) }),
      expect.any(Object)
    );
  });

  it('handles zero results gracefully', async () => {
    mockAggregate.mockResolvedValue([]);
    const job = makeJob({ date: '2026-09-28' });
    await expect(dailyAggregationProcessor(job)).resolves.toBeUndefined();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. Retention purge job
// ═════════════════════════════════════════════════════════════════════════════
describe('retentionPurgeProcessor', () => {
  it('skips deletes in dryRun mode', async () => {
    mockFindOne.mockImplementation(() => makeQuery({ retentionDays: 30, isActive: true }));
    mockFind.mockImplementation(() => makeQuery([]));
    mockCountDocs.mockResolvedValue(0);

    const job = makeJob({ dryRun: true });
    await expect(retentionPurgeProcessor(job)).resolves.toBeUndefined();
    expect(mockDeleteMany).not.toHaveBeenCalled();
    expect(mockS3Send).not.toHaveBeenCalled();
  });

  it('deletes screenshots and samples, writes auditLog', async () => {
    mockFindOne.mockImplementation(() => makeQuery({ retentionDays: 30, isActive: true }));
    mockFind.mockImplementation(() => makeQuery([{ _id: 'sc1', s3Key: 'shots/old.jpg' }]));
    mockCountDocs.mockResolvedValue(5);
    mockDeleteMany.mockResolvedValue({ deletedCount: 5 });
    mockCreate.mockResolvedValue({});

    const job = makeJob({ dryRun: false });
    await expect(retentionPurgeProcessor(job)).resolves.toBeUndefined();

    // S3 delete called
    expect(mockS3Send).toHaveBeenCalledTimes(1);
    // DB deletes called (screenshots + activity)
    expect(mockDeleteMany).toHaveBeenCalledTimes(2);
    // Audit log written
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ action: 'RETENTION_PURGE' }));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. Alerts job
// ═════════════════════════════════════════════════════════════════════════════
describe('alertProcessor', () => {
  const fakeUserId = '507f1f77bcf86cd799439011';

  it('raises timer_overdue alert and marks entry stale', async () => {
    const fakeEntry = { _id: 'te1', start: new Date(Date.now() - 14 * 3_600_000) };
    mockFindOne.mockImplementation(() => makeQuery(fakeEntry));
    mockFindByIdUpd.mockResolvedValue({});
    mockCreate.mockResolvedValue({});

    const job = makeJob({ type: 'timer_overdue' as const, userId: fakeUserId, meta: {} });
    await expect(alertProcessor(job)).resolves.toBeUndefined();

    expect(mockFindByIdUpd).toHaveBeenCalledWith('te1', { isStale: true });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ action: 'ALERT_TIMER_OVERDUE' }));
  });

  it('no-ops timer_overdue when no overdue entry found', async () => {
    mockFindOne.mockImplementation(() => makeQuery(null));
    const job = makeJob({ type: 'timer_overdue' as const, userId: fakeUserId, meta: {} });
    await expect(alertProcessor(job)).resolves.toBeUndefined();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('raises device_silent alert', async () => {
    const fakeDevice = { _id: 'dev1', deviceName: 'LAPTOP', lastSeenAt: new Date(0) };
    mockFindOne.mockImplementation(() => makeQuery(fakeDevice));
    mockCreate.mockResolvedValue({});

    const job = makeJob({ type: 'device_silent' as const, userId: fakeUserId, meta: {} });
    await expect(alertProcessor(job)).resolves.toBeUndefined();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ action: 'ALERT_DEVICE_SILENT' }));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. Report job
// ═════════════════════════════════════════════════════════════════════════════
describe('reportProcessor', () => {
  it('generates timesheet report and uploads to S3', async () => {
    mockFind.mockImplementation(() => makeQuery([{ _id: 'te1', durationSeconds: 3600 }]));

    const job = makeJob({
      reportType:  'timesheet' as const,
      requestedBy: 'admin1',
      params:      { startDate: '2026-09-01', endDate: '2026-09-30' },
    });
    const result = await reportProcessor(job);
    expect(result).toHaveProperty('outputKey');
    expect(result.outputKey).toMatch(/^reports\/admin1\/timesheet_/);
    expect(mockS3Send).toHaveBeenCalledTimes(1); // PutObject
  });

  it('generates activity report', async () => {
    mockAggregate.mockResolvedValue([{ _id: { userId: 'u1', date: '2026-09-30' }, totalKeyboard: 100 }]);
    const job = makeJob({ reportType: 'activity' as const, requestedBy: 'mgr1', params: {} });
    const result = await reportProcessor(job);
    expect(result.outputKey).toMatch(/activity/);
  });

  it('generates projects report', async () => {
    mockAggregate.mockResolvedValue([{ projectId: 'p1', totalHours: 10 }]);
    const job = makeJob({ reportType: 'projects' as const, requestedBy: 'admin1', params: {} });
    const result = await reportProcessor(job);
    expect(result.outputKey).toMatch(/projects/);
  });

  it('throws on unknown reportType', async () => {
    const job = makeJob({ reportType: 'unknown' as any, requestedBy: 'u1', params: {} });
    await expect(reportProcessor(job)).rejects.toThrow('Unknown report type');
  });
});
