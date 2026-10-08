import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { UserModel, TimeEntryModel, AuditLogModel } from '../models';
import { hashPassword } from '../services/auth.service';

let mongoServer: MongoMemoryServer;
const app = createApp();

let userToken: string;
let userId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await UserModel.deleteMany({});
  await TimeEntryModel.deleteMany({});
  await AuditLogModel.deleteMany({});

  const pass = await hashPassword('Pass123!');
  const user = await UserModel.create({
    email: 'manualuser@teamlogger.com',
    password: pass,
    name: 'Manual User',
    role: 'employee',
  });
  userId = user._id.toString();

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'manualuser@teamlogger.com',
    password: 'Pass123!',
  });
  userToken = loginRes.body.accessToken;
});

describe('Manual Time Entries & Audit Logs', () => {
  it('should reject creating manual time entry if reason is missing', async () => {
    const start = new Date(Date.now() - 3600 * 1000).toISOString();
    const end = new Date().toISOString();

    const res = await request(app)
      .post('/api/entries/manual')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ start, end }); // missing reason!

    expect(res.status).toBe(400);
    expect(res.body.error.toLowerCase()).toContain('reason');
  });

  it('should create manual time entry with reason and record in entry auditLogs & global auditLog', async () => {
    const start = new Date(Date.now() - 3600 * 1000).toISOString();
    const end = new Date().toISOString();
    const reason = 'Forgot to start timer during client meeting';

    const res = await request(app)
      .post('/api/entries/manual')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ start, end, reason });

    expect(res.status).toBe(201);
    expect(res.body.timeEntry.isManualEdit).toBe(true);
    expect(res.body.timeEntry.reason).toBe(reason);
    expect(res.body.timeEntry.auditLogs).toHaveLength(1);
    expect(res.body.timeEntry.auditLogs[0].reason).toBe(reason);

    // Verify global auditLog entry
    const auditLogs = await AuditLogModel.find({ action: 'MANUAL_TIME_EDIT' });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].actorId.toString()).toBe(userId);
  });

  it('should reject patch updating manual entry without a reason', async () => {
    const start = new Date(Date.now() - 3600 * 1000);
    const end = new Date();
    const entry = await TimeEntryModel.create({
      userId,
      start,
      end,
      durationSeconds: 3600,
      isManualEdit: false,
    });

    const res = await request(app)
      .patch(`/api/entries/${entry._id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ end: new Date().toISOString() }); // missing reason!

    expect(res.status).toBe(400);
    expect(res.body.error.toLowerCase()).toContain('reason');
  });

  it('should update manual entry with reason and append to entry auditLogs & global auditLogs', async () => {
    const start = new Date(Date.now() - 3600 * 1000);
    const end = new Date();
    const entry = await TimeEntryModel.create({
      userId,
      start,
      end,
      durationSeconds: 3600,
      isManualEdit: false,
    });

    const newEnd = new Date(Date.now() + 1800 * 1000).toISOString();
    const reason = 'Extended meeting duration';

    const res = await request(app)
      .patch(`/api/entries/${entry._id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ end: newEnd, reason });

    expect(res.status).toBe(200);
    expect(res.body.timeEntry.isManualEdit).toBe(true);
    expect(res.body.timeEntry.auditLogs).toHaveLength(1);
    expect(res.body.timeEntry.auditLogs[0].reason).toBe(reason);

    const auditLogs = await AuditLogModel.find({ action: 'MANUAL_TIME_EDIT' });
    expect(auditLogs).toHaveLength(1);
  });
});
