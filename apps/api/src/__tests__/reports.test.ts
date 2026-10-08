import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { UserModel, TimeEntryModel, ActivitySampleModel, ProjectModel } from '../models';
import { hashPassword } from '../services/auth.service';

let mongoServer: MongoMemoryServer;
const app = createApp();

let adminToken: string;
let employeeToken: string;
let employeeId: string;

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
  await ActivitySampleModel.deleteMany({});
  await ProjectModel.deleteMany({});

  const pass = await hashPassword('Pass123!');
  const admin = await UserModel.create({
    email: 'adminrep@teamlogger.com',
    password: pass,
    name: 'Admin Rep',
    role: 'admin',
  });

  const employee = await UserModel.create({
    email: 'emprep@teamlogger.com',
    password: pass,
    name: 'Emp Rep',
    role: 'employee',
  });
  employeeId = employee._id.toString();

  const project = await ProjectModel.create({
    name: 'Website Redesign',
    clientName: 'Acme Corp',
    status: 'active',
  });

  await TimeEntryModel.create({
    userId: employee._id,
    projectId: project._id,
    start: new Date('2026-09-01T09:00:00Z'),
    end: new Date('2026-09-01T17:00:00Z'),
    durationSeconds: 28800, // 8 hours
    isManualEdit: false,
  });

  await ActivitySampleModel.create({
    userId: employee._id,
    timestamp: new Date('2026-09-01T10:00:00Z'),
    minuteBucket: new Date('2026-09-01T10:00:00Z'),
    keyboardCount: 150,
    mouseCount: 45,
    isIdle: false,
  });

  const adminLog = await request(app).post('/api/auth/login').send({ email: 'adminrep@teamlogger.com', password: 'Pass123!' });
  adminToken = adminLog.body.accessToken;

  const empLog = await request(app).post('/api/auth/login').send({ email: 'emprep@teamlogger.com', password: 'Pass123!' });
  employeeToken = empLog.body.accessToken;
});

describe('Reports API Endpoints', () => {
  it('should generate timesheet report in JSON format', async () => {
    const res = await request(app)
      .get('/api/reports/timesheet')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.reports[0].user).toBe('Emp Rep');
    expect(res.body.reports[0].durationMinutes).toBe('480.00');
  });

  it('should export timesheet report as CSV download', async () => {
    const res = await request(app)
      .get('/api/reports/timesheet?format=csv')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Emp Rep');
    expect(res.text).toContain('Website Redesign');
  });

  it('should generate activity report in JSON format', async () => {
    const res = await request(app)
      .get('/api/reports/activity')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.reports[0].keyboardCount).toBe(150);
  });

  it('should generate projects report in JSON format', async () => {
    const res = await request(app)
      .get('/api/reports/projects')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reports[0].projectName).toBe('Website Redesign');
    expect(res.body.reports[0].totalHours).toBe('8.00');
  });

  it('should enforce RBAC on timesheet report for employee', async () => {
    const res = await request(app)
      .get('/api/reports/timesheet')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reports[0].userEmail).toBe('emprep@teamlogger.com');
  });
});
