import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import Logo from "../components/Logo";
import PasswordInput from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";

const inputCls =
  "w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500";

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setSubmitting(true);
    try {
      await register({
        email,
        password,
        full_name: fullName || null,
        currency,
      });
      navigate("/dashboard", { replace: true });
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
          <Logo size={64} />
          <h1 className="mt-4 text-2xl font-bold text-slate-800 dark:text-slate-100">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 text-center">
            Start tracking your finances in one place
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="register-fullname"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
            >
              Full name{" "}
              <span className="text-slate-400 dark:text-slate-500">
                (optional)
              </span>
            </label>
            <input
              id="register-fullname"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputCls}
              placeholder="Adnan Taj"
            />
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
            >
              Email
            </label>
            <input
              id="register-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
            >
              Password
            </label>
            <PasswordInput
              id="register-password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label
              htmlFor="register-currency"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
            >
              Currency
            </label>
            <select
              id="register-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputCls}
            >
              <option value="PKR">PKR — Pakistani Rupee</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="INR">INR — Indian Rupee</option>
              <option value="AED">AED — UAE Dirham</option>
            </select>
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
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400 text-center">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-slate-800 dark:text-slate-100 font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;