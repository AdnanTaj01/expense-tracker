import { useEffect, useRef, useState, type FormEvent } from "react";

import { ApiError } from "../api/client";
import { documentsApi } from "../api/documents";
import type { Document } from "../types/api";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

const cardCls =
  "bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800";

const inputCls =
  "w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500";

function StatusBadge({ status }: { status: Document["status"] }) {
  const styles: Record<Document["status"], string> = {
    ready:
      "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    pending:
      "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    failed: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const docs = await documentsApi.list();
      setDocuments(docs);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load documents");
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
      await documentsApi.upload(file);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.detail : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(d: Document) {
    const ok = window.confirm(`Delete "${d.original_name}"?`);
    if (!ok) return;
    try {
      await documentsApi.delete(d.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to delete");
    }
  }

  async function onDownload(d: Document) {
    try {
      await documentsApi.download(d.id, d.original_name);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Download failed");
    }
  }

  return (
    <div className="text-slate-900 dark:text-slate-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload documents (PDF, TXT, or Markdown) for AI-powered search. Max 20 MB.
        </p>
      </div>

      <section className={`${cardCls} p-5 sm:p-6 mb-6`}>
        <h2 className="text-lg font-semibold mb-4">Upload a document</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="document-file"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
            >
              File
            </label>
            <input
              id="document-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className={inputCls}
            />
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
      ) : documents.length === 0 ? (
        <div className={`${cardCls} p-8 text-center`}>
          <p className="text-slate-500 dark:text-slate-400">No documents yet.</p>
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
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Status
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
                {documents.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 text-sm">
                      <div className="truncate max-w-[20rem]">
                        {d.original_name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 md:hidden">
                        {formatBytes(d.size_bytes)}
                      </div>
                      {d.page_count !== null && (
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          {d.page_count} page{d.page_count === 1 ? "" : "s"}
                        </div>
                      )}
                      {d.status === "failed" && d.error_message && (
                        <div className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                          {d.error_message}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                      {formatBytes(d.size_bytes)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 hidden md:table-cell">
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right space-x-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => void onDownload(d)}
                        className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDelete(d)}
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

export default DocumentsPage;