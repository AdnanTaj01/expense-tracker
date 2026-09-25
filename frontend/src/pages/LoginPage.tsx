import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import PasswordInput from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";

interface LocationState {
  from?: { pathname: string };
  passwordChanged?: boolean;
  passwordReset?: boolean;
}

function LoginPage() {
  const { login, sessionExpired, clearSessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const passwordReset = state?.passwordReset === true;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      clearSessionExpired();
    };
  }, [clearSessionExpired]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const redirectTo = state?.from?.pathname ?? "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-8 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 sm:p-8 border border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Sign in
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Enter your credentials to access your dashboard.
        </p>

        {passwordReset && (
          <div className="mb-4 text-sm text-green-800 dark:text-green-200 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md px-3 py-2">
            Password reset. Please sign in with your new password.
          </div>
        )}

        {sessionExpired && (
          <div className="mb-4 text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
            Your session expired. Please sign in again.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 px-4 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400 text-center">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-slate-800 dark:text-slate-100 font-medium hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;