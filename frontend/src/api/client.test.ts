import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  api,
  clearToken,
  getToken,
  setToken,
} from "./client";

// Helper to build a mock Response.
function mockResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = { "Content-Type": "application/json" },
): Response {
  const text = body === undefined ? "" : JSON.stringify(body);
  return new Response(text, { status, headers });
}

describe("client – token storage", () => {
  it("stores, retrieves, and clears token", () => {
    expect(getToken()).toBeNull();
    setToken("abc.def.ghi");
    expect(getToken()).toBe("abc.def.ghi");
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe("client – requests", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GET sends Authorization header when authenticated", async () => {
    setToken("token-123");
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));

    const result = await api.get<{ ok: boolean }>("/api/v1/test");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/test");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-123",
    );
  });

  it("GET does NOT send Authorization when auth=false", async () => {
    setToken("token-123");
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));

    await api.get("/api/v1/test", false);

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("POST sends JSON body and Content-Type", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ id: 1 }));

    await api.post("/api/v1/items", { name: "test" }, false);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(init.body).toBe(JSON.stringify({ name: "test" }));
  });

  it("postForm sends url-encoded body", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));

    await api.postForm("/api/v1/auth/login", {
      username: "a@b.com",
      password: "pw",
    });

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/x-www-form-urlencoded",
    );
    expect(init.body).toBe("username=a%40b.com&password=pw");
  });

  it("DELETE handles 204 No Content", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    );

    const result = await api.delete("/api/v1/items/1");

    expect(result).toBeUndefined();
  });

  it("throws ApiError with detail from backend on non-2xx", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ detail: "Incorrect email or password" }, 401),
    );

    await expect(api.post("/api/v1/auth/login", {})).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      detail: "Incorrect email or password",
    });
  });

  it("throws ApiError with a readable message on 422 validation error", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        {
          detail: [
            { loc: ["body", "amount"], msg: "Input should be greater than 0" },
            { loc: ["body", "email"], msg: "value is not a valid email" },
          ],
        },
        422,
      ),
    );

    try {
      await api.post("/api/v1/items", {});
      throw new Error("Expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(422);
      expect(apiErr.detail).toContain("amount: Input should be greater than 0");
      expect(apiErr.detail).toContain("email: value is not a valid email");
    }
  });
});