"use server";

import { redirect } from "next/navigation";
import {
  createContractorProfile,
  updateContractorProfile,
} from "@/lib/contractor-profiles";
import { profileInputFromFormData } from "@/lib/validations/contractor-profile";

export type ProfileFormState = {
  error: string | null;
};

export async function createContractorProfileAction(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const result = await createContractorProfile(profileInputFromFormData(formData));
  if (!result.ok) {
    return { error: result.error };
  }

  redirect(`/contractors/${result.profile.id}`);
}

export async function updateContractorProfileAction(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const result = await updateContractorProfile(profileInputFromFormData(formData));
  if (!result.ok) {
    return { error: result.error };
  }

  redirect(`/contractors/${result.profile.id}`);
}
