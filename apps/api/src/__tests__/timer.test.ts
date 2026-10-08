import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { UserModel, PolicyModel, ConsentModel, TimeEntryModel } from '../models';
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
  await PolicyModel.deleteMany({});
  await ConsentModel.deleteMany({});
  await TimeEntryModel.deleteMany({});

  const pass = await hashPassword('UserPass123!');
  const user = await UserModel.create({
    email: 'timeruser@teamlogger.com',
    password: pass,
    name: 'Timer User',
    role: 'employee',
  });
  userId = user._id.toString();

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'timeruser@teamlogger.com',
    password: 'UserPass123!',
  });
  userToken = loginRes.body.accessToken;

  // Active Policy v1
  await PolicyModel.create({
    version: 1,
    screenshotIntervalMinutes: 10,
    isBlurEnabled: false,
    retentionDays: 30,
    consentText: 'Must accept policy v1 before tracking.',
    isActive: true,
  });
});

describe('Timer API Endpoints', () => {
  it('should block starting timer if user has not accepted current active policy', async () => {
    const res = await request(app)
      .post('/api/timers/start')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ description: 'Testing timer start without consent' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Must accept current tracking policy');
  });

  it('should allow starting timer after policy consent is accepted', async () => {
    // Accept consent
    await request(app)
      .post('/api/policies/consent')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ policyVersion: 1 });

    const res = await request(app)
      .post('/api/timers/start')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ description: 'Started timer successfully' });

    expect(res.status).toBe(201);
    expect(res.body.timeEntry.end).toBeNull();
    expect(res.body.timeEntry.userId).toBe(userId);
  });

  it('should block starting a second timer if user already has an active running timer', async () => {
    await request(app)
      .post('/api/policies/consent')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ policyVersion: 1 });

    // Start first timer
    await request(app)
      .post('/api/timers/start')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    // Attempt second timer
    const res = await request(app)
      .post('/api/timers/start')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('An active timer is already running for this user');
  });

  it('should stop active timer and calculate duration', async () => {
    await request(app)
      .post('/api/policies/consent')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ policyVersion: 1 });

    await request(app)
      .post('/api/timers/start')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    const stopRes = await request(app)
      .post('/api/timers/stop')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(stopRes.status).toBe(200);
    expect(stopRes.body.timeEntry.end).not.toBeNull();
    expect(stopRes.body.timeEntry.isStale).toBe(false);
  });

  it('should flag timer as stale if duration exceeds 12 hours (stale-timer guard)', async () => {
    // Create an active timer started 13 hours ago
    const thirteenHoursAgo = new Date(Date.now() - 13 * 3600 * 1000);
    const staleEntry = await TimeEntryModel.create({
      userId,
      start: thirteenHoursAgo,
      end: null,
      durationSeconds: 0,
      isManualEdit: false,
    });

    const stopRes = await request(app)
      .post('/api/timers/stop')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ timeEntryId: staleEntry._id.toString() });

    expect(stopRes.status).toBe(200);
    expect(stopRes.body.timeEntry.isStale).toBe(true);
    expect(stopRes.body.isStaleFlagged).toBe(true);
  });
});
