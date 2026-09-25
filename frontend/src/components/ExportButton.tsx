import { useState } from "react";

import { ApiError } from "../api/client";

interface Props {
  label?: string;
  onClick: () => Promise<void>;
}

function ExportButton({ label = "Export CSV", onClick }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setError(null);
    setBusy(true);
    try {
      await onClick();
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
      >
        {busy ? "Exporting…" : label}
      </button>
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}

export default ExportButton;