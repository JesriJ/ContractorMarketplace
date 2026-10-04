"use client";

import { useActionState } from "react";
import { createHireRequestAction } from "@/lib/actions/hire-request";

const fieldClass = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900";

export function HireRequestForm({ contractorId }: { contractorId: string }) {
  const [state, formAction, pending] = useActionState(createHireRequestAction, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="contractorId" value={contractorId} />
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">What do you need done?</span>
        <textarea name="message" required rows={4} maxLength={2000} className={fieldClass} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? "Sending..." : "Request service"}
      </button>
    </form>
  );
}
