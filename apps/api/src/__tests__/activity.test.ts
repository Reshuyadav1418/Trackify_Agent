import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { UserModel, ActivitySampleModel } from '../models';
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
  await ActivitySampleModel.deleteMany({});

  const pass = await hashPassword('Pass123!');
  const user = await UserModel.create({
    email: 'activityuser@teamlogger.com',
    password: pass,
    name: 'Activity User',
    role: 'employee',
  });
  userId = user._id.toString();

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'activityuser@teamlogger.com',
    password: 'Pass123!',
  });
  userToken = loginRes.body.accessToken;
});

describe('Activity Batch Ingestion API', () => {
  it('should ingest minute-level activity samples and de-duplicate by (userId, minuteBucket)', async () => {
    const time1 = '2026-09-30T10:15:23.000Z'; // Minute 10:15
    const time2 = '2026-09-30T10:15:55.000Z'; // Same Minute 10:15 (duplicate minute bucket)
    const time3 = '2026-09-30T10:16:10.000Z'; // Minute 10:16

    const samples = [
      { timestamp: time1, keyboardCount: 45, mouseCount: 12, isIdle: false, activeWindowTitle: 'VS Code' },
      { timestamp: time2, keyboardCount: 60, mouseCount: 20, isIdle: false, activeWindowTitle: 'VS Code' }, // Duplicate bucket!
      { timestamp: time3, keyboardCount: 10, mouseCount: 5, isIdle: true, activeWindowTitle: 'Slack' },
    ];

    const res = await request(app)
      .post('/api/activity/batch')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ samples });

    expect(res.status).toBe(200);
    expect(res.body.totalSubmitted).toBe(3);

    // Verify database documents count (should be 2 unique minute buckets: 10:15 and 10:16)
    const storedSamples = await ActivitySampleModel.find({ userId });
    expect(storedSamples).toHaveLength(2);

    // Check that duplicate minute bucket 10:15 was updated with latest values (60, 20)
    const minute15Doc = storedSamples.find(
      (s) => new Date(s.minuteBucket).toISOString() === '2026-09-30T10:15:00.000Z'
    );
    expect(minute15Doc).toBeDefined();
    expect(minute15Doc?.keyboardCount).toBe(60);
    expect(minute15Doc?.mouseCount).toBe(20);
  });
});
