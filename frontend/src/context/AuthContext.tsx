import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authApi } from "../api/auth";
import {
  clearToken,
  getToken,
  setOnUnauthorized,
  setToken,
} from "../api/client";
import type {
  ForgotPasswordRequest,
  ResetPasswordRequest,
  User,
  UserCreate,
} from "../types/api";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: UserCreate) => Promise<void>;
  logout: () => void;
  clearSessionExpired: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    setOnUnauthorized(() => {
      clearToken();
      setUser(null);
      setSessionExpired(true);
    });
    return () => setOnUnauthorized(null);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const token = await authApi.login(email, password);
    setToken(token.access_token);
    const me = await authApi.me();
    setUser(me);
    setSessionExpired(false);
  }, []);

  const register = useCallback(async (payload: UserCreate) => {
    await authApi.register(payload);
    const token = await authApi.login(payload.email, payload.password);
    setToken(token.access_token);
    const me = await authApi.me();
    setUser(me);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setSessionExpired(false);
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const payload: ForgotPasswordRequest = { email };
    await authApi.forgotPassword(payload);
  }, []);

  const resetPassword = useCallback(
    async (token: string, newPassword: string) => {
      const payload: ResetPasswordRequest = {
        token,
        new_password: newPassword,
      };
      await authApi.resetPassword(payload);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      sessionExpired,
      login,
      register,
      logout,
      clearSessionExpired,
      forgotPassword,
      resetPassword,
    }),
    [
      user,
      isLoading,
      sessionExpired,
      login,
      register,
      logout,
      clearSessionExpired,
      forgotPassword,
      resetPassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}