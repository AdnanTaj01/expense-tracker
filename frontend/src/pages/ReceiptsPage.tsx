import { useEffect, useRef, useState, type FormEvent } from "react";

import { ApiError } from "../api/client";
import { receiptsApi } from "../api/receipts";
import { transactionsApi } from "../api/transactions";
import type { Receipt, Transaction } from "../types/api";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

const cardCls =
  "bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800";

const inputCls =
  "w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500";

function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [txId, setTxId] = useState<number | "">("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const [recs, txs] = await Promise.all([
        receiptsApi.list(),
        transactionsApi.list({ limit: 200 }),
      ]);
      setReceipts(recs);
      setTransactions(txs.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load receipts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setUploadError(null);
    if (!file) {
      setUploadError("Choose a file first.");
      return;
    }
    setUploading(true);
    try {
      await receiptsApi.upload(file, txId === "" ? null : txId);
      setFile(null);
      setTxId("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.detail : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(r: Receipt) {
    const ok = window.confirm(`Delete "${r.original_name}"?`);
    if (!ok) return;
    try {
      await receiptsApi.delete(r.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to delete");
    }
  }

  async function onDownload(r: Receipt) {
    try {
      await receiptsApi.download(r.id, r.original_name);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Download failed");
    }
  }

  return (
    <div className="text-slate-900 dark:text-slate-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Receipts</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload receipts (JPG, PNG, WebP, GIF, or PDF). Max 5 MB.
        </p>
      </div>

      <section className={`${cardCls} p-5 sm:p-6 mb-6`}>
        <h2 className="text-lg font-semibold mb-4">Upload a receipt</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="receipt-file"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
            >
              File
            </label>
            <input
              id="receipt-file"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className={inputCls}
            />
          </div>

          <div>
            <label
              htmlFor="receipt-tx"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
            >
              Attach to transaction{" "}
              <span className="text-slate-400 dark:text-slate-500">
                (optional)
              </span>
            </label>
            <select
              id="receipt-tx"
              value={txId}
              onChange={(e) =>
                setTxId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className={inputCls}
            >
              <option value="">— None —</option>
              {transactions.map((t) => (
                <option key={t.id} value={t.id}>
                  {new Date(t.occurred_at).toLocaleDateString()} · {t.kind} ·{" "}
                  {t.amount}
                  {t.note ? ` · ${t.note}` : ""}
                </option>
              ))}
            </select>
          </div>

          {uploadError && (
            <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
              {uploadError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading || !file}
              className="px-4 py-2 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-white disabled:opacity-50 transition-colors"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <div className="mb-4 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          Loading…
        </div>
      ) : receipts.length === 0 ? (
        <div className={`${cardCls} p-8 text-center`}>
          <p className="text-slate-500 dark:text-slate-400">No receipts yet.</p>
        </div>
      ) : (
        <div className={`${cardCls} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                    File
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                    Size
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hidden md:table-cell">
                    Uploaded
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {receipts.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 text-sm">
                      <div className="truncate max-w-[20rem]">
                        {r.original_name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 md:hidden">
                        {formatBytes(r.size_bytes)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                      {formatBytes(r.size_bytes)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 hidden md:table-cell">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right space-x-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => void onDownload(r)}
                        className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDelete(r)}
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
    </div>
  );
}

export default ReceiptsPage;