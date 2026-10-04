"use server";

import { redirect } from "next/navigation";
import {
  acceptBid,
  cancelJob,
  confirmJobCompletion,
  createJob,
  rejectBid,
  requestJobCompletion,
  startJob,
  submitBid,
  updateJob,
} from "@/lib/jobs";
import { bidInputFromFormData, jobInputFromFormData } from "@/lib/validations/job";

export type FormState = {
  error: string | null;
};

export async function createJobAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const result = await createJob(jobInputFromFormData(formData));
  if (!result.ok) {
    return { error: result.error };
  }
  redirect(`/jobs/${result.data.id}`);
}

export async function updateJobAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const jobId = String(formData.get("jobId") ?? "");
  const result = await updateJob(jobId, jobInputFromFormData(formData));
  if (!result.ok) {
    return { error: result.error };
  }
  redirect(`/jobs/${result.data.id}`);
}

export async function submitBidAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const jobId = String(formData.get("jobId") ?? "");
  const result = await submitBid(jobId, bidInputFromFormData(formData));
  if (!result.ok) {
    return { error: result.error };
  }
  redirect(`/jobs/${jobId}`);
}

export async function acceptBidAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const jobId = String(formData.get("jobId") ?? "");
  const bidId = String(formData.get("bidId") ?? "");
  const result = await acceptBid(jobId, bidId);
  if (!result.ok) {
    return { error: result.error };
  }
  redirect(`/jobs/${jobId}`);
}

export async function rejectBidAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const jobId = String(formData.get("jobId") ?? "");
  const bidId = String(formData.get("bidId") ?? "");
  const result = await rejectBid(jobId, bidId);
  if (!result.ok) {
    return { error: result.error };
  }
  redirect(`/jobs/${jobId}`);
}

export async function cancelJobAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const jobId = String(formData.get("jobId") ?? "");
  const result = await cancelJob(jobId);
  if (!result.ok) {
    return { error: result.error };
  }
  redirect(`/jobs/${jobId}`);
}

export async function startJobAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const jobId = String(formData.get("jobId") ?? "");
  const result = await startJob(jobId);
  if (!result.ok) {
    return { error: result.error };
  }
  redirect(`/jobs/${jobId}`);
}

export async function requestCompletionAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const jobId = String(formData.get("jobId") ?? "");
  const result = await requestJobCompletion(jobId);
  if (!result.ok) {
    return { error: result.error };
  }
  redirect(`/jobs/${jobId}`);
}

export async function confirmCompletionAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const jobId = String(formData.get("jobId") ?? "");
  const result = await confirmJobCompletion(jobId);
  if (!result.ok) {
    return { error: result.error };
  }
  redirect(`/jobs/${jobId}`);
}
