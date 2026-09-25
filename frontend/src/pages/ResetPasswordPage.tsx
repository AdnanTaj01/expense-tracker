import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { ApiError } from "../api/client";
import PasswordInput from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";

function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing reset token in URL.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      navigate("/login", {
        replace: true,
        state: { passwordReset: true },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-8 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 sm:p-8 border border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Set a new password
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Choose a strong password you don't use elsewhere.
        </p>

        {!token && (
          <div className="mb-4 text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
            This link is missing a reset token. Please request a new
            password reset email.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reset-new"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
            >
              New password
            </label>
            <PasswordInput
              id="reset-new"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label
              htmlFor="reset-confirm"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
            >
              Confirm new password
            </label>
            <PasswordInput
              id="reset-confirm"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !token}
            className="w-full py-2 px-4 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Saving…" : "Save new password"}
          </button>

          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            <Link
              to="/login"
              className="text-slate-800 dark:text-slate-100 font-medium hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;