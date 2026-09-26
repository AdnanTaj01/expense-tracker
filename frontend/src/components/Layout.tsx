import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Logo from "./Logo";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: "/transactions",
    label: "Transactions",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    to: "/accounts",
    label: "Accounts",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    to: "/categories",
    label: "Categories",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a2 2 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    to: "/budgets",
    label: "Budgets",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    ),
  },
  {
    to: "/analytics",
    label: "Analytics",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: "/receipts",
    label: "Receipts",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
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
    `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
      isActive
        ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white shadow-sm"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
    }`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="md:hidden p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  {mobileOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 group"
              >
                <Logo
                  size={36}
                  className="transition-transform group-hover:scale-105"
                />
                               <span className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                  Expense<span className="text-green-600 dark:text-green-400">Tracker</span>
                </span>
              </button>
            </div>

            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={linkClass}>
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}

              <button
                type="button"
                onClick={toggleTheme}
                className="ml-2 p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle theme"
                title={theme === "dark" ? "Switch to light" : "Switch to dark"}
              >
                {theme === "dark" ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 3.22a1 1 0 011.42 1.42l-.71.7a1 1 0 11-1.41-1.41l.7-.71zM17 9a1 1 0 110 2h-1a1 1 0 110-2h1zM5.49 5.49A1 1 0 016.9 6.9l-.7.71a1 1 0 11-1.42-1.42l.71-.7zM3 9a1 1 0 110 2H2a1 1 0 110-2h1zm2.49 8.66a1 1 0 01-1.42-1.42l.71-.7a1 1 0 011.41 1.41l-.7.71zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm5.51.66l-.7-.71a1 1 0 011.41-1.41l.71.7a1 1 0 01-1.42 1.42zM10 6a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              <div className="relative ml-2" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center space-x-2 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <span className="w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-sm font-medium flex items-center justify-center">
                    {initial}
                  </span>
                  <span className="hidden lg:inline text-sm text-slate-700 dark:text-slate-200 max-w-48 truncate">
                    {displayName}
                  </span>
                  <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" viewBox="0 0 20 20" fill="currentColor">
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
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg py-1 z-20 animate-scale-in origin-top-right"
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
                      className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="md:hidden">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 3.22a1 1 0 011.42 1.42l-.71.7a1 1 0 11-1.41-1.41l.7-.71zM17 9a1 1 0 110 2h-1a1 1 0 110-2h1zM5.49 5.49A1 1 0 016.9 6.9l-.7.71a1 1 0 11-1.42-1.42l.71-.7zM3 9a1 1 0 110 2H2a1 1 0 110-2h1zm2.49 8.66a1 1 0 01-1.42-1.42l.71-.7a1 1 0 011.41 1.41l-.7.71zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm5.51.66l-.7-.71a1 1 0 011.41-1.41l.71.7a1 1 0 01-1.42 1.42zM10 6a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-fade-in-fast">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
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
                    className="w-full text-left px-3 py-2 rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
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
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;