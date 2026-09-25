import { api } from "./client";
import type { Budget } from "../types/api";

export interface BudgetCreate {
  category_id: number;
  year: number;
  month: number;
  limit_amount: string;
}

export interface BudgetUpdate {
  limit_amount: string;
}

export const budgetsApi = {
  list: (year?: number, month?: number): Promise<Budget[]> => {
    const params = new URLSearchParams();
    if (year !== undefined) params.set("year", String(year));
    if (month !== undefined) params.set("month", String(month));
    const qs = params.toString();
    const path = qs ? `/api/v1/budgets?${qs}` : "/api/v1/budgets";
    return api.get<Budget[]>(path);
  },

  create: (payload: BudgetCreate): Promise<Budget> =>
    api.post<Budget>("/api/v1/budgets", payload),

  update: (id: number, payload: BudgetUpdate): Promise<Budget> =>
    api.patch<Budget>(`/api/v1/budgets/${id}`, payload),

  delete: (id: number): Promise<void> =>
    api.delete<void>(`/api/v1/budgets/${id}`),
};