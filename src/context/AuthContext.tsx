import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAdminSession, loginAdmin, logoutAdmin } from '../services/api';

interface AuthContextValue {
  isAuthenticated: boolean;
  isChecking: boolean;
  loginError: string | null;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  const refreshSession = async () => {
    setIsChecking(true);
    try {
      const result = await getAdminSession();
      setIsAuthenticated(Boolean(result.authenticated));
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const login = async (password: string) => {
    setLoginError(null);
    setIsChecking(true);
    try {
      const result = await loginAdmin(password);
      setIsAuthenticated(Boolean(result.authenticated));
      return Boolean(result.authenticated);
    } catch (error) {
      setIsAuthenticated(false);
      setLoginError(error instanceof Error ? error.message : 'Login failed');
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  const logout = async () => {
    await logoutAdmin();
    setIsAuthenticated(false);
    setLoginError(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isChecking, loginError, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}