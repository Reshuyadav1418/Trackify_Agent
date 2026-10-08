import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { UserModel } from '../models';
import { hashPassword } from '../services/auth.service';

let mongoServer: MongoMemoryServer;
const app = createApp();

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
});

describe('Auth API Endpoints', () => {
  it('should login successfully with valid credentials and return access token + refresh cookie', async () => {
    const password = 'Password123!';
    const hashedPassword = await hashPassword(password);
    await UserModel.create({
      email: 'employee@teamlogger.com',
      password: hashedPassword,
      name: 'John Doe',
      role: 'employee',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'employee@teamlogger.com',
      password,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user).toMatchObject({
      email: 'employee@teamlogger.com',
      name: 'John Doe',
      role: 'employee',
    });

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('refreshToken=');
    expect(cookies[0]).toContain('HttpOnly');
  });

  it('should reject login with invalid credentials', async () => {
    const hashedPassword = await hashPassword('CorrectPass');
    await UserModel.create({
      email: 'user@teamlogger.com',
      password: hashedPassword,
      name: 'Jane Doe',
      role: 'employee',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'user@teamlogger.com',
      password: 'WrongPassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('should refresh access token using rotating refresh token cookie', async () => {
    const password = 'Password123!';
    const hashedPassword = await hashPassword(password);
    await UserModel.create({
      email: 'refresh@teamlogger.com',
      password: hashedPassword,
      name: 'Refresher',
      role: 'employee',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'refresh@teamlogger.com',
      password,
    });

    const refreshCookie = loginRes.headers['set-cookie'];

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toHaveProperty('accessToken');
    expect(refreshRes.headers['set-cookie']).toBeDefined();
  });

  it('should logout user and clear refresh token cookie', async () => {
    const password = 'Password123!';
    const hashedPassword = await hashPassword(password);
    await UserModel.create({
      email: 'logout@teamlogger.com',
      password: hashedPassword,
      name: 'Leaver',
      role: 'employee',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'logout@teamlogger.com',
      password,
    });

    const accessToken = loginRes.body.accessToken;
    const refreshCookie = loginRes.headers['set-cookie'];

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', refreshCookie);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe('Logged out successfully');
  });

  it('should register desktop agent device and return device token', async () => {
    const password = 'Password123!';
    const hashedPassword = await hashPassword(password);
    await UserModel.create({
      email: 'agentuser@teamlogger.com',
      password: hashedPassword,
      name: 'Agent User',
      role: 'employee',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'agentuser@teamlogger.com',
      password,
    });

    const accessToken = loginRes.body.accessToken;

    const deviceRes = await request(app)
      .post('/api/devices/register')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        deviceName: 'Work Macbook Pro',
        os: 'macOS 14.2',
        ipAddress: '192.168.1.50',
      });

    expect(deviceRes.status).toBe(201);
    expect(deviceRes.body).toHaveProperty('deviceToken');
    expect(deviceRes.body.device.deviceName).toBe('Work Macbook Pro');
  });
});
