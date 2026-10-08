import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { UserModel, TeamModel, PolicyModel } from '../models';
import { hashPassword } from '../services/auth.service';

let mongoServer: MongoMemoryServer;
const app = createApp();

let adminToken: string;
let managerToken: string;
let employeeToken: string;
let managerId: string;
let employeeId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await UserModel.deleteMany({});
  await TeamModel.deleteMany({});
  await PolicyModel.deleteMany({});

  const pass = await hashPassword('Pass123!');

  const admin = await UserModel.create({
    email: 'admin@teamlogger.com',
    password: pass,
    name: 'Admin User',
    role: 'admin',
  });

  const manager = await UserModel.create({
    email: 'manager@teamlogger.com',
    password: pass,
    name: 'Manager User',
    role: 'manager',
  });
  managerId = manager._id.toString();

  const employee = await UserModel.create({
    email: 'employee@teamlogger.com',
    password: pass,
    name: 'Employee User',
    role: 'employee',
  });
  employeeId = employee._id.toString();

  const team = await TeamModel.create({
    name: 'Engineering',
    managerId: manager._id,
    memberIds: [manager._id, employee._id],
  });

  manager.teamId = team._id as any;
  await manager.save();

  employee.teamId = team._id as any;
  await employee.save();

  // Login to acquire tokens
  const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@teamlogger.com', password: 'Pass123!' });
  adminToken = adminRes.body.accessToken;

  const managerRes = await request(app).post('/api/auth/login').send({ email: 'manager@teamlogger.com', password: 'Pass123!' });
  managerToken = managerRes.body.accessToken;

  const empRes = await request(app).post('/api/auth/login').send({ email: 'employee@teamlogger.com', password: 'Pass123!' });
  employeeToken = empRes.body.accessToken;
});

describe('RBAC & Policy Endpoints', () => {
  it('should allow Admin to access admin user management endpoint', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(3);
  });

  it('should deny Employee from accessing admin endpoints with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('should deny Manager from accessing admin endpoints with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('should allow Admin to create new team via Admin endpoints', async () => {
    const res = await request(app)
      .post('/api/admin/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Design Team',
      });

    expect(res.status).toBe(201);
    expect(res.body.team.name).toBe('Design Team');
  });

  it('should scope time-entries correctly for Employee (only own data)', async () => {
    const res = await request(app)
      .get('/api/time-entries')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.filterApplied).toEqual({ userId: employeeId });
  });

  it('should scope time-entries correctly for Manager (own team members)', async () => {
    const res = await request(app)
      .get('/api/time-entries')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.filterApplied).toHaveProperty('userId.$in');
    expect(res.body.filterApplied['userId'].$in).toContain(employeeId);
    expect(res.body.filterApplied['userId'].$in).toContain(managerId);
  });

  it('should scope time-entries correctly for Admin (whole org - empty filter)', async () => {
    const res = await request(app)
      .get('/api/time-entries')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.filterApplied).toEqual({});
  });

  it('should allow Admin to create a policy and Employee to accept consent', async () => {
    // Create policy v1
    const policyRes = await request(app)
      .post('/api/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: 1,
        screenshotIntervalMinutes: 5,
        isBlurEnabled: true,
        retentionDays: 60,
        consentText: 'I accept policy v1 terms.',
      });

    expect(policyRes.status).toBe(201);
    expect(policyRes.body.policy.version).toBe(1);

    // Employee accepts consent
    const consentRes = await request(app)
      .post('/api/policies/consent')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        policyVersion: 1,
      });

    expect(consentRes.status).toBe(200);
    expect(consentRes.body.consent.policyVersion).toBe(1);
  });
});
