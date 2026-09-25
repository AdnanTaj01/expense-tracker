import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "./AuthContext";
import { clearToken, setToken } from "../api/client";

function Consumer() {
  const {
    user,
    isAuthenticated,
    isLoading,
    sessionExpired,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    clearSessionExpired,
  } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? "none"}</span>
      <span data-testid="expired">{String(sessionExpired)}</span>
      <button onClick={() => login("a@b.com", "pw")}>login</button>
      <button
        onClick={() => register({ email: "c@d.com", password: "password123" })}
      >
        register
      </button>
      <button onClick={logout}>logout</button>
      <button onClick={() => forgotPassword("a@b.com")}>forgot</button>
      <button onClick={() => resetPassword("token-xyz", "newpassword")}>
        reset
      </button>
      <button onClick={clearSessionExpired}>clear-expired</button>
    </div>
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("AuthContext", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with no user and finishes loading when no token exists", async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    expect(screen.getByTestId("authed").textContent).toBe("false");
    expect(screen.getByTestId("email").textContent).toBe("none");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("restores session from localStorage token on mount", async () => {
    setToken("existing-token");
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: 1,
        email: "persisted@test.com",
        full_name: "Persisted",
        currency: "PKR",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
      }),
    );

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("email").textContent).toBe(
        "persisted@test.com",
      ),
    );
    expect(screen.getByTestId("authed").textContent).toBe("true");
  });

  it("clears token when /auth/me fails", async () => {
    setToken("bad-token");
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: "Could not validate credentials" }, 401),
    );

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    expect(screen.getByTestId("authed").textContent).toBe("false");
    expect(localStorage.getItem("access_token")).toBeNull();
  });

  it("login stores token and fetches user", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "new-token", token_type: "bearer" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 1,
          email: "a@b.com",
          full_name: null,
          currency: "PKR",
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
        }),
      );

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );

    screen.getByText("login").click();

    await waitFor(() =>
      expect(screen.getByTestId("email").textContent).toBe("a@b.com"),
    );
    expect(localStorage.getItem("access_token")).toBe("new-token");
  });

  it("logout clears token and user", async () => {
    setToken("existing");
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: 1,
        email: "x@y.com",
        full_name: null,
        currency: "PKR",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
      }),
    );

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("authed").textContent).toBe("true"),
    );

    screen.getByText("logout").click();

    await waitFor(() =>
      expect(screen.getByTestId("authed").textContent).toBe("false"),
    );
    expect(localStorage.getItem("access_token")).toBeNull();
  });

  it("forgotPassword calls the backend endpoint", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );

    screen.getByText("forgot").click();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/auth/forgot-password");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ email: "a@b.com" });
  });

  it("resetPassword calls the backend endpoint", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );

    screen.getByText("reset").click();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/auth/reset-password");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      token: "token-xyz",
      new_password: "newpassword",
    });
  });

  it("throws if useAuth is used outside of AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(/useAuth must be used inside/);
    spy.mockRestore();
  });
});

// Keep TS happy — clearToken is used indirectly via localStorage in tests.
void clearToken;