import { useEffect, useState, type FormEvent } from "react";

import { accountsApi } from "../api/accounts";
import { ApiError } from "../api/client";
import { categoriesApi } from "../api/categories";
import { exportsApi } from "../api/exports";
import {
  transactionsApi,
  type TransactionFilters,
} from "../api/transactions";
import ExportButton from "../components/ExportButton";
import { useAuth } from "../context/AuthContext";
import type {
  Account,
  Category,
  Transaction,
  TransactionCreate,
} from "../types/api";

const PAGE_SIZE = 20;

function formatMoney(value: string, currency: string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(num);
}

function toLocalDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const inputCls =
  "w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500";

const cardCls =
  "bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800";

const btnPrimaryCls =
  "px-4 py-2 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-white disabled:opacity-50 transition-colors";

const btnGhostCls =
  "px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white";

function TransactionsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "PKR";

  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [accountId, setAccountId] = useState<number | "">("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [kind, setKind] = useState<"" | "income" | "expense">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [offset, setOffset] = useState(0);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formAccountId, setFormAccountId] = useState<number | "">("");
  const [formCategoryId, setFormCategoryId] = useState<number | "">("");
  const [formKind, setFormKind] = useState<"income" | "expense">("expense");
  const [formAmount, setFormAmount] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formDate, setFormDate] = useState(toLocalDateInput(new Date()));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [accs, cats] = await Promise.all([
          accountsApi.list(),
          categoriesApi.list(),
        ]);
        setAccounts(accs);
        setCategories(cats);
      } catch {
        // ignore
      }
    })();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const filters: TransactionFilters = { limit: PAGE_SIZE, offset };
      if (accountId !== "") filters.account_id = accountId;
      if (categoryId !== "") filters.category_id = categoryId;
      if (kind) filters.kind = kind;
      if (fromDate) filters.from_date = new Date(fromDate).toISOString();
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filters.to_date = end.toISOString();
      }
      const data = await transactionsApi.list(filters);
      setItems(data.items);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.detail : "Failed to load transactions",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, categoryId, kind, fromDate, toDate, offset]);

  function resetFilters() {
    setAccountId("");
    setCategoryId("");
    setKind("");
    setFromDate("");
    setToDate("");
    setOffset(0);
  }

  function openCreate() {
    setEditing(null);
    setFormAccountId(accounts[0]?.id ?? "");
    setFormCategoryId("");
    setFormKind("expense");
    setFormAmount("");
    setFormNote("");
    setFormDate(toLocalDateInput(new Date()));
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setFormAccountId(t.account_id);
    setFormCategoryId(t.category_id ?? "");
    setFormKind(t.kind);
    setFormAmount(t.amount);
    setFormNote(t.note ?? "");
    setFormDate(toLocalDateInput(new Date(t.occurred_at)));
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
    if (formAccountId === "") {
      setFormError("Please choose an account.");
      return;
    }
    const amountNum = Number(formAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }
    setSaving(true);
    try {
      const isoDate = new Date(`${formDate}T12:00:00`).toISOString();
      const payload: TransactionCreate = {
        account_id: formAccountId,
        category_id: formCategoryId === "" ? null : formCategoryId,
        kind: formKind,
        amount: formAmount,
        note: formNote.trim() || null,
        occurred_at: isoDate,
      };
      if (editing) {
        await transactionsApi.update(editing.id, payload);
      } else {
        await transactionsApi.create(payload);
      }
      await load();
      closeForm();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.detail : "Failed to save transaction",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(t: Transaction) {
    const ok = window.confirm(
      `Delete this ${t.kind} of ${formatMoney(t.amount, currency)}? The account balance will be updated.`,
    );
    if (!ok) return;
    try {
      await transactionsApi.delete(t.id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.detail : "Failed to delete transaction",
      );
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const formCategoryOptions = categories.filter((c) => c.kind === formKind);

  return (
    <div className="text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex items-center gap-2">
          <ExportButton onClick={() => exportsApi.transactions()} />
          <button
            type="button"
            onClick={openCreate}
            disabled={accounts.length === 0}
            className={btnPrimaryCls}
            title={accounts.length === 0 ? "Create an account first" : undefined}
          >
            + Add transaction
          </button>
        </div>
      </div>

      {accounts.length === 0 && (
        <div className="mb-4 text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
          Create an account first — transactions need to belong to one.
        </div>
      )}

      {/* Filters */}
      <div className={`${cardCls} p-4 mb-4`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            aria-label="Filter by account"
            value={accountId}
            onChange={(e) => {
              setOffset(0);
              setAccountId(e.target.value === "" ? "" : Number(e.target.value));
            }}
            className={inputCls}
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by category"
            value={categoryId}
            onChange={(e) => {
              setOffset(0);
              setCategoryId(e.target.value === "" ? "" : Number(e.target.value));
            }}
            className={inputCls}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.kind})
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by kind"
            value={kind}
            onChange={(e) => {
              setOffset(0);
              setKind(e.target.value as "" | "income" | "expense");
            }}
            className={inputCls}
          >
            <option value="">All kinds</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <input
            type="date"
            aria-label="From date"
            value={fromDate}
            onChange={(e) => {
              setOffset(0);
              setFromDate(e.target.value);
            }}
            className={inputCls}
          />

          <input
            type="date"
            aria-label="To date"
            value={toDate}
            onChange={(e) => {
              setOffset(0);
              setToDate(e.target.value);
            }}
            className={inputCls}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={resetFilters}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Reset filters
          </button>
        </div>
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
      ) : items.length === 0 ? (
        <div className={`${cardCls} p-8 text-center`}>
          <p className="text-slate-500 dark:text-slate-400">
            No transactions found.
          </p>
        </div>
      ) : (
        <div className={`${cardCls} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Note
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Amount
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((t) => {
                  const cat = categories.find((c) => c.id === t.category_id);
                  const acc = accounts.find((a) => a.id === t.account_id);
                  const sign = t.kind === "income" ? "+" : "−";
                  const tone =
                    t.kind === "income"
                      ? "text-green-700 dark:text-green-400"
                      : "text-red-600 dark:text-red-400";
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {new Date(t.occurred_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="truncate max-w-[20rem]">
                          {t.note ||
                            (t.kind === "income" ? "Income" : "Expense")}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 md:hidden">
                          {acc?.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 hidden md:table-cell">
                        {cat?.name ?? "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm text-right font-medium ${tone}`}
                      >
                        {sign} {formatMoney(t.amount, currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right space-x-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDelete(t)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap gap-2 justify-between items-center px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              Showing {items.length} of {total} · Page {currentPage} /{" "}
              {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="px-3 py-1 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-200"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="px-3 py-1 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-200"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 px-4 py-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg w-full max-w-md p-6 border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? "Edit transaction" : "Add transaction"}
            </h2>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="tx-kind"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                  >
                    Kind
                  </label>
                  <select
                    id="tx-kind"
                    value={formKind}
                    onChange={(e) => {
                      setFormKind(e.target.value as "income" | "expense");
                      setFormCategoryId("");
                    }}
                    className={inputCls}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="tx-amount"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                  >
                    Amount
                  </label>
                  <input
                    id="tx-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className={inputCls}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="tx-account"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  Account
                </label>
                <select
                  id="tx-account"
                  required
                  value={formAccountId}
                  onChange={(e) =>
                    setFormAccountId(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className={inputCls}
                >
                  <option value="">— Choose —</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="tx-category"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  Category{" "}
                  <span className="text-slate-400 dark:text-slate-500">
                    (optional)
                  </span>
                </label>
                <select
                  id="tx-category"
                  value={formCategoryId}
                  onChange={(e) =>
                    setFormCategoryId(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className={inputCls}
                >
                  <option value="">— None —</option>
                  {formCategoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="tx-date"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  Date
                </label>
                <input
                  id="tx-date"
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label
                  htmlFor="tx-note"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  Note{" "}
                  <span className="text-slate-400 dark:text-slate-500">
                    (optional)
                  </span>
                </label>
                <input
                  id="tx-note"
                  type="text"
                  maxLength={500}
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className={inputCls}
                  placeholder="Lunch with team"
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
                  className={btnGhostCls}
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

export default TransactionsPage;