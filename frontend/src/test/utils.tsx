import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import type { ReactElement, ReactNode } from "react";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

interface Options extends Omit<RenderOptions, "wrapper"> {
  routerProps?: MemoryRouterProps;
}

export function renderWithProviders(
  ui: ReactElement,
  { routerProps, ...renderOptions }: Options = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter {...routerProps}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";