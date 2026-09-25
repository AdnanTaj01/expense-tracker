import { ApiError, getToken } from "./client";
import type { Receipt } from "../types/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const receiptsApi = {
  list: (): Promise<Receipt[]> =>
    fetch(`${API_BASE_URL}/api/v1/receipts`, {
      headers: authHeaders(),
    }).then(handleJson<Receipt[]>),

  upload: async (
    file: File,
    transactionId: number | null,
  ): Promise<Receipt> => {
    const form = new FormData();
    form.append("file", file);
    if (transactionId !== null) {
      form.append("transaction_id", String(transactionId));
    }
    const res = await fetch(`${API_BASE_URL}/api/v1/receipts`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    return handleJson<Receipt>(res);
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/receipts/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.status === 204) return;
    await handleJson<unknown>(res);
  },

  download: async (id: number, filename: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/receipts/${id}/download`, {
      headers: authHeaders(),
    });
    if (!res.ok) await handleJson<unknown>(res);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleJson<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    if (parsed && typeof parsed === "object" && "detail" in parsed) {
      const d = (parsed as { detail: unknown }).detail;
      if (typeof d === "string") detail = d;
    }
    throw new ApiError(res.status, detail);
  }
  return parsed as T;
}