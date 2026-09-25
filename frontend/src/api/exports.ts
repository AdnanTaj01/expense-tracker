import { ApiError, getToken } from "./client";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/** Download a CSV from the backend and trigger a browser download. */
export async function downloadCsv(path: string, fallbackName: string) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    // Try to read the error detail
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body && typeof body.detail === "string") detail = body.detail;
    } catch {
      // ignore
    }
    throw new ApiError(response.status, detail);
  }

  // Prefer the filename from Content-Disposition if present
  let filename = fallbackName;
  const cd = response.headers.get("content-disposition");
  if (cd) {
    const match = /filename="?([^"]+)"?/.exec(cd);
    if (match) filename = match[1];
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const exportsApi = {
  transactions: () => downloadCsv("/api/v1/exports/transactions.csv", "transactions.csv"),
  accounts: () => downloadCsv("/api/v1/exports/accounts.csv", "accounts.csv"),
  budgets: (year: number, month: number) =>
    downloadCsv(
      `/api/v1/exports/budgets.csv?year=${year}&month=${month}`,
      `budgets_${year}_${String(month).padStart(2, "0")}.csv`,
    ),
};