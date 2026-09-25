import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/transactions", label: "Transactions" },
  { to: "/accounts", label: "Accounts" },
  { to: "/categories", label: "Categories" },
  { to: "/budgets", label: "Budgets" },
];

function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [menuOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [window.location.pathname]);

  function handleLogout() {
    setMenuOpen(false);
    setMobileOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  const displayName = user?.full_name || user?.email || "";
  const initial = (displayName[0] || "?").toUpperCase();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
    }`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="md:hidden p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  {mobileOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>

              <span className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                Expense Tracker
              </span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={linkClass}>
                  {item.label}
                </NavLink>
              ))}

              {/* Theme toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="ml-2 p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle theme"
                title={theme === "dark" ? "Switch to light" : "Switch to dark"}
              >
                {theme === "dark" ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 3.22a1 1 0 011.42 1.42l-.71.7a1 1 0 11-1.41-1.41l.7-.71zM17 9a1 1 0 110 2h-1a1 1 0 110-2h1zM5.49 5.49A1 1 0 016.9 6.9l-.7.71a1 1 0 11-1.42-1.42l.71-.7zM3 9a1 1 0 110 2H2a1 1 0 110-2h1zm2.49 8.66a1 1 0 01-1.42-1.42l.71-.7a1 1 0 011.41 1.41l-.7.71zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm5.51.66l-.7-.71a1 1 0 011.41-1.41l.71.7a1 1 0 01-1.42 1.42zM10 6a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              {/* Profile dropdown */}
              <div className="relative ml-2" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center space-x-2 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <span className="w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-sm font-medium flex items-center justify-center">
                    {initial}
                  </span>
                  <span className="hidden lg:inline text-sm text-slate-700 dark:text-slate-200 max-w-48 truncate">
                    {displayName}
                  </span>
                  <svg
                    className="w-4 h-4 text-slate-500 dark:text-slate-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg py-1 z-20"
                  >
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user?.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile theme toggle */}
            <div className="md:hidden">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 3.22a1 1 0 011.42 1.42l-.71.7a1 1 0 11-1.41-1.41l.7-.71zM17 9a1 1 0 110 2h-1a1 1 0 110-2h1zM5.49 5.49A1 1 0 016.9 6.9l-.7.71a1 1 0 11-1.42-1.42l.71-.7zM3 9a1 1 0 110 2H2a1 1 0 110-2h1zm2.49 8.66a1 1 0 01-1.42-1.42l.71-.7a1 1 0 011.41 1.41l-.7.71zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm5.51.66l-.7-.71a1 1 0 011.41-1.41l.71.7a1 1 0 01-1.42 1.42zM10 6a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md text-sm font-medium ${
                      isActive
                        ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <p className="px-3 text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                  {displayName}
                </p>
                <p className="px-3 text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
                <div className="mt-2 space-y-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;