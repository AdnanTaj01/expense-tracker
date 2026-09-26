import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "welcome_dismissed_v1";

function WelcomeCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== "true") {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mb-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-linear-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-5 sm:p-6 shadow-sm animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-full bg-slate-800 dark:bg-slate-200 items-center justify-center">
          <svg
            className="w-6 h-6 text-white dark:text-slate-900"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Welcome to Expense Tracker! 👋
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            New here? Start with these 3 simple steps:
          </p>

          <ol className="mt-4 space-y-2 text-sm">
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <span className="text-slate-700 dark:text-slate-300">
                <Link
                  to="/accounts"
                  className="font-medium text-slate-900 dark:text-white hover:underline"
                >
                  Create an account
                </Link>{" "}
                — a place where you keep your money. For example: a bank
                account, a cash wallet, or a credit card.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <span className="text-slate-700 dark:text-slate-300">
                <Link
                  to="/transactions"
                  className="font-medium text-slate-900 dark:text-white hover:underline"
                >
                  Add transactions
                </Link>{" "}
                — every income you receive (like a salary) and every expense
                you make (like lunch). This is what makes the app useful.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center">
                3
              </span>
              <span className="text-slate-700 dark:text-slate-300">
                <Link
                  to="/budgets"
                  className="font-medium text-slate-900 dark:text-white hover:underline"
                >
                  Set budgets
                </Link>{" "}
                — a monthly spending limit per category (for example: "Food:
                15,000 this month"). The app warns you when you're close to
                the limit.
              </span>
            </li>
          </ol>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Explore more:{" "}
            <Link
              to="/analytics"
              className="underline hover:text-slate-700 dark:hover:text-slate-200"
            >
              Analytics
            </Link>{" "}
            (charts and trends),{" "}
            <Link
              to="/receipts"
              className="underline hover:text-slate-700 dark:hover:text-slate-200"
            >
              Receipts
            </Link>{" "}
            (upload photos of your bills), and{" "}
            <Link
              to="/categories"
              className="underline hover:text-slate-700 dark:hover:text-slate-200"
            >
              Categories
            </Link>{" "}
            (organize your spending your own way).
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              to="/accounts"
              className="px-4 py-2 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md text-sm font-medium hover:bg-slate-700 dark:hover:bg-white transition-colors"
            >
              Get started → Create an account
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline"
            >
              Got it, don't show this again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeCard;