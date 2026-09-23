const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const TOKEN_KEY = "access_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  isForm?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = false, isForm = false } = options;

  const headers: Record<string, string> = {};
  let bodyToSend: BodyInit | undefined;

  if (auth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  if (body !== undefined) {
    if (isForm) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      bodyToSend = new URLSearchParams(body as Record<string, string>).toString();
    } else {
      headers["Content-Type"] = "application/json";
      bodyToSend = JSON.stringify(body);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: bodyToSend,
  });

  // 204 No Content — no body
  if (response.status === 204) {
    if (!response.ok) {
      throw new ApiError(response.status, "Request failed");
    }
    return undefined as T;
  }

  let parsed: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    if (parsed && typeof parsed === "object" && "detail" in parsed) {
      const d = (parsed as { detail: unknown }).detail;
      if (typeof d === "string") {
        detail = d;
      } else if (Array.isArray(d)) {
        // Pydantic validation error
        detail = d
          .map((item: { msg?: string; loc?: string[] }) => {
            const loc = item.loc?.slice(1).join(".") ?? "";
            return loc ? `${loc}: ${item.msg ?? ""}` : item.msg ?? "";
          })
          .join(", ");
      }
    }
    throw new ApiError(response.status, detail);
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string, auth = true) =>
    request<T>(path, { method: "GET", auth }),

  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: "POST", body, auth }),

  patch: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: "PATCH", body, auth }),

  delete: <T>(path: string, auth = true) =>
    request<T>(path, { method: "DELETE", auth }),

  postForm: <T>(path: string, form: Record<string, string>, auth = false) =>
    request<T>(path, { method: "POST", body: form, auth, isForm: true }),
};