import axios, { AxiosInstance } from 'axios';
import * as os from 'os';

export class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private baseUrl: string = (() => {
    const raw = process.env.TRACKIFY_API_URL || process.env.API_URL || 'https://trackify-agent.onrender.com';
    return raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
  })();

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
    });

    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  public setToken(token: string | null) {
    this.token = token;
  }

  public getToken(): string | null {
    return this.token;
  }

  public getDeviceInfo() {
    // Must match RegisterDeviceSchema: { deviceName, os, ipAddress? }
    return {
      deviceName: os.hostname(),
      os: `${os.platform()} ${os.release()}`,
    };
  }

  public async login(email: string, password: string) {
    const res = await this.client.post('/auth/login', { email, password });
    if (res.data.accessToken) {
      this.setToken(res.data.accessToken);
    }
    return res.data;
  }

  public async registerDevice() {
    const device = this.getDeviceInfo();
    const res = await this.client.post('/devices', device);
    return res.data;
  }

  public async getProjects() {
    const res = await this.client.get('/projects');
    return res.data;
  }

  public async getTasks() {
    const res = await this.client.get('/tasks');
    return res.data;
  }

  public async startTimer(projectId: string, taskId: string) {
    const res = await this.client.post('/timers/start', { projectId, taskId });
    return res.data;
  }

  public async stopTimer() {
    const res = await this.client.post('/timers/stop');
    return res.data;
  }

  public async getActivePolicy() {
    const res = await this.client.get('/policies/active');
    return res.data;
  }

  public async acceptConsent(policyVersion: number) {
    const res = await this.client.post('/policies/consent', { policyVersion });
    return res.data;
  }

  public async getTimeEntries(startDate?: string) {
    const res = await this.client.get('/time-entries', {
      params: startDate ? { startDate } : {},
    });
    return res.data;
  }

  public async uploadActivityBatch(samples: any[]) {
    const res = await this.client.post('/activity/batch', { samples });
    return res.data;
  }

  public async requestPresignedScreenshotUrl(filename: string, contentType: string = 'image/jpeg') {
    const res = await this.client.post('/screenshots/presign', { filename, contentType });
    return res.data; // { uploadUrl, screenshotId, key }
  }

  public async uploadScreenshotToS3(uploadUrl: string, buffer: Buffer, contentType: string = 'image/jpeg') {
    // Direct S3/MinIO PUT upload without API auth header
    await axios.put(uploadUrl, buffer, {
      headers: {
        'Content-Type': contentType,
      },
    });
  }

  public async confirmScreenshot(s3Key: string, capturedAt: string = new Date().toISOString(), activityScore: number = 85, isBlurred: boolean = false) {
    const res = await this.client.post('/screenshots/confirm', {
      s3Key,
      capturedAt,
      activityScore,
      isBlurred,
    });
    return res.data;
  }
}

export const apiClient = new ApiClient();
