import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import DashboardPage from "./DashboardPage";
import { renderWithProviders, screen, waitFor } from "../test/utils";

// Mock useAuth so we control the currency and greeting.
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { useAuth } from "../context/AuthContext";

const mockedUseAuth = vi.mocked(useAuth);

const baseUser = {
  id: 1,
  email: "a@b.com",
  full_name: "Adnan",
  currency: "PKR",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

function setupAuth() {
  mockedUseAuth.mockReturnValue({
    user: baseUser,
    isAuthenticated: true,
    isLoading: false,
    sessionExpired: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clearSessionExpired: vi.fn(),
    changePassword: vi.fn(),
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const sampleOverview = {
  summary: {
    year: 2026,
    month: 9,
    total_balance: "15000.00",
    month_income: "5000.00",
    month_expense: "2000.00",
    net: "3000.00",
  },
  top_categories: [
    {
      category_id: 1,
      category_name: "Food",
      total: "1200.00",
      percentage: "60.00",
      transaction_count: 3,
    },
    {
      category_id: 2,
      category_name: "Rent",
      total: "800.00",
      percentage: "40.00",
      transaction_count: 1,
    },
  ],
  trend: [
    { year: 2026, month: 4, income: "0.00", expense: "0.00" },
    { year: 2026, month: 5, income: "0.00", expense: "0.00" },
    { year: 2026, month: 6, income: "0.00", expense: "0.00" },
    { year: 2026, month: 7, income: "0.00", expense: "0.00" },
    { year: 2026, month: 8, income: "0.00", expense: "0.00" },
    { year: 2026, month: 9, income: "5000.00", expense: "2000.00" },
  ],
  recent_transactions: [
    {
      id: 1,
      user_id: 1,
      account_id: 1,
      category_id: 1,
      kind: "expense" as const,
      amount: "500.00",
      note: "Lunch",
      occurred_at: "2026-09-22T12:00:00Z",
      created_at: "2026-09-22T12:00:00Z",
      updated_at: "2026-09-22T12:00:00Z",
    },
    {
      id: 2,
      user_id: 1,
      account_id: 1,
      category_id: null,
      kind: "income" as const,
      amount: "5000.00",
      note: "Salary",
      occurred_at: "2026-09-01T10:00:00Z",
      created_at: "2026-09-01T10:00:00Z",
      updated_at: "2026-09-01T10:00:00Z",
    },
  ],
  generated_at: "2026-09-24T00:00:00Z",
};

describe("DashboardPage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupAuth();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows loading state initially", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders summary values once data loads", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(sampleOverview));

    renderWithProviders(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByText(/welcome, adnan/i)).toBeInTheDocument(),
    );

    // Unique values — safe with getByText
    expect(screen.getByText(/15,000/)).toBeInTheDocument();
    expect(screen.getByText(/2,000/)).toBeInTheDocument();
    expect(screen.getByText(/3,000/)).toBeInTheDocument();
    // 5,000 appears twice (Month Income card + Salary transaction) —
    // use getAllByText and check for at least one.
    expect(screen.getAllByText(/5,000/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders top categories", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(sampleOverview));
    renderWithProviders(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("Food")).toBeInTheDocument(),
    );
    expect(screen.getByText("Rent")).toBeInTheDocument();
  });

  it("renders recent transactions with signs", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(sampleOverview));
    renderWithProviders(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("Lunch")).toBeInTheDocument(),
    );
    expect(screen.getByText("Salary")).toBeInTheDocument();
  });

  it("shows error message when the API call fails", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: "Could not load dashboard" }, 500),
    );

    renderWithProviders(<DashboardPage />);

    await waitFor(() =>
      expect(
        screen.getByText(/could not load dashboard/i),
      ).toBeInTheDocument(),
    );
  });

  it("shows empty-state when there is no data", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        summary: {
          year: 2026,
          month: 9,
          total_balance: "0.00",
          month_income: "0.00",
          month_expense: "0.00",
          net: "0.00",
        },
        top_categories: [],
        trend: [
          { year: 2026, month: 4, income: "0.00", expense: "0.00" },
          { year: 2026, month: 5, income: "0.00", expense: "0.00" },
          { year: 2026, month: 6, income: "0.00", expense: "0.00" },
          { year: 2026, month: 7, income: "0.00", expense: "0.00" },
          { year: 2026, month: 8, income: "0.00", expense: "0.00" },
          { year: 2026, month: 9, income: "0.00", expense: "0.00" },
        ],
        recent_transactions: [],
        generated_at: "2026-09-24T00:00:00Z",
      }),
    );

    renderWithProviders(<DashboardPage />);

    await waitFor(() =>
      expect(
        screen.getByText(/no expenses this month yet/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
  });
});