import { api } from "./client";
import type { DashboardOverview } from "../types/api";

export const dashboardApi = {
  overview: (
    year?: number,
    month?: number,
  ): Promise<DashboardOverview> => {
    const params = new URLSearchParams();
    if (year !== undefined) params.set("year", String(year));
    if (month !== undefined) params.set("month", String(month));
    const qs = params.toString();
    const path = qs
      ? `/api/v1/dashboard/overview?${qs}`
      : "/api/v1/dashboard/overview";
    return api.get<DashboardOverview>(path, true);
  },
};