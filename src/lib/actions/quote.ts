"use server";

import { revalidatePath } from "next/cache";
import { decideQuote, markPaidOutside, sendQuote } from "@/lib/quotes";

export type QuoteFormState = { error: string | null; success?: string };

export async function sendQuoteAction(_state: QuoteFormState, formData: FormData): Promise<QuoteFormState> {
  const jobId = String(formData.get("jobId") ?? "");
  const result = await sendQuote(jobId, {
    scope: formData.get("scope"),
    laborAmount: formData.get("laborAmount"),
    materialsAmount: formData.get("materialsAmount"),
    taxAmount: formData.get("taxAmount"),
    depositTerms: formData.get("depositTerms"),
    milestoneTerms: formData.get("milestoneTerms"),
    schedule: formData.get("schedule"),
    cancellationTerms: formData.get("cancellationTerms"),
    expiresAt: formData.get("expiresAt"),
  });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/jobs/${jobId}`);
  return { error: null, success: "Quote sent." };
}

export async function quoteDecisionAction(formData: FormData) {
  const quoteId = String(formData.get("quoteId") ?? "");
  const jobId = String(formData.get("jobId") ?? "");
  const decision = formData.get("decision") === "accept" ? "accept" : "decline";
  await decideQuote(quoteId, decision);
  revalidatePath(`/jobs/${jobId}`);
}

export async function markPaidOutsideAction(formData: FormData) {
  const quoteId = String(formData.get("quoteId") ?? "");
  const jobId = String(formData.get("jobId") ?? "");
  await markPaidOutside(quoteId);
  revalidatePath(`/jobs/${jobId}`);
}
