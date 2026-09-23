import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import RegisterPage from "./RegisterPage";
import { renderWithProviders, screen, userEvent, waitFor } from "../test/utils";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { useAuth } from "../context/AuthContext";

const mockedUseAuth = vi.mocked(useAuth);

function setupAuth(registerImpl: (...args: unknown[]) => Promise<unknown>) {
  mockedUseAuth.mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    register: registerImpl as never,
    logout: vi.fn(),
  });
}

describe("RegisterPage", () => {
  it("blocks weak passwords on the client side", async () => {
    const registerMock = vi.fn();
    setupAuth(registerMock);

    renderWithProviders(<RegisterPage />, {
      routerProps: { initialEntries: ["/register"] },
    });

    await userEvent.type(screen.getByLabelText(/email/i), "a@b.com");
    await userEvent.type(screen.getByLabelText(/password/i), "short");
    await userEvent.click(
      screen.getByRole("button", { name: /create account/i }),
    );

    expect(
      await screen.findByText(/at least 8 characters/i),
    ).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("submits valid data and redirects to /dashboard", async () => {
    const registerMock = vi.fn().mockResolvedValue(undefined);
    setupAuth(registerMock);

    renderWithProviders(
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<div>Dashboard reached</div>} />
      </Routes>,
      { routerProps: { initialEntries: ["/register"] } },
    );

    await userEvent.type(screen.getByLabelText(/full name/i), "Adnan");
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.com");
    await userEvent.type(screen.getByLabelText(/password/i), "strongpass123");
    await userEvent.click(
      screen.getByRole("button", { name: /create account/i }),
    );

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith({
        email: "a@b.com",
        password: "strongpass123",
        full_name: "Adnan",
        currency: "PKR",
      });
    });
    await waitFor(() => {
      expect(screen.getByText("Dashboard reached")).toBeInTheDocument();
    });
  });
});