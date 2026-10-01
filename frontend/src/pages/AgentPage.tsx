import { useEffect, useRef, useState, type FormEvent } from "react";

import { ApiError } from "../api/client";
import { agentApi } from "../api/agent";
import type { AgentToolCallLog, PendingAction } from "../types/api";

interface AgentTurn {
  role: "user" | "assistant";
  content: string;
  toolCalls?: AgentToolCallLog[];
  pendingAction?: PendingAction | null;
  resolved?: "confirmed" | "cancelled";
}

const cardCls =
  "bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800";

const inputCls =
  "w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500";

function toolLabel(tool: string): string {
  const labels: Record<string, string> = {
    get_dashboard_summary: "Checked your dashboard summary",
    list_recent_transactions: "Looked up recent transactions",
    get_budget_usage: "Checked your budget usage",
    list_accounts: "Looked up your accounts",
  };
  return labels[tool] ?? `Used tool: ${tool}`;
}

function AgentPage() {
  const [turns, setTurns] = useState<AgentTurn[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setError(null);
    setTurns((prev) => [...prev, { role: "user", content: trimmed }]);
    setMessage("");
    setSending(true);

    try {
      const res = await agentApi.ask({ message: trimmed });
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
          toolCalls: res.tool_calls,
          pendingAction: res.pending_action,
        },
      ]);
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : "Something went wrong.";
      setError(detail);
      setTurns((prev) => [...prev, { role: "assistant", content: `⚠️ ${detail}` }]);
    } finally {
      setSending(false);
    }
  }

  async function onConfirm(turnIndex: number, action: PendingAction) {
    setConfirming(turnIndex);
    setError(null);
    try {
      const res = await agentApi.confirm({ tool: action.tool, arguments: action.arguments });
      const resultText =
        "error" in res.result
          ? `⚠️ ${String(res.result.error)}`
          : `✅ Done — ${action.description}.`;
      setTurns((prev) => {
        const next = [...prev];
        next[turnIndex] = { ...next[turnIndex], resolved: "confirmed" };
        next.push({ role: "assistant", content: resultText });
        return next;
      });
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : "Could not complete the action.";
      setError(detail);
    } finally {
      setConfirming(null);
    }
  }

  function onCancel(turnIndex: number) {
    setTurns((prev) => {
      const next = [...prev];
      next[turnIndex] = { ...next[turnIndex], resolved: "cancelled" };
      next.push({ role: "assistant", content: "Okay, cancelled — nothing was changed." });
      return next;
    });
  }

  return (
    <div className="text-slate-900 dark:text-slate-100 flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Finance Assistant</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ask about your finances, or ask it to add a transaction or budget.
        </p>
      </div>

      <section className={`${cardCls} flex-1 flex flex-col overflow-hidden`}>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {turns.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-slate-500 dark:text-slate-400">
              <p>
                Try asking{" "}
                <span className="italic">
                  "What's my total balance?" or "Add a 500 lunch expense from my cash account"
                </span>
              </p>
            </div>
          ) : (
            turns.map((turn, i) => (
              <div
                key={i}
                className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                    turn.role === "user"
                      ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  }`}
                >
                  <div>{turn.content}</div>

                  {turn.toolCalls && turn.toolCalls.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-300 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      {turn.toolCalls.map((tc, j) => (
                        <div key={j}>🔧 {toolLabel(tc.tool)}</div>
                      ))}
                    </div>
                  )}

                  {turn.pendingAction && !turn.resolved && (
                    <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-700">
                      <div className="text-xs font-medium mb-2 text-amber-700 dark:text-amber-400">
                        ⚠️ Confirmation needed: {turn.pendingAction.description}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void onConfirm(i, turn.pendingAction!)}
                          disabled={confirming === i}
                          className="px-3 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {confirming === i ? "Working…" : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onCancel(i)}
                          disabled={confirming === i}
                          className="px-3 py-1.5 text-xs rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {turn.pendingAction && turn.resolved === "cancelled" && (
                    <div className="mt-2 pt-2 border-t border-slate-300 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 italic">
                      Cancelled
                    </div>
                  )}
                  {turn.pendingAction && turn.resolved === "confirmed" && (
                    <div className="mt-2 pt-2 border-t border-slate-300 dark:border-slate-700 text-xs text-green-600 dark:text-green-400 italic">
                      Confirmed
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                Thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="mx-4 sm:mx-6 mb-2 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="border-t border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex gap-2"
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about your finances…"
            className={inputCls}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="px-4 py-2 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-white disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            Send
          </button>
        </form>
      </section>
    </div>
  );
}

export default AgentPage;