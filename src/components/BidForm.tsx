"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/job";

const fieldClass = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900";

export function BidForm({
  action,
  jobId,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  jobId: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="jobId" value={jobId} />
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Bid amount (USD)</span>
        <input name="amount" type="number" required min={0.01} step={0.01} className={fieldClass} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Message</span>
        <textarea name="message" required rows={4} maxLength={2000} className={fieldClass} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Estimated time</span>
        <input name="estimatedDuration" required maxLength={120} placeholder="2 hours" className={fieldClass} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? "Submitting..." : "Submit bid"}
      </button>
    </form>
  );
}
