"use server";

import { redirect } from "next/navigation";
import { createReview } from "@/lib/reviews";

export type ReviewFormState = {
  error: string | null;
};

export async function createReviewAction(
  _previous: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const jobId = String(formData.get("jobId") ?? "");
  const result = await createReview(jobId, {
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  });
  if (!result.ok) {
    return { error: result.error };
  }
  redirect(`/jobs/${jobId}`);
}
