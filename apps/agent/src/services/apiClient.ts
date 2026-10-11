import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface SavedCredentials {
  email?: string;
  password?: string;
}

export class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private savedCredentials: SavedCredentials | null = null;
  private cookieJar: string[] = [];
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;
  private sessionFilePath: string;

  private baseUrl: string = (() => {
    const raw = process.env.TRACKIFY_API_URL || process.env.API_URL || 'https://trackify-agent.onrender.com';
    return raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
  })();

  constructor() {
    // Determine session storage path safely
    try {
      this.sessionFilePath = path.join(app.getPath('userData'), 'session.json');
    } catch (_) {
      this.sessionFilePath = path.join(process.cwd(), '.agent_session.json');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 20000,
    });

    // Request interceptor: inject token and cookies
    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      if (this.cookieJar.length > 0 && !config.headers.Cookie) {
        config.headers.Cookie = this.cookieJar.join('; ');
      }
      return config;
    });

    // Response interceptor: handle 401 token expiration and auto-renew
    this.client.interceptors.response.use(
      (response) => {
        // Collect any set-cookie headers
        const setCookie = response.headers?.['set-cookie'];
        if (setCookie) {
          this.storeCookies(setCookie);
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        if (!originalRequest) return Promise.reject(error);

        const isAuthUrl =
          originalRequest.url?.includes('/auth/login') ||
          originalRequest.url?.includes('/auth/refresh');

        // Check if error is 401 and request hasn't been retried yet
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthUrl) {
          originalRequest._retry = true;
          console.warn(`[ApiClient] Received 401 Unauthorized for ${originalRequest.url}. Attempting auto-reauth...`);

          const renewed = await this.renewAuthentication();
          if (renewed && this.token) {
            console.log(`[ApiClient] Token renewed successfully. Retrying request: ${originalRequest.url}`);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${this.token}`;
            return this.client(originalRequest);
          } else {
            console.error(`[ApiClient] Failed to renew authentication for ${originalRequest.url}`);
          }
        }

        return Promise.reject(error);
      }
    );

    // Load any persisted session on startup
    this.loadSession();
  }

  private storeCookies(setCookieHeaders: string | string[]) {
    const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    for (const item of list) {
      const parts = item.split(';')[0];
      if (parts && !this.cookieJar.includes(parts)) {
        // Replace matching cookie name if present
        const cookieName = parts.split('=')[0];
        this.cookieJar = this.cookieJar.filter((c) => !c.startsWith(`${cookieName}=`));
        this.cookieJar.push(parts);
      }
    }
  }

  private saveSession() {
    try {
      const data = {
        token: this.token,
        refreshToken: this.refreshToken,
        credentials: this.savedCredentials,
        cookieJar: this.cookieJar,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.sessionFilePath, JSON.stringify(data, null, 2));
    } catch (err: any) {
      console.warn('[ApiClient] Failed to persist session:', err.message);
    }
  }

  private loadSession() {
    try {
      if (fs.existsSync(this.sessionFilePath)) {
        const raw = fs.readFileSync(this.sessionFilePath, 'utf8');
        const data = JSON.parse(raw);
        if (data.token) this.token = data.token;
        if (data.refreshToken) this.refreshToken = data.refreshToken;
        if (data.credentials) this.savedCredentials = data.credentials;
        if (Array.isArray(data.cookieJar)) this.cookieJar = data.cookieJar;
      }
    } catch (_) {}
  }

  public setToken(token: string | null) {
    this.token = token;
    this.saveSession();
  }

  public getToken(): string | null {
    return this.token;
  }

  public getSavedCredentials(): SavedCredentials | null {
    return this.savedCredentials;
  }

  public async renewAuthentication(): Promise<boolean> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        // Attempt 1: Refresh token endpoint
        if (this.refreshToken || this.cookieJar.length > 0) {
          try {
            console.log('[ApiClient] Attempting token refresh via /auth/refresh...');
            const headers: Record<string, string> = {};
            if (this.cookieJar.length > 0) {
              headers['Cookie'] = this.cookieJar.join('; ');
            }
            if (this.refreshToken) {
              headers['x-refresh-token'] = this.refreshToken;
            }

            const refreshRes = await axios.post(
              `${this.baseUrl}/auth/refresh`,
              { refreshToken: this.refreshToken },
              { headers, timeout: 12000 }
            );

            if (refreshRes.data?.accessToken) {
              this.token = refreshRes.data.accessToken;
              if (refreshRes.data.refreshToken) {
                this.refreshToken = refreshRes.data.refreshToken;
              }
              const setCookie = refreshRes.headers?.['set-cookie'];
              if (setCookie) this.storeCookies(setCookie);
              this.saveSession();
              console.log('[ApiClient] Access token refreshed successfully.');
              return true;
            }
          } catch (refErr: any) {
            console.warn('[ApiClient] Token refresh attempt unsuccessful:', refErr?.response?.data?.message || refErr.message);
          }
        }

        // Attempt 2: Auto re-login using saved session credentials
        if (this.savedCredentials?.email && this.savedCredentials?.password) {
          console.log(`[ApiClient] Silently re-authenticating credentials for ${this.savedCredentials.email}...`);
          const loginRes = await axios.post(
            `${this.baseUrl}/auth/login`,
            { email: this.savedCredentials.email, password: this.savedCredentials.password },
            { timeout: 15000 }
          );

          if (loginRes.data?.accessToken) {
            this.token = loginRes.data.accessToken;
            if (loginRes.data.refreshToken) {
              this.refreshToken = loginRes.data.refreshToken;
            }
            const setCookie = loginRes.headers?.['set-cookie'];
            if (setCookie) this.storeCookies(setCookie);
            this.saveSession();
            console.log('[ApiClient] Session re-authenticated successfully via login.');
            return true;
          }
        }

        return false;
      } catch (err: any) {
        console.error('[ApiClient] Auto-reauth failed entirely:', err?.response?.data?.message || err.message);
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  public getDeviceInfo() {
    return {
      deviceName: os.hostname(),
      os: `${os.platform()} ${os.release()}`,
    };
  }

  public async login(email: string, password: string) {
    this.savedCredentials = { email, password };
    const res = await this.client.post('/auth/login', { email, password });
    if (res.data.accessToken) {
      this.token = res.data.accessToken;
    }
    if (res.data.refreshToken) {
      this.refreshToken = res.data.refreshToken;
    }
    const setCookie = res.headers?.['set-cookie'];
    if (setCookie) {
      this.storeCookies(setCookie);
    }
    this.saveSession();
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

  public async stopTimer(timeEntryId?: string, durationSeconds?: number, breakSeconds?: number, idleSeconds?: number) {
    const res = await this.client.post('/timers/stop', {
      timeEntryId,
      durationSeconds,
      breakSeconds,
      idleSeconds,
    });
    return res.data;
  }

  public async syncTimeEntries(entries: any[]) {
    const res = await this.client.post('/time-entries/sync', { entries });
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
    return res.data;
  }

  public async uploadScreenshotToS3(uploadUrl: string, buffer: Buffer, contentType: string = 'image/jpeg') {
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

  public async uploadScreenshotDirect(
    buffer: Buffer,
    capturedAt: string = new Date().toISOString(),
    activityScore: number = 85,
    isBlurred: boolean = false,
    timeEntryId?: string | null,
    deviceId?: string | null
  ) {
    const base64 = buffer.toString('base64');
    const res = await this.client.post('/screenshots/upload', {
      imageBase64: base64,
      capturedAt,
      activityScore,
      isBlurred,
      timeEntryId,
      deviceId,
    });
    return res.data;
  }
}

export const apiClient = new ApiClient();
