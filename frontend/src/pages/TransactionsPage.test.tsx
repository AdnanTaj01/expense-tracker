import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TransactionsPage from "./TransactionsPage";
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

const sampleAccount = {
  id: 10,
  user_id: 1,
  name: "Meezan Bank",
  type: "checking" as const,
  balance: "5000.00",
  currency: "PKR",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const foodCategory = {
  id: 20,
  user_id: 1,
  name: "Food",
  kind: "expense" as const,
  is_default: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const salaryCategory = {
  id: 21,
  user_id: 1,
  name: "Salary",
  kind: "income" as const,
  is_default: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const sampleTx = {
  id: 100,
  user_id: 1,
  account_id: 10,
  category_id: 20,
  kind: "expense" as const,
  amount: "500.00",
  note: "Lunch",
  occurred_at: "2026-09-22T12:00:00Z",
  created_at: "2026-09-22T12:00:00Z",
  updated_at: "2026-09-22T12:00:00Z",
};

const emptyList = { items: [], total: 0, limit: 20, offset: 0 };

function mockByUrl(handlers: Record<string, () => Response>) {
  return vi.fn(async (url: string) => {
    for (const key of Object.keys(handlers)) {
      if (url.includes(key)) return handlers[key]();
    }
    throw new Error(`Unhandled URL: ${url}`);
  });
}

describe("TransactionsPage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupAuth();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads accounts, categories and transactions and shows the list", async () => {
    fetchMock = mockByUrl({
      "/api/v1/accounts": () => jsonResponse([sampleAccount]),
      "/api/v1/categories": () => jsonResponse([foodCategory, salaryCategory]),
      "/api/v1/transactions": () =>
        jsonResponse({
          items: [sampleTx],
          total: 1,
          limit: 20,
          offset: 0,
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<TransactionsPage />);

    await waitFor(() =>
      expect(screen.getByText("Lunch")).toBeInTheDocument(),
    );
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByText(/showing 1 of 1/i)).toBeInTheDocument();
  });

  it("shows empty state when there are no transactions", async () => {
    fetchMock = mockByUrl({
      "/api/v1/accounts": () => jsonResponse([sampleAccount]),
      "/api/v1/categories": () => jsonResponse([foodCategory]),
      "/api/v1/transactions": () => jsonResponse(emptyList),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<TransactionsPage />);

    await waitFor(() =>
      expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument(),
    );
  });

  it("warns to create an account first when there are no accounts", async () => {
    fetchMock = mockByUrl({
      "/api/v1/accounts": () => jsonResponse([]),
      "/api/v1/categories": () => jsonResponse([]),
      "/api/v1/transactions": () => jsonResponse(emptyList),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<TransactionsPage />);

    await waitFor(() =>
      expect(
        screen.getByText(/create an account first/i),
      ).toBeInTheDocument(),
    );
  });

  it("opens the create form and submits a new expense", async () => {
    let postCount = 0;
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST" && url.includes("/transactions")) {
        postCount += 1;
        return jsonResponse({ ...sampleTx, id: 200, note: "Snack" }, 201);
      }
      if (url.includes("/api/v1/accounts")) return jsonResponse([sampleAccount]);
      if (url.includes("/api/v1/categories"))
        return jsonResponse([foodCategory]);
      if (url.includes("/api/v1/transactions")) {
        if (postCount > 0) {
          return jsonResponse({
            items: [{ ...sampleTx, id: 200, note: "Snack" }],
            total: 1,
            limit: 20,
            offset: 0,
          });
        }
        return jsonResponse(emptyList);
      }
      throw new Error(`Unhandled URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<TransactionsPage />);

    await waitFor(() =>
      expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument(),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /\+ add transaction/i }),
    );

    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/amount/i), "250");
    await userEvent.type(screen.getByLabelText(/note/i), "Snack");
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(screen.getByText("Snack")).toBeInTheDocument(),
    );

    const postCall = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit)?.method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body).toMatchObject({
      account_id: 10,
      kind: "expense",
      amount: "250",
      note: "Snack",
    });
  });

  it("deletes a transaction after confirm and reloads", async () => {
    let listCall = 0;
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      if (url.includes("/api/v1/accounts")) return jsonResponse([sampleAccount]);
      if (url.includes("/api/v1/categories"))
        return jsonResponse([foodCategory]);
      if (url.includes("/api/v1/transactions")) {
        listCall += 1;
        if (listCall === 1) {
          return jsonResponse({
            items: [sampleTx],
            total: 1,
            limit: 20,
            offset: 0,
          });
        }
        return jsonResponse(emptyList);
      }
      throw new Error(`Unhandled URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderWithProviders(<TransactionsPage />);

    await waitFor(() =>
      expect(screen.getByText("Lunch")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() =>
      expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument(),
    );
  });

  it("shows error message on load failure", async () => {
    fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/api/v1/accounts")) return jsonResponse([]);
      if (url.includes("/api/v1/categories")) return jsonResponse([]);
      if (url.includes("/api/v1/transactions"))
        return jsonResponse({ detail: "Server unreachable" }, 500);
      throw new Error(`Unhandled URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<TransactionsPage />);

    await waitFor(() =>
      expect(screen.getByText(/server unreachable/i)).toBeInTheDocument(),
    );
  });
});