import { useEffect, useState, type FormEvent } from "react";

import { budgetsApi } from "../api/budgets";
import { ApiError } from "../api/client";
import { categoriesApi } from "../api/categories";
import { useAuth } from "../context/AuthContext";
import type { Budget, Category } from "../types/api";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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

const inputCls =
  "w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500";

const cardCls =
  "bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800";

const btnPrimaryCls =
  "px-4 py-2 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-white disabled:opacity-50 transition-colors";

function BudgetsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "PKR";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [formCategoryId, setFormCategoryId] = useState<number | "">("");
  const [formLimit, setFormLimit] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [budgetsData, cats] = await Promise.all([
        budgetsApi.list(year, month),
        categoriesApi.list("expense"),
      ]);
      setBudgets(budgetsData);
      setExpenseCategories(cats);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const usedCategoryIds = new Set(budgets.map((b) => b.category_id));
  const availableCategories = expenseCategories.filter(
    (c) => !usedCategoryIds.has(c.id),
  );

  function openCreate() {
    setEditing(null);
    setFormCategoryId(availableCategories[0]?.id ?? "");
    setFormLimit("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(b: Budget) {
    setEditing(b);
    setFormCategoryId(b.category_id);
    setFormLimit(b.limit_amount);
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const limitNum = Number(formLimit);
    if (!Number.isFinite(limitNum) || limitNum <= 0) {
      setFormError("Limit must be greater than zero.");
      return;
    }
    if (!editing && formCategoryId === "") {
      setFormError("Please choose a category.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await budgetsApi.update(editing.id, { limit_amount: formLimit });
      } else {
        await budgetsApi.create({
          category_id: formCategoryId as number,
          year,
          month,
          limit_amount: formLimit,
        });
      }
      await load();
      closeForm();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.detail : "Failed to save budget",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(b: Budget) {
    const ok = window.confirm(
      `Delete this budget for ${b.category_name ?? "category"}?`,
    );
    if (!ok) return;
    try {
      await budgetsApi.delete(b.id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.detail : "Failed to delete budget",
      );
    }
  }

  function previousMonth() {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  return (
    <div className="text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Budgets</h1>
        <button
          type="button"
          onClick={openCreate}
          disabled={availableCategories.length === 0}
          className={btnPrimaryCls}
          title={
            availableCategories.length === 0
              ? "All expense categories already have a budget this month"
              : undefined
          }
        >
          + Add budget
        </button>
      </div>

      <div
        className={`${cardCls} flex items-center justify-between px-4 py-3 mb-4`}
      >
        <button
          type="button"
          onClick={previousMonth}
          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2 text-sm"
        >
          ← Previous
        </button>
        <span className="text-sm font-medium">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2 text-sm"
        >
          Next →
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          Loading…
        </div>
      ) : budgets.length === 0 ? (
        <div className={`${cardCls} p-8 text-center`}>
          <p className="text-slate-500 dark:text-slate-400">
            No budgets set for {MONTH_NAMES[month - 1]} {year}.
          </p>
          {availableCategories.length > 0 && (
            <button
              type="button"
              onClick={openCreate}
              className="mt-3 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline"
            >
              Add your first budget
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const pct = Math.min(100, Number(b.percentage));
            const overflow = b.is_exceeded;
            return (
              <div key={b.id} className={`${cardCls} p-4`}>
                <div className="flex justify-between items-start mb-2 gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold truncate">
                      {b.category_name ?? "Category"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatMoney(b.spent, currency)} of{" "}
                      {formatMoney(b.limit_amount, currency)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-base font-bold ${
                        overflow
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {Number(b.percentage).toFixed(1)}%
                    </p>
                    <p
                      className={`text-xs ${
                        overflow
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {overflow
                        ? `Over by ${formatMoney(
                            String(-Number(b.remaining)),
                            currency,
                          )}`
                        : `${formatMoney(b.remaining, currency)} left`}
                    </p>
                  </div>
                </div>

                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
                  <div
                    className={`h-full ${
                      overflow
                        ? "bg-red-500"
                        : "bg-slate-700 dark:bg-slate-400"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-3 flex justify-end gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => openEdit(b)}
                    className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    Edit limit
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(b)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 px-4 py-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg w-full max-w-md p-6 border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? "Edit budget limit" : "Add budget"}
            </h2>

            <form onSubmit={onSubmit} className="space-y-4">
              {!editing && (
                <div>
                  <label
                    htmlFor="budget-category"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="budget-category"
                    required
                    value={formCategoryId}
                    onChange={(e) =>
                      setFormCategoryId(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className={inputCls}
                  >
                    <option value="">— Choose —</option>
                    {availableCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editing && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Category:{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {editing.category_name ?? "—"}
                  </span>
                </p>
              )}

              <div>
                <label
                  htmlFor="budget-limit"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  Monthly limit
                </label>
                <input
                  id="budget-limit"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formLimit}
                  onChange={(e) => setFormLimit(e.target.value)}
                  className={inputCls}
                  placeholder="10000.00"
                />
              </div>

              {formError && (
                <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={btnPrimaryCls}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetsPage;