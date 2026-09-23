import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import LoginPage from "./LoginPage";
import { renderWithProviders, screen, userEvent, waitFor } from "../test/utils";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { useAuth } from "../context/AuthContext";

const mockedUseAuth = vi.mocked(useAuth);

function setupAuth(loginImpl: (...args: unknown[]) => Promise<unknown>) {
  mockedUseAuth.mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: loginImpl as never,
    register: vi.fn(),
    logout: vi.fn(),
  });
}

describe("LoginPage", () => {
  it("renders email and password fields and a submit button", () => {
    setupAuth(vi.fn());
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("calls login with entered credentials and redirects to /dashboard", async () => {
    const loginMock = vi.fn().mockResolvedValue(undefined);
    setupAuth(loginMock);

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>Dashboard reached</div>} />
      </Routes>,
      { routerProps: { initialEntries: ["/login"] } },
    );

    await userEvent.type(screen.getByLabelText(/email/i), "a@b.com");
    await userEvent.type(screen.getByLabelText(/password/i), "passw0rd");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith("a@b.com", "passw0rd");
    });
    await waitFor(() => {
      expect(screen.getByText("Dashboard reached")).toBeInTheDocument();
    });
  });

  it("shows backend error detail on failure", async () => {
    const { ApiError } = await import("../api/client");
    const apiErr = new ApiError(401, "Incorrect email or password");

    const loginMock = vi.fn().mockRejectedValue(apiErr);
    setupAuth(loginMock);

    renderWithProviders(<LoginPage />, {
      routerProps: { initialEntries: ["/login"] },
    });

    await userEvent.type(screen.getByLabelText(/email/i), "a@b.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/incorrect email or password/i),
      ).toBeInTheDocument();
    });
  });
});