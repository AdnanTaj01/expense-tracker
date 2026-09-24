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
import type { User, UserCreate } from "../types/api";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: UserCreate) => Promise<void>;
  logout: () => void;
  clearSessionExpired: () => void;
  changePassword: (current: string, newPw: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Register the 401 handler once. When it fires, we clear local state;
  // ProtectedRoute then redirects to /login automatically.
  useEffect(() => {
    setOnUnauthorized(() => {
      clearToken();
      setUser(null);
      setSessionExpired(true);
    });
    return () => setOnUnauthorized(null);
  }, []);

  // On mount: if a token exists, try to fetch the current user.
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
    // Auto-login after registration.
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

  const changePassword = useCallback(
    async (current: string, newPw: string) => {
      await authApi.changePassword({
        current_password: current,
        new_password: newPw,
      });
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
      changePassword,
    }),
    [
      user,
      isLoading,
      sessionExpired,
      login,
      register,
      logout,
      clearSessionExpired,
      changePassword,
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