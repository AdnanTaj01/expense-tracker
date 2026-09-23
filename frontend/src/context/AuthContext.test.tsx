import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "./AuthContext";
import { clearToken, setToken } from "../api/client";

// Small consumer component that exposes auth state as text.
function Consumer() {
  const { user, isAuthenticated, isLoading, login, register, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? "none"}</span>
      <button onClick={() => login("a@b.com", "pw")}>login</button>
      <button
        onClick={() =>
          register({ email: "c@d.com", password: "password123" })
        }
      >
        register
      </button>
      <button onClick={logout}>logout</button>
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
      expect(screen.getByTestId("email").textContent).toBe("persisted@test.com"),
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
    // login → token response
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "new-token", token_type: "bearer" }),
      )
      // me → user response
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

  it("throws if useAuth is used outside of AuthProvider", () => {
    // Suppress React error boundary noise.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(
      /useAuth must be used inside/,
    );
    spy.mockRestore();
  });
});

// Keep TypeScript happy — clearToken import is used in other test files.
void clearToken;