import { api } from "./client";
import type { Account, AccountCreate, AccountUpdate } from "../types/api";

export const accountsApi = {
  list: (): Promise<Account[]> =>
    api.get<Account[]>("/api/v1/accounts"),

  get: (id: number): Promise<Account> =>
    api.get<Account>(`/api/v1/accounts/${id}`),

  create: (payload: AccountCreate): Promise<Account> =>
    api.post<Account>("/api/v1/accounts", payload),

  update: (id: number, payload: AccountUpdate): Promise<Account> =>
    api.patch<Account>(`/api/v1/accounts/${id}`, payload),

  delete: (id: number): Promise<void> =>
    api.delete<void>(`/api/v1/accounts/${id}`),
};