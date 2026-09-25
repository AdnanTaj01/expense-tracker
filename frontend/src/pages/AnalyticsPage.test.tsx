import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AnalyticsPage from "./AnalyticsPage";
import { renderWithProviders, screen, waitFor } from "../test/utils";

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

const comparisonPayload = {
  current_year: 2026,
  current_month: 9,
  current_income: "5000.00",
  current_expense: "2000.00",
  previous_year: 2026,
  previous_month: 8,
  previous_income: "4000.00",
  previous_expense: "1500.00",
  income_change_pct: "25.00",
  expense_change_pct: "33.33",
};

const topAccountsPayload = [
  {
    account_id: 1,
    account_name: "Meezan",
    total_expense: "1500.00",
    total_income: "0.00",
    transaction_count: 2,
  },
];

const weekdayPayload = [
  { weekday: 0, weekday_name: "Monday", total_expense: "500.00", total_income: "0.00", transaction_count: 1 },
  { weekday: 1, weekday_name: "Tuesday", total_expense: "0.00", total_income: "0.00", transaction_count: 0 },
  { weekday: 2, weekday_name: "Wednesday", total_expense: "0.00", total_income: "0.00", transaction_count: 0 },
  { weekday: 3, weekday_name: "Thursday", total_expense: "0.00", total_income: "0.00", transaction_count: 0 },
  { weekday: 4, weekday_name: "Friday", total_expense: "0.00", total_income: "0.00", transaction_count: 0 },
  { weekday: 5, weekday_name: "Saturday", total_expense: "0.00", total_income: "0.00", transaction_count: 0 },
  { weekday: 6, weekday_name: "Sunday", total_expense: "0.00", total_income: "0.00", transaction_count: 0 },
];

const categoriesPayload = [
  {
    id: 10,
    user_id: 1,
    name: "Food",
    kind: "expense" as const,
    is_default: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const trendPayload = {
  category_id: 10,
  category_name: "Food",
  kind: "expense",
  points: [
    { year: 2026, month: 7, total: "100.00", transaction_count: 1 },
    { year: 2026, month: 8, total: "200.00", transaction_count: 2 },
    { year: 2026, month: 9, total: "300.00", transaction_count: 3 },
  ],
  total: "600.00",
};

function mockByUrl(handlers: Record<string, () => Response>) {
  return vi.fn(async (url: string) => {
    for (const key of Object.keys(handlers)) {
      if (url.includes(key)) return handlers[key]();
    }
    throw new Error(`Unhandled URL: ${url}`);
  });
}

describe("AnalyticsPage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupAuth();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders comparison, top accounts, and weekday charts", async () => {
    fetchMock = mockByUrl({
      "/api/v1/analytics/month-comparison": () => jsonResponse(comparisonPayload),
      "/api/v1/analytics/top-accounts": () => jsonResponse(topAccountsPayload),
      "/api/v1/analytics/weekday-heatmap": () => jsonResponse(weekdayPayload),
      "/api/v1/categories": () => jsonResponse(categoriesPayload),
      "/api/v1/analytics/category-trend": () => jsonResponse(trendPayload),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<AnalyticsPage />);

    await waitFor(() =>
      expect(screen.getByText(/Sep 2026 vs Aug 2026/i)).toBeInTheDocument(),
    );

    // Values
    expect(screen.getByText(/5,000/)).toBeInTheDocument();
    expect(screen.getByText(/2,000/)).toBeInTheDocument();
    // Changes
    expect(screen.getByText("+25.0%")).toBeInTheDocument();
    expect(screen.getByText("+33.3%")).toBeInTheDocument();

    // Chart sections
    expect(
      screen.getByText(/top accounts by expense/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/spending by weekday/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/category trend/i)).toBeInTheDocument();
  });

  it("shows empty state when there are no expenses", async () => {
    fetchMock = mockByUrl({
      "/api/v1/analytics/month-comparison": () =>
        jsonResponse({
          ...comparisonPayload,
          current_income: "0.00",
          current_expense: "0.00",
          previous_income: "0.00",
          previous_expense: "0.00",
          income_change_pct: null,
          expense_change_pct: null,
        }),
      "/api/v1/analytics/top-accounts": () => jsonResponse([]),
      "/api/v1/analytics/weekday-heatmap": () => jsonResponse(weekdayPayload),
      "/api/v1/categories": () => jsonResponse([]),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<AnalyticsPage />);

    await waitFor(() =>
      expect(
        screen.getByText(/no expenses in the last 3 months/i),
      ).toBeInTheDocument(),
    );
    // change display shows "—" when null
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows error on failure", async () => {
    fetchMock = mockByUrl({
      "/api/v1/analytics/month-comparison": () =>
        jsonResponse({ detail: "Server down" }, 500),
      "/api/v1/analytics/top-accounts": () => jsonResponse([]),
      "/api/v1/analytics/weekday-heatmap": () => jsonResponse([]),
      "/api/v1/categories": () => jsonResponse([]),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<AnalyticsPage />);

    await waitFor(() =>
      expect(screen.getByText(/server down/i)).toBeInTheDocument(),
    );
  });
});