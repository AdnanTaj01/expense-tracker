import { api } from "./client";
import type { Category, CategoryCreate, CategoryUpdate } from "../types/api";

export const categoriesApi = {
  list: (kind?: "income" | "expense"): Promise<Category[]> => {
    const path = kind
      ? `/api/v1/categories?kind=${kind}`
      : "/api/v1/categories";
    return api.get<Category[]>(path);
  },

  create: (payload: CategoryCreate): Promise<Category> =>
    api.post<Category>("/api/v1/categories", payload),

  update: (id: number, payload: CategoryUpdate): Promise<Category> =>
    api.patch<Category>(`/api/v1/categories/${id}`, payload),

  delete: (id: number): Promise<void> =>
    api.delete<void>(`/api/v1/categories/${id}`),
};