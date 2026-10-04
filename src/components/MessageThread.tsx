"use client";

import { useEffect, useState, type FormEvent } from "react";
import { formatPostedDate } from "@/lib/format";
import type { ConversationDetail, ConversationMessage } from "@/lib/messages";

const POLL_MS = 5000;

export function MessageThread({ initial }: { initial: ConversationDetail }) {
  const [messages, setMessages] = useState<ConversationMessage[]>(initial.messages);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const response = await fetch(`/api/conversations/${initial.id}`);
      if (!response.ok) {
        if (!cancelled) {
          setError("Could not refresh messages.");
        }
        return;
      }
      const data = (await response.json()) as ConversationDetail;
      if (!cancelled) {
        setError(null);
        setMessages(data.messages);
      }
    }

    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [initial.id]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const content = String(new FormData(form).get("content") ?? "");
    setError(null);
    setPending(true);

    try {
      const response = await fetch(`/api/conversations/${initial.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await response.json()) as { error?: string; message?: ConversationMessage };
      const sent = data.message;
      if (!response.ok || !sent) {
        setError(data.error ?? "Unable to send message.");
        return;
      }
      setMessages((current) => [...current, sent]);
      form.reset();
    } catch {
      setError("Unable to send message.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-slate-500">New messages appear automatically. Never share card, bank account, Social Security, or login credentials here.</p>
      <div className="mt-4 space-y-3" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-8 text-sm text-slate-600">
            No messages yet. Send a message to start.
          </p>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={`max-w-[85%] rounded-md border px-3 py-2 text-sm ${
                message.mine
                  ? "ml-auto border-blue-200 bg-blue-50 text-slate-900"
                  : "mr-auto border-slate-200 bg-white text-slate-900"
              }`}
            >
              <p className="whitespace-pre-wrap leading-6">{message.content}</p>
              <p className="mt-1 text-xs text-slate-500">{formatPostedDate(message.createdAt)}</p>
            </article>
          ))
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Message</span>
          <textarea
            name="content"
            required
            rows={3}
            maxLength={2000}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {pending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
