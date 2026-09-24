import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

// Mock AuthProvider as passthrough and useAuth per-test.
vi.mock("./context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: vi.fn(),
}));

import { useAuth } from "./context/AuthContext";

const mockedUseAuth = vi.mocked(useAuth);

const authedValue = {
  user: {
    id: 1,
    email: "a@b.com",
    full_name: "Adnan",
    currency: "PKR",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  isAuthenticated: true,
  isLoading: false,
  sessionExpired: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  clearSessionExpired: vi.fn(),
};

const anonValue = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  sessionExpired: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  clearSessionExpired: vi.fn(),
};

function setUrl(path: string) {
  window.history.pushState({}, "", path);
}

function renderApp() {
  return render(<App />);
}

describe("App routing", () => {
  beforeEach(() => setUrl("/"));
  afterEach(() => setUrl("/"));

  it("redirects unauthenticated users away from /dashboard to /login", async () => {
    mockedUseAuth.mockReturnValue(anonValue);
    setUrl("/dashboard");
    renderApp();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /sign in/i }),
      ).toBeInTheDocument(),
    );
  });

  it("renders LoginPage at /login", () => {
    mockedUseAuth.mockReturnValue(anonValue);
    setUrl("/login");
    renderApp();
    expect(
      screen.getByRole("heading", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("renders RegisterPage at /register", () => {
    mockedUseAuth.mockReturnValue(anonValue);
    setUrl("/register");
    renderApp();
    expect(
      screen.getByRole("heading", { name: /create account/i }),
    ).toBeInTheDocument();
  });

  it("shows 404 for unknown routes", () => {
    mockedUseAuth.mockReturnValue(anonValue);
    setUrl("/totally-unknown");
    renderApp();
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("renders dashboard with welcome text when authenticated", async () => {
    mockedUseAuth.mockReturnValue(authedValue);
    setUrl("/dashboard");
    renderApp();
    await waitFor(() =>
      expect(screen.getByText(/welcome, adnan/i)).toBeInTheDocument(),
    );
  });
});