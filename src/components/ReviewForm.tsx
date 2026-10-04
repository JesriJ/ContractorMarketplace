"use client";

import { useActionState } from "react";
import { createReviewAction } from "@/lib/actions/review";

const fieldClass = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900";

export function ReviewForm({ jobId }: { jobId: string }) {
  const [state, formAction, pending] = useActionState(createReviewAction, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="jobId" value={jobId} />
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Rating</span>
        <select name="rating" required defaultValue="5" className={fieldClass}>
          <option value="5">5</option>
          <option value="4">4</option>
          <option value="3">3</option>
          <option value="2">2</option>
          <option value="1">1</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Comment</span>
        <textarea name="comment" required rows={4} maxLength={2000} className={fieldClass} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
