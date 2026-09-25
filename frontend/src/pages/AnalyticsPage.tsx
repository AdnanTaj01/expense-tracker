import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { analyticsApi } from "../api/analytics";
import { ApiError } from "../api/client";
import { categoriesApi } from "../api/categories";
import { useAuth } from "../context/AuthContext";
import type {
  AccountSpend,
  Category,
  CategoryTrend,
  MonthComparison,
  WeekdayHeatmapItem,
} from "../types/api";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const PIE_COLORS = [
  "#0f172a", "#334155", "#64748b", "#94a3b8",
  "#cbd5e1", "#059669", "#d97706", "#dc2626",
  "#7c3aed", "#0891b2",
];

function formatMoney(value: string | number, currency: string): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return String(value);
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(num);
}

const cardCls =
  "bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800";

function AnalyticsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "PKR";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [comparison, setComparison] = useState<MonthComparison | null>(null);
  const [accounts, setAccounts] = useState<AccountSpend[]>([]);
  const [weekdays, setWeekdays] = useState<WeekdayHeatmapItem[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");
  const [trend, setTrend] = useState<CategoryTrend | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);

  // Load main analytics
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      analyticsApi.monthComparison(),
      analyticsApi.topAccounts(3),
      analyticsApi.weekdayHeatmap(3),
      categoriesApi.list("expense"),
    ])
      .then(([cmp, accts, wds, cats]) => {
        if (cancelled) return;
        setComparison(cmp);
        setAccounts(accts);
        setWeekdays(wds);
        setCategories(cats);
        if (cats.length > 0) {
          setSelectedCategoryId(cats[0].id);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.detail : "Failed to load analytics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load category trend when selection changes
  useEffect(() => {
    if (selectedCategoryId === "") {
      setTrend(null);
      return;
    }
    let cancelled = false;
    setTrendLoading(true);
    analyticsApi
      .categoryTrend(selectedCategoryId, 6)
      .then((t) => {
        if (!cancelled) setTrend(t);
      })
      .catch(() => {
        if (!cancelled) setTrend(null);
      })
      .finally(() => {
        if (!cancelled) setTrendLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId]);

  if (loading) {
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400">
        Loading analytics…
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md px-4 py-3">
        {error ?? "Could not load analytics"}
      </div>
    );
  }

  // Pie data — top accounts by expense
  const pieData = accounts
    .filter((a) => Number(a.total_expense) > 0)
    .map((a) => ({ name: a.account_name, value: Number(a.total_expense) }));

  // Line chart — category trend
  const trendData =
    trend?.points.map((p) => ({
      label: `${MONTH_NAMES[p.month - 1]} ${String(p.year).slice(2)}`,
      total: Number(p.total),
    })) ?? [];

  // Bar chart — weekday
  const weekdayData = weekdays.map((w) => ({
    name: w.weekday_name.slice(0, 3),
    Expense: Number(w.total_expense),
    Income: Number(w.total_income),
  }));

  // Comparison helpers
  const prevMonthLabel = `${MONTH_NAMES[comparison.previous_month - 1]} ${comparison.previous_year}`;
  const curMonthLabel = `${MONTH_NAMES[comparison.current_month - 1]} ${comparison.current_year}`;

  return (
    <div className="text-slate-900 dark:text-slate-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Insights into your spending patterns.
        </p>
      </div>

      {/* Row 1: Month comparison */}
      <section className={`${cardCls} p-5 sm:p-6 mb-6`}>
        <h2 className="text-lg font-semibold mb-4">
          {curMonthLabel} vs {prevMonthLabel}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ComparisonCard
            label="Income"
            current={comparison.current_income}
            previous={comparison.previous_income}
            changePct={comparison.income_change_pct}
            currency={currency}
            tone="income"
          />
          <ComparisonCard
            label="Expense"
            current={comparison.current_expense}
            previous={comparison.previous_expense}
            changePct={comparison.expense_change_pct}
            currency={currency}
            tone="expense"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pie — top accounts */}
        <section className={`${cardCls} p-5 sm:p-6`}>
          <h2 className="text-lg font-semibold mb-4">
            Top accounts by expense
          </h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No expenses in the last 3 months.
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry) =>
                      `${entry.name}: ${formatMoney(entry.value, currency)}`
                    }
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatMoney(v, currency)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Bar — weekday */}
        <section className={`${cardCls} p-5 sm:p-6`}>
          <h2 className="text-lg font-semibold mb-4">
            Spending by weekday (last 3 months)
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-200 dark:stroke-slate-700"
                />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis
                  tickFormatter={(v) => formatMoney(v, currency)}
                  width={90}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(v: number) => formatMoney(v, currency)}
                />
                <Legend />
                <Bar dataKey="Expense" fill="#dc2626" />
                <Bar dataKey="Income" fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Line — category trend */}
      <section className={`${cardCls} p-5 sm:p-6`}>
        <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">Category trend (6 months)</h2>
          <select
            value={selectedCategoryId}
            onChange={(e) =>
              setSelectedCategoryId(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
          >
            {categories.length === 0 && (
              <option value="">No expense categories</option>
            )}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {trendLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading trend…
          </p>
        ) : trendData.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pick a category with expenses to see its trend.
          </p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-200 dark:stroke-slate-700"
                />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis
                  tickFormatter={(v) => formatMoney(v, currency)}
                  width={90}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(v: number) => formatMoney(v, currency)}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#0f172a"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

function ComparisonCard({
  label,
  current,
  previous,
  changePct,
  currency,
  tone,
}: {
  label: string;
  current: string;
  previous: string;
  changePct: string | null;
  currency: string;
  tone: "income" | "expense";
}) {
  const valueClass =
    tone === "income"
      ? "text-green-700 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

  let changeText = "—";
  let changeClass = "text-slate-500 dark:text-slate-400";
  if (changePct !== null) {
    const num = Number(changePct);
    changeText = `${num >= 0 ? "+" : ""}${num.toFixed(1)}%`;
    changeClass =
      num > 0
        ? tone === "income"
          ? "text-green-700 dark:text-green-400"
          : "text-red-600 dark:text-red-400"
        : num < 0
          ? tone === "income"
            ? "text-red-600 dark:text-red-400"
            : "text-green-700 dark:text-green-400"
          : "text-slate-500 dark:text-slate-400";
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md p-4 border border-slate-200 dark:border-slate-700">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClass}`}>
        {formatMoney(current, currency)}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Previous: {formatMoney(previous, currency)}
      </p>
      <p className={`text-sm font-medium mt-2 ${changeClass}`}>
        {changeText}
      </p>
    </div>
  );
}

export default AnalyticsPage;