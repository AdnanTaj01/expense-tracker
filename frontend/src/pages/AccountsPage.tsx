import { useEffect, useState, type FormEvent } from "react";

import { accountsApi } from "../api/accounts";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Account, AccountCreate } from "../types/api";

const ACCOUNT_TYPES: { value: AccountCreate["type"]; label: string }[] = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit card" },
  { value: "wallet", label: "Wallet" },
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

const btnGhostCls =
  "px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white";

function AccountsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "PKR";

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountCreate["type"]>("checking");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await accountsApi.list();
      setAccounts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setType("checking");
    setOpeningBalance("0");
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setName(account.name);
    setType(account.type);
    setOpeningBalance(account.balance);
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
        await accountsApi.update(editing.id, { name, type });
      } else {
        await accountsApi.create({ name, type, balance: openingBalance });
      }
      await load();
      closeForm();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.detail : "Failed to save account",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(account: Account) {
    const ok = window.confirm(
      `Delete "${account.name}"? This will also delete its transactions.`,
    );
    if (!ok) return;
    try {
      await accountsApi.delete(account.id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.detail : "Failed to delete account",
      );
    }
  }

  return (
    <div className="text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <button type="button" onClick={openCreate} className={btnPrimaryCls}>
          + Add account
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
      ) : accounts.length === 0 ? (
        <div className={`${cardCls} p-8 text-center`}>
          <p className="text-slate-500 dark:text-slate-400">No accounts yet.</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-3 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline"
          >
            Add your first account
          </button>
        </div>
      ) : (
        <div className={`${cardCls} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Type
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Balance
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {accounts.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 text-sm">{a.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 capitalize">
                      {a.type.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {formatMoney(a.balance, a.currency || currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right space-x-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDelete(a)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 px-4 py-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg w-full max-w-md p-6 border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? "Edit account" : "Add account"}
            </h2>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="account-name"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  Name
                </label>
                <input
                  id="account-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder="Meezan Bank"
                />
              </div>

              <div>
                <label
                  htmlFor="account-type"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  Type
                </label>
                <select
                  id="account-type"
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as AccountCreate["type"])
                  }
                  className={inputCls}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {!editing && (
                <div>
                  <label
                    htmlFor="account-balance"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                  >
                    Opening balance
                  </label>
                  <input
                    id="account-balance"
                    type="number"
                    step="0.01"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className={inputCls}
                  />
                </div>
              )}

              {editing && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Balance only changes through transactions.
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

export default AccountsPage;