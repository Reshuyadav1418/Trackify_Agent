import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '@teamlogger/shared';
import { setAccessTokenInMemory } from '../api/client';
import { loginApi, logoutApi, getActivePolicyApi, acceptConsentApi, getConsentStatusApi } from '../api/services';
import axios from 'axios';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamId?: string | null;
}

export interface PolicyData {
  version: number;
  screenshotIntervalMinutes: number;
  isBlurEnabled: boolean;
  retentionDays: number;
  consentText: string;
  isActive: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  accessToken: string | null;
  isLoading: boolean;
  activePolicy: PolicyData | null;
  hasAcceptedPolicy: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  acceptPolicyConsent: () => Promise<void>;
  checkPolicyStatus: (currentUser?: AuthUser | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('trackify_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('trackify_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // If we have a user in localStorage, don't show full page loading spinner
    return !localStorage.getItem('trackify_user');
  });
  const [activePolicy, setActivePolicy] = useState<PolicyData | null>(null);
  const [hasAcceptedPolicy, setHasAcceptedPolicy] = useState<boolean>(true);

  const checkPolicyStatus = async (currentUser?: AuthUser | null) => {
    try {
      const targetUser = currentUser !== undefined ? currentUser : user;
      const policyRes = await getActivePolicyApi();
      if (policyRes.policy) {
        setActivePolicy(policyRes.policy);
      }

      if (targetUser) {
        const consentRes = await getConsentStatusApi();
        setHasAcceptedPolicy(Boolean(consentRes.hasAccepted));
      } else {
        setHasAcceptedPolicy(true);
      }
    } catch (err) {
      console.error('[AuthContext] Failed to fetch policy consent status:', err);
    }
  };

  // On mount, verify existing session or perform silent refresh
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('trackify_token');
      try {
        let fetchedUser: AuthUser | null = null;
        let validToken = storedToken;

        if (storedToken) {
          // Fast verification of existing stored token
          try {
            const meRes = await axios.get(
              `${import.meta.env.VITE_API_URL || ''}/api/auth/me`,
              {
                headers: { Authorization: `Bearer ${storedToken}` },
                withCredentials: true,
              }
            );
            if (meRes.data?.user) {
              fetchedUser = meRes.data.user;
            }
          } catch {
            validToken = null;
          }
        }

        if (!fetchedUser) {
          // Attempt refresh via cookie
          const res = await axios.post(
            `${import.meta.env.VITE_API_URL || ''}/api/auth/refresh`,
            {},
            { withCredentials: true }
          );

          if (res.data?.accessToken) {
            validToken = res.data.accessToken;
            const meRes = await axios.get(
              `${import.meta.env.VITE_API_URL || ''}/api/auth/me`,
              {
                headers: { Authorization: `Bearer ${validToken}` },
                withCredentials: true,
              }
            );
            if (meRes.data?.user) {
              fetchedUser = meRes.data.user;
            }
          }
        }

        if (fetchedUser && validToken) {
          setAccessTokenInMemory(validToken);
          setAccessToken(validToken);
          setUser(fetchedUser);
          localStorage.setItem('trackify_token', validToken);
          localStorage.setItem('trackify_user', JSON.stringify(fetchedUser));
          await checkPolicyStatus(fetchedUser);
        } else {
          throw new Error('Not authenticated');
        }
      } catch {
        setAccessTokenInMemory(null);
        setAccessToken(null);
        setUser(null);
        localStorage.removeItem('trackify_token');
        localStorage.removeItem('trackify_user');
        await checkPolicyStatus(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await loginApi(credentials);
    const token = res.data?.accessToken || res.accessToken;
    const loggedInUser = res.user;
    if (token) {
      localStorage.setItem('trackify_token', token);
      setAccessTokenInMemory(token);
      setAccessToken(token);
    }
    if (loggedInUser) {
      localStorage.setItem('trackify_user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
    }
    await checkPolicyStatus(loggedInUser);
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore error on logout
    } finally {
      localStorage.removeItem('trackify_token');
      localStorage.removeItem('trackify_user');
      setAccessTokenInMemory(null);
      setAccessToken(null);
      setUser(null);
    }
  };

  const acceptPolicyConsent = async () => {
    if (activePolicy) {
      await acceptConsentApi(activePolicy.version);
      setHasAcceptedPolicy(true);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        accessToken,
        isLoading,
        activePolicy,
        hasAcceptedPolicy,
        login,
        logout,
        acceptPolicyConsent,
        checkPolicyStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
