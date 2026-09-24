import { api } from "./client";
import type {
  ChangePasswordPayload,
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

  changePassword: (payload: ChangePasswordPayload): Promise<void> =>
    api.post<void>("/api/v1/auth/change-password", payload, true),
};