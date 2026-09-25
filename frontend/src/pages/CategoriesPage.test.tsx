import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CategoriesPage from "./CategoriesPage";
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
    changePassword: vi.fn(),
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const foodCategory = {
  id: 1,
  user_id: 1,
  name: "Food",
  kind: "expense" as const,
  is_default: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const salaryCategory = {
  id: 2,
  user_id: 1,
  name: "Salary",
  kind: "income" as const,
  is_default: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("CategoriesPage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupAuth();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("splits categories into income and expense sections", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([foodCategory, salaryCategory]),
    );
    renderWithProviders(<CategoriesPage />);

    await waitFor(() =>
      expect(screen.getByText("Food")).toBeInTheDocument(),
    );
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText(/income \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/expense \(1\)/i)).toBeInTheDocument();
  });

  it("shows empty state when no categories", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    renderWithProviders(<CategoriesPage />);

    await waitFor(() =>
      expect(screen.getByText(/no categories\./i)).toBeInTheDocument(),
    );
  });

  it("opens the create form and submits a new category", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([])) // initial
      .mockResolvedValueOnce(
        jsonResponse(
          {
            id: 3,
            user_id: 1,
            name: "Groceries",
            kind: "expense",
            is_default: false,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
          201,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 3,
            user_id: 1,
            name: "Groceries",
            kind: "expense",
            is_default: false,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ]),
      );

    renderWithProviders(<CategoriesPage />);

    await waitFor(() =>
      expect(screen.getByText(/no categories\./i)).toBeInTheDocument(),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /\+ add category/i }),
    );

    await userEvent.type(screen.getByLabelText(/name/i), "Groceries");
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(screen.getByText("Groceries")).toBeInTheDocument(),
    );

    const postCall = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit)?.method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body).toMatchObject({ name: "Groceries", kind: "expense" });
  });

  it("deletes a category after confirm", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([foodCategory]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse([]));

    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderWithProviders(<CategoriesPage />);

    await waitFor(() =>
      expect(screen.getByText("Food")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() =>
      expect(screen.getByText(/no categories\./i)).toBeInTheDocument(),
    );
  });

  it("shows backend error on load failure", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: "Not authorized" }, 401),
    );
    renderWithProviders(<CategoriesPage />);

    await waitFor(() =>
      expect(screen.getByText(/not authorized/i)).toBeInTheDocument(),
    );
  });
});