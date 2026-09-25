import { useEffect, useState, type FormEvent } from "react";

import { ApiError } from "../api/client";
import { categoriesApi } from "../api/categories";
import type { Category, CategoryCreate } from "../types/api";

const inputCls =
  "w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500";

const cardCls =
  "bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800";

const btnPrimaryCls =
  "px-4 py-2 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-white disabled:opacity-50 transition-colors";

function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CategoryCreate["kind"]>("expense");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await categoriesApi.list(
        filter === "all" ? undefined : filter,
      );
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.detail : "Failed to load categories",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  function openCreate(kindForNew: CategoryCreate["kind"] = "expense") {
    setEditing(null);
    setName("");
    setKind(kindForNew);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setName(category.name);
    setKind(category.kind);
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
    setSaving(true);
    try {
      if (editing) {
        await categoriesApi.update(editing.id, { name, kind });
      } else {
        await categoriesApi.create({ name, kind });
      }
      await load();
      closeForm();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.detail : "Failed to save category",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(category: Category) {
    const ok = window.confirm(
      `Delete "${category.name}"? Existing transactions keep running without a category.`,
    );
    if (!ok) return;
    try {
      await categoriesApi.delete(category.id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.detail : "Failed to delete category",
      );
    }
  }

  const income = categories.filter((c) => c.kind === "income");
  const expense = categories.filter((c) => c.kind === "expense");

  return (
    <div className="text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <button
          type="button"
          onClick={() => openCreate("expense")}
          className={btnPrimaryCls}
        >
          + Add category
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {(["all", "income", "expense"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-md border transition-colors ${
              filter === k
                ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-800 dark:border-slate-100"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
            }`}
          >
            {k === "all" ? "All" : k === "income" ? "Income" : "Expense"}
          </button>
        ))}
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
      ) : categories.length === 0 ? (
        <div className={`${cardCls} p-8 text-center`}>
          <p className="text-slate-500 dark:text-slate-400">No categories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(filter === "all" || filter === "income") && (
            <section className={`${cardCls} overflow-hidden`}>
              <header className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-900/40">
                <h2 className="text-sm font-semibold text-green-800 dark:text-green-300">
                  Income ({income.length})
                </h2>
              </header>
              <CategoryList
                items={income}
                onEdit={openEdit}
                onDelete={(c) => void onDelete(c)}
              />
            </section>
          )}

          {(filter === "all" || filter === "expense") && (
            <section className={`${cardCls} overflow-hidden`}>
              <header className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/40">
                <h2 className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Expense ({expense.length})
                </h2>
              </header>
              <CategoryList
                items={expense}
                onEdit={openEdit}
                onDelete={(c) => void onDelete(c)}
              />
            </section>
          )}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 px-4 py-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg w-full max-w-md p-6 border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? "Edit category" : "Add category"}
            </h2>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="category-name"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  Name
                </label>
                <input
                  id="category-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder="Groceries"
                />
              </div>

              <div>
                <label
                  htmlFor="category-kind"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  Kind
                </label>
                <select
                  id="category-kind"
                  value={kind}
                  onChange={(e) =>
                    setKind(e.target.value as CategoryCreate["kind"])
                  }
                  className={inputCls}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              {editing?.is_default && (
                <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                  This is a default category. Renaming is fine, but keeping
                  the original name may help consistency.
                </p>
              )}

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

function CategoryList({
  items,
  onEdit,
  onDelete,
}: {
  items: Category[];
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400 text-center">
        No categories yet.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((c) => (
        <li
          key={c.id}
          className="px-4 py-3 flex justify-between items-center text-sm gap-3"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">{c.name}</span>
            {c.is_default && (
              <span className="text-xs text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 shrink-0">
                default
              </span>
            )}
          </div>
          <div className="space-x-3 whitespace-nowrap">
            <button
              type="button"
              onClick={() => onEdit(c)}
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(c)}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default CategoriesPage;