import { api } from "./client";
import type {
  AccountSpend,
  CategoryTrend,
  MonthComparison,
  WeekdayHeatmapItem,
} from "../types/api";

export const analyticsApi = {
  monthComparison: (
    year?: number,
    month?: number,
  ): Promise<MonthComparison> => {
    const params = new URLSearchParams();
    if (year !== undefined) params.set("year", String(year));
    if (month !== undefined) params.set("month", String(month));
    const qs = params.toString();
    const path = qs
      ? `/api/v1/analytics/month-comparison?${qs}`
      : "/api/v1/analytics/month-comparison";
    return api.get<MonthComparison>(path);
  },

  categoryTrend: (
    categoryId: number,
    months: number = 6,
  ): Promise<CategoryTrend> => {
    const params = new URLSearchParams({
      category_id: String(categoryId),
      months: String(months),
    });
    return api.get<CategoryTrend>(
      `/api/v1/analytics/category-trend?${params.toString()}`,
    );
  },

  topAccounts: (months: number = 3): Promise<AccountSpend[]> => {
    return api.get<AccountSpend[]>(
      `/api/v1/analytics/top-accounts?months=${months}`,
    );
  },

  weekdayHeatmap: (months: number = 3): Promise<WeekdayHeatmapItem[]> => {
    return api.get<WeekdayHeatmapItem[]>(
      `/api/v1/analytics/weekday-heatmap?months=${months}`,
    );
  },
};