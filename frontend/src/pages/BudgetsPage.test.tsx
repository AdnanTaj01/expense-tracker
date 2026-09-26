import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BudgetsPage from "./BudgetsPage";
import { renderWithProviders, screen, userEvent, waitFor } from "../test/utils";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { useAuth } from "../context/AuthContext";

const mockedUseAuth = vi.mocked(useAuth);

function setupAuth() {
  mockedUseAuth.mockReturnValue({
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
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const foodCategory = {
  id: 20,
  user_id: 1,
  name: "Food",
  kind: "expense" as const,
  is_default: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const sampleBudget = {
  id: 5,
  user_id: 1,
  category_id: 20,
  year: 2026,
  month: 9,
  limit_amount: "10000.00",
  category_name: "Food",
  spent: "2500.00",
  remaining: "7500.00",
  percentage: "25.00",
  is_exceeded: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const exceededBudget = {
  ...sampleBudget,
  id: 6,
  limit_amount: "1000.00",
  spent: "1500.00",
  remaining: "-500.00",
  percentage: "150.00",
  is_exceeded: true,
};

function mockByUrl(handlers: Record<string, () => Response>) {
  return vi.fn(async (url: string) => {
    for (const key of Object.keys(handlers)) {
      if (url.includes(key)) return handlers[key]();
    }
    throw new Error(`Unhandled URL: ${url}`);
  });
}

describe("BudgetsPage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupAuth();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows empty state when there are no budgets", async () => {
    fetchMock = mockByUrl({
      "/api/v1/budgets": () => jsonResponse([]),
      "/api/v1/categories": () => jsonResponse([foodCategory]),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<BudgetsPage />);

    await waitFor(() =>
      expect(screen.getByText(/no budgets set for/i)).toBeInTheDocument(),
    );
  });

  it("renders budgets with usage and progress", async () => {
    fetchMock = mockByUrl({
      "/api/v1/budgets": () => jsonResponse([sampleBudget]),
      "/api/v1/categories": () => jsonResponse([foodCategory]),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<BudgetsPage />);

    await waitFor(() =>
      expect(screen.getByText("Food")).toBeInTheDocument(),
    );
    expect(screen.getByText(/25\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/7,500/)).toBeInTheDocument();
  });

  it("highlights exceeded budgets in red", async () => {
    fetchMock = mockByUrl({
      "/api/v1/budgets": () => jsonResponse([exceededBudget]),
      "/api/v1/categories": () => jsonResponse([foodCategory]),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<BudgetsPage />);

    await waitFor(() =>
      expect(screen.getByText(/150\.0%/)).toBeInTheDocument(),
    );
    expect(screen.getByText(/over by/i)).toBeInTheDocument();
  });

  it("navigates to previous month", async () => {
    fetchMock = mockByUrl({
      "/api/v1/budgets": () => jsonResponse([]),
      "/api/v1/categories": () => jsonResponse([foodCategory]),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<BudgetsPage />);

    await waitFor(() =>
      expect(screen.getByText(/no budgets set for/i)).toBeInTheDocument(),
    );

    const before = document.body.textContent ?? "";
    await userEvent.click(
      screen.getByRole("button", { name: /← previous/i }),
    );
    const after = document.body.textContent ?? "";
    expect(after).not.toBe(before);
  });

  it("shows error when list fails", async () => {
    fetchMock = mockByUrl({
      "/api/v1/budgets": () => jsonResponse({ detail: "Server down" }, 500),
      "/api/v1/categories": () => jsonResponse([foodCategory]),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<BudgetsPage />);

    await waitFor(() =>
      expect(screen.getByText(/server down/i)).toBeInTheDocument(),
    );
  });
});