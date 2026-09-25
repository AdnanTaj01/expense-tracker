import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { dashboardApi } from "../api/dashboard";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { DashboardOverview } from "../types/api";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatMoney(value: string, currency: string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(num);
}

const cardCls =
  "bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800";

function DashboardPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "PKR";

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dashboardApi
      .overview()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.detail);
        else setError("Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400">
        Loading…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md px-4 py-3">
        {error ?? "Could not load dashboard"}
      </div>
    );
  }

  const { summary, top_categories, trend, recent_transactions } = data;
  const greeting = user?.full_name ? `, ${user.full_name}` : "";

  const trendMax = Math.max(
    1,
    ...trend.map((t) => Math.max(Number(t.income), Number(t.expense))),
  );

  return (
    <div className="text-slate-900 dark:text-slate-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Welcome{greeting}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {MONTH_NAMES[summary.month - 1]} {summary.year} overview
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card
          label="Total Balance"
          value={formatMoney(summary.total_balance, currency)}
          tone="default"
        />
        <Card
          label="Month Income"
          value={formatMoney(summary.month_income, currency)}
          tone="income"
        />
        <Card
          label="Month Expense"
          value={formatMoney(summary.month_expense, currency)}
          tone="expense"
        />
        <Card
          label="Net this month"
          value={formatMoney(summary.net, currency)}
          tone={Number(summary.net) >= 0 ? "income" : "expense"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top categories */}
        <section className={`${cardCls} p-5 sm:p-6`}>
          <h2 className="text-lg font-semibold mb-4">
            Top expense categories
          </h2>
          {top_categories.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No expenses this month yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {top_categories.map((c) => (
                <li key={`${c.category_id ?? "none"}-${c.category_name}`}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {c.category_name}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatMoney(c.total, currency)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-slate-700 dark:bg-slate-400"
                      style={{
                        width: `${Math.min(100, Number(c.percentage))}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent transactions */}
        <section className={`${cardCls} p-5 sm:p-6`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent transactions</h2>
            <Link
              to="/transactions"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              View all →
            </Link>
          </div>
          {recent_transactions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No transactions yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recent_transactions.map((t) => {
                const sign = t.kind === "income" ? "+" : "−";
                const tone =
                  t.kind === "income"
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-600 dark:text-red-400";
                return (
                  <li
                    key={t.id}
                    className="py-2 flex justify-between items-center text-sm gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate">
                        {t.note || (t.kind === "income" ? "Income" : "Expense")}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(t.occurred_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`font-medium whitespace-nowrap ${tone}`}>
                      {sign} {formatMoney(t.amount, currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Trend bars */}
      <section className={`${cardCls} p-5 sm:p-6`}>
        <h2 className="text-lg font-semibold mb-4">Last 6 months</h2>
        <div className="flex items-end justify-between gap-2 h-48">
          {trend.map((t) => {
            const incomeH = (Number(t.income) / trendMax) * 100;
            const expenseH = (Number(t.expense) / trendMax) * 100;
            return (
              <div
                key={`${t.year}-${t.month}`}
                className="flex-1 flex flex-col items-center"
              >
                <div className="flex items-end gap-1 h-40 w-full justify-center">
                  <div
                    className="w-3 bg-green-500 rounded-t"
                    style={{ height: `${incomeH}%` }}
                    title={`Income: ${formatMoney(t.income, currency)}`}
                  />
                  <div
                    className="w-3 bg-red-500 rounded-t"
                    style={{ height: `${expenseH}%` }}
                    title={`Expense: ${formatMoney(t.expense, currency)}`}
                  />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {MONTH_NAMES[t.month - 1]}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded-sm" /> Income
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-500 rounded-sm" /> Expense
          </span>
        </div>
      </section>
    </div>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "income" | "expense";
}) {
  const toneClass =
    tone === "income"
      ? "text-green-700 dark:text-green-400"
      : tone === "expense"
        ? "text-red-600 dark:text-red-400"
        : "text-slate-800 dark:text-slate-100";
  return (
    <div className={`${cardCls} p-5`}>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${toneClass}`}>{value}</p>
    </div>
  );
}

export default DashboardPage;