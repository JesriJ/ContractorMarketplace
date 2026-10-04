"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/job";

export function DecisionForm({
  action,
  jobId,
  bidId,
  label,
  pendingLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  jobId: string;
  bidId?: string;
  label: string;
  pendingLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="jobId" value={jobId} />
      {bidId ? <input type="hidden" name="bidId" value={bidId} /> : null}
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? pendingLabel : label}
      </button>
    </form>
  );
}
