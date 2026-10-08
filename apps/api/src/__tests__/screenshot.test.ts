import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { UserModel, ScreenshotModel, AuditLogModel } from '../models';
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
  await ScreenshotModel.deleteMany({});
  await AuditLogModel.deleteMany({});

  const pass = await hashPassword('Pass123!');
  const user = await UserModel.create({
    email: 'shotuser@teamlogger.com',
    password: pass,
    name: 'Shot User',
    role: 'employee',
  });
  userId = user._id.toString();

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'shotuser@teamlogger.com',
    password: 'Pass123!',
  });
  userToken = loginRes.body.accessToken;
});

describe('Screenshot API Endpoints', () => {
  it('should generate presigned PUT upload URL to S3/MinIO', async () => {
    const res = await request(app)
      .post('/api/screenshots/presign')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ isBlurred: false });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('s3Key');
    expect(res.body).toHaveProperty('uploadUrl');
    expect(res.body.s3Key).toContain(`screenshots/${userId}/`);
  });

  it('should confirm screenshot upload and store metadata', async () => {
    const s3Key = `screenshots/${userId}/test_123.jpg`;
    const capturedAt = new Date().toISOString();

    const res = await request(app)
      .post('/api/screenshots/confirm')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        s3Key,
        capturedAt,
        isBlurred: true,
        activityScore: 85,
      });

    expect(res.status).toBe(201);
    expect(res.body.screenshot.s3Key).toBe(s3Key);
    expect(res.body.screenshot.isBlurred).toBe(true);
    expect(res.body.screenshot.activityScore).toBe(85);
  });

  it('should return presigned GET download URL and write VIEW_SCREENSHOT to audit logs', async () => {
    const s3Key = `screenshots/${userId}/view_test.jpg`;
    const screenshot = await ScreenshotModel.create({
      userId,
      s3Key,
      capturedAt: new Date(),
      isBlurred: false,
      activityScore: 90,
    });

    const res = await request(app)
      .get(`/api/screenshots/${screenshot._id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('downloadUrl');
    expect(res.body.screenshot._id).toBe(screenshot._id.toString());

    // Verify audit log recorded for screenshot viewer
    const auditLogs = await AuditLogModel.find({ action: 'VIEW_SCREENSHOT' });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].actorId.toString()).toBe(userId);
    expect(auditLogs[0].targetId).toBe(screenshot._id.toString());
  });
});
