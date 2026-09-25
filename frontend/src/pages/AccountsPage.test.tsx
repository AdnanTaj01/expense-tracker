import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AccountsPage from "./AccountsPage";
import { renderWithProviders, screen, userEvent, waitFor } from "../test/utils";

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

const sampleAccount = {
  id: 1,
  user_id: 1,
  name: "Meezan Bank",
  type: "checking" as const,
  balance: "5000.00",
  currency: "PKR",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("AccountsPage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupAuth();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows loading then empty state", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    renderWithProviders(<AccountsPage />);

    await waitFor(() =>
      expect(screen.getByText(/no accounts yet/i)).toBeInTheDocument(),
    );
  });

  it("renders accounts with formatted balance", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([sampleAccount]));
    renderWithProviders(<AccountsPage />);

    await waitFor(() =>
      expect(screen.getByText("Meezan Bank")).toBeInTheDocument(),
    );
    expect(screen.getByText(/5,000/)).toBeInTheDocument();
    expect(screen.getByText(/checking/i)).toBeInTheDocument();
  });

  it("opens the create form when Add account clicked", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    renderWithProviders(<AccountsPage />);

    await waitFor(() =>
      expect(screen.getByText(/no accounts yet/i)).toBeInTheDocument(),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /\+ add account/i }),
    );

    expect(
      screen.getByRole("heading", { name: /add account/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/opening balance/i)).toBeInTheDocument();
  });

  it("creates an account and reloads the list", async () => {
    // 1st call: list empty. 2nd call (after create): list has new account.
    fetchMock
      .mockResolvedValueOnce(jsonResponse([])) // initial list
      .mockResolvedValueOnce(jsonResponse(sampleAccount, 201)) // create
      .mockResolvedValueOnce(jsonResponse([sampleAccount])); // reload list

    renderWithProviders(<AccountsPage />);

    await waitFor(() =>
      expect(screen.getByText(/no accounts yet/i)).toBeInTheDocument(),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /\+ add account/i }),
    );

    await userEvent.type(screen.getByLabelText(/name/i), "Meezan Bank");
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(screen.getByText("Meezan Bank")).toBeInTheDocument(),
    );

    // Verify the POST body
    const createCall = fetchMock.mock.calls.find(
      (call) => (call[1] as RequestInit)?.method === "POST",
    );
    expect(createCall).toBeDefined();
    const body = JSON.parse((createCall![1] as RequestInit).body as string);
    expect(body).toMatchObject({
      name: "Meezan Bank",
      type: "checking",
      balance: "0",
    });
  });

  it("deletes an account after confirm", async () => {
    // list, delete, reload
    fetchMock
      .mockResolvedValueOnce(jsonResponse([sampleAccount]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse([]));

    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderWithProviders(<AccountsPage />);

    await waitFor(() =>
      expect(screen.getByText("Meezan Bank")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() =>
      expect(screen.getByText(/no accounts yet/i)).toBeInTheDocument(),
    );
  });

  it("shows error when the list request fails", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: "Server is down" }, 500),
    );
    renderWithProviders(<AccountsPage />);

    await waitFor(() =>
      expect(screen.getByText(/server is down/i)).toBeInTheDocument(),
    );
  });
});