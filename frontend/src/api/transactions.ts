import { api } from "./client";
import type {
  Transaction,
  TransactionCreate,
  TransactionList,
  TransactionUpdate,
} from "../types/api";

export interface TransactionFilters {
  account_id?: number;
  category_id?: number;
  kind?: "income" | "expense";
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export const transactionsApi = {
  list: (filters: TransactionFilters = {}): Promise<TransactionList> => {
    const params = new URLSearchParams();
    if (filters.account_id !== undefined)
      params.set("account_id", String(filters.account_id));
    if (filters.category_id !== undefined)
      params.set("category_id", String(filters.category_id));
    if (filters.kind) params.set("kind", filters.kind);
    if (filters.from_date) params.set("from_date", filters.from_date);
    if (filters.to_date) params.set("to_date", filters.to_date);
    if (filters.limit !== undefined) params.set("limit", String(filters.limit));
    if (filters.offset !== undefined)
      params.set("offset", String(filters.offset));
    const qs = params.toString();
    const path = qs ? `/api/v1/transactions?${qs}` : "/api/v1/transactions";
    return api.get<TransactionList>(path);
  },

  get: (id: number): Promise<Transaction> =>
    api.get<Transaction>(`/api/v1/transactions/${id}`),

  create: (payload: TransactionCreate): Promise<Transaction> =>
    api.post<Transaction>("/api/v1/transactions", payload),

  update: (id: number, payload: TransactionUpdate): Promise<Transaction> =>
    api.patch<Transaction>(`/api/v1/transactions/${id}`, payload),

  delete: (id: number): Promise<void> =>
    api.delete<void>(`/api/v1/transactions/${id}`),
};