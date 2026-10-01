import { ApiError, getToken } from "./client";
import type {
  AgentChatRequest,
  AgentChatResponse,
  AgentConfirmRequest,
  AgentConfirmResponse,
} from "../types/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const agentApi = {
  ask: async (payload: AgentChatRequest): Promise<AgentChatResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/agent/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
    });
    return handleJson<AgentChatResponse>(res);
  },

  confirm: async (payload: AgentConfirmRequest): Promise<AgentConfirmResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/agent/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
    });
    return handleJson<AgentConfirmResponse>(res);
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