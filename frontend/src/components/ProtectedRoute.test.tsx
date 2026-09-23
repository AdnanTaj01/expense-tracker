import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import ProtectedRoute from "./ProtectedRoute";
import { renderWithProviders } from "../test/utils";

// We'll mock useAuth per test.
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { useAuth } from "../context/AuthContext";

const mockedUseAuth = vi.mocked(useAuth);

function renderAt(path: string) {
  return renderWithProviders(
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<div>Dashboard content</div>} />
      </Route>
      <Route path="/login" element={<div>Login page</div>} />
    </Routes>,
    { routerProps: { initialEntries: [path] } },
  );
}

describe("ProtectedRoute", () => {
  it("shows loading while auth is being resolved", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderAt("/dashboard");
    expect(document.body.textContent).toContain("Loading");
  });

  it("redirects to /login when unauthenticated", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderAt("/dashboard");
    expect(document.body.textContent).toContain("Login page");
    expect(document.body.textContent).not.toContain("Dashboard content");
  });

  it("renders children when authenticated", () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: "a@b.com",
        full_name: null,
        currency: "PKR",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderAt("/dashboard");
    expect(document.body.textContent).toContain("Dashboard content");
  });
});