"use client";

import { useActionState } from "react";
import { sendQuoteAction, type QuoteFormState } from "@/lib/actions/quote";

const initial: QuoteFormState = { error: null };

export function QuoteForm({ jobId }: { jobId: string }) {
  const [state, action, pending] = useActionState(sendQuoteAction, initial);
  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="jobId" value={jobId} />
      {state.error ? <p role="alert" className="text-sm text-red-700">{state.error}</p> : null}
      {state.success ? <p role="status" className="text-sm text-green-700">{state.success}</p> : null}
      <label className="text-sm">Scope of work<textarea name="scope" required minLength={10} maxLength={5000} rows={4} className="mt-1 w-full rounded-md border border-slate-300 p-2" /></label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Labor ($)<input name="laborAmount" type="number" min="0" step="0.01" required className="mt-1 w-full rounded-md border border-slate-300 p-2" /></label>
        <label className="text-sm">Materials ($)<input name="materialsAmount" type="number" min="0" step="0.01" defaultValue="0" required className="mt-1 w-full rounded-md border border-slate-300 p-2" /></label>
        <label className="text-sm">Estimated tax ($)<input name="taxAmount" type="number" min="0" step="0.01" defaultValue="0" required className="mt-1 w-full rounded-md border border-slate-300 p-2" /></label>
      </div>
      <label className="text-sm">Schedule<input name="schedule" required className="mt-1 w-full rounded-md border border-slate-300 p-2" /></label>
      <label className="text-sm">Deposit terms<input name="depositTerms" className="mt-1 w-full rounded-md border border-slate-300 p-2" /></label>
      <label className="text-sm">Milestone terms<textarea name="milestoneTerms" rows={2} className="mt-1 w-full rounded-md border border-slate-300 p-2" /></label>
      <label className="text-sm">Cancellation terms<textarea name="cancellationTerms" required rows={2} className="mt-1 w-full rounded-md border border-slate-300 p-2" /></label>
      <label className="text-sm">Quote expires<input name="expiresAt" type="datetime-local" required className="mt-1 block rounded-md border border-slate-300 p-2" /></label>
      <p className="text-xs text-slate-600">Do not request card or bank credentials. Payment is arranged directly and outside this platform.</p>
      <button disabled={pending} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{pending ? "Sending…" : "Send quote"}</button>
    </form>
  );
}
