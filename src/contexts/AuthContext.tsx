'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, userAPI, clearTokens } from '../lib/api';

interface User {
  _id: string;
  email: string;
  name?: string;
  provider: string;
  role: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ requires2FA?: boolean; tempToken?: string }>;
  signup: (name: string, email: string, password: string) => Promise<any>;
  verify2FA: (email: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  googleLogin: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    // Don't try to fetch user on login or signup page
    if (typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname === '/signup')) {
      setLoading(false);
      return;
    }

    try {
      const userData = await userAPI.getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
      // Only redirect if we're not already on the login/signup page
      if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authAPI.login(email, password);

    // If 2FA is required, return the info without fetching user
    if (result.requires2FA) {
      return { requires2FA: true, tempToken: result.tempToken };
    }

    // Otherwise fetch user and complete login
    await fetchUser();
    return { requires2FA: false };
  };

  const signup = async (name: string, email: string, password: string) => {
    const result = await authAPI.signup(name, email, password);
    await fetchUser();
    return result;
  };

  const verify2FA = async (email: string, token: string) => {
    await authAPI.verify2FA(email, token);
    await fetchUser();
  };

  const logout = async () => {
    await authAPI.logout();
    clearTokens();
    setUser(null);
  };

  const googleLogin = () => {
    authAPI.googleLogin();
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    signup,
    verify2FA,
    logout,
    googleLogin,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
