import { useEffect, useRef, useState, type FormEvent } from "react";

import { ApiError } from "../api/client";
import { chatApi } from "../api/chat";
import type { ChatSource } from "../types/api";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

const cardCls =
  "bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800";

const inputCls =
  "w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500";

function ChatPage() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
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
      const res = await chatApi.ask({ message: trimmed });
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: res.answer, sources: res.sources },
      ]);
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : "Something went wrong.";
      setError(detail);
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${detail}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="text-slate-900 dark:text-slate-100 flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">AI Assistant</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ask questions about your uploaded documents.
        </p>
      </div>

      <section className={`${cardCls} flex-1 flex flex-col overflow-hidden`}>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {turns.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-slate-500 dark:text-slate-400">
              <p>
                Upload a document, then ask something like{" "}
                <span className="italic">
                  "How much did I spend on food delivery?"
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
                                    {turn.sources && turn.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-300 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      <div className="font-medium">Sources:</div>
                      {Array.from(
                        new Map(
                          turn.sources.map((s) => [s.document_id, s.document_name]),
                        ),
                      ).map(([docId, docName]) => (
                        <div key={docId} className="truncate">
                          📄 {docName}
                        </div>
                      ))}
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
            placeholder="Ask about your documents…"
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

export default ChatPage;