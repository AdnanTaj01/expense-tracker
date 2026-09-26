import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { ApiError } from "../api/client";
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";

function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
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
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 sm:p-8 border border-slate-200 dark:border-slate-800 animate-fade-in">
        <div className="flex flex-col items-center mb-6">
          <Logo size={56} />
          <h1 className="mt-4 text-2xl font-bold text-slate-800 dark:text-slate-100">
            Forgot password
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 text-center">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="text-sm text-green-800 dark:text-green-200 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md px-3 py-2">
              If that email is registered, a reset link has been created.
              In development, check the backend console for the link.
            </div>
            <Link
              to="/login"
              className="block w-full text-center py-2 px-4 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-white transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="forgot-email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
              >
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="you@example.com"
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
              {submitting ? "Sending…" : "Send reset link"}
            </button>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">
              <Link
                to="/login"
                className="text-slate-800 dark:text-slate-100 font-medium hover:underline"
              >
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;