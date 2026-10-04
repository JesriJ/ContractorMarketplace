"use server";

import { redirect } from "next/navigation";
import {
  acceptHireRequest,
  cancelHireRequest,
  createHireRequest,
  rejectHireRequest,
} from "@/lib/hire-requests";

export type FormState = {
  error: string | null;
};

export async function createHireRequestAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const contractorId = String(formData.get("contractorId") ?? "");
  const result = await createHireRequest(contractorId, { message: formData.get("message") });
  if (!result.ok) {
    return { error: result.error };
  }
  redirect(`/hire-requests/${result.data.id}`);
}

export async function acceptHireRequestAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const requestId = String(formData.get("requestId") ?? "");
  const result = await acceptHireRequest(requestId);
  if (!result.ok) {
    return { error: result.error };
  }
  if (result.data.jobId) {
    redirect(`/jobs/${result.data.jobId}`);
  }
  redirect(`/hire-requests/${requestId}`);
}

export async function rejectHireRequestAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const requestId = String(formData.get("requestId") ?? "");
  const result = await rejectHireRequest(requestId);
  if (!result.ok) {
    return { error: result.error };
  }
  redirect(`/hire-requests/${requestId}`);
}

export async function cancelHireRequestAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const requestId = String(formData.get("requestId") ?? "");
  const result = await cancelHireRequest(requestId);
  if (!result.ok) {
    return { error: result.error };
  }
  redirect(`/hire-requests/${requestId}`);
}
