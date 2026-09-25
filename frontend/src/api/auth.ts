import { api } from "./client";
import type {
  ForgotPasswordRequest,
  ResetPasswordRequest,
  Token,
  User,
  UserCreate,
} from "../types/api";

export const authApi = {
  register: (payload: UserCreate): Promise<User> =>
    api.post<User>("/api/v1/auth/register", payload, false),

  login: (email: string, password: string): Promise<Token> =>
    api.postForm<Token>("/api/v1/auth/login", {
      username: email,
      password,
    }),

  me: (): Promise<User> => api.get<User>("/api/v1/auth/me", true),

  forgotPassword: (payload: ForgotPasswordRequest): Promise<void> =>
    api.post<void>("/api/v1/auth/forgot-password", payload, false),

  resetPassword: (payload: ResetPasswordRequest): Promise<void> =>
    api.post<void>("/api/v1/auth/reset-password", payload, false),
};