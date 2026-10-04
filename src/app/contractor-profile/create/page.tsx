import type { Metadata } from "next";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { ContractorProfileForm } from "@/components/ContractorProfileForm";
import { createContractorProfileAction } from "@/lib/actions/contractor-profile";
import { getContractorProfileForUser } from "@/lib/contractor-profiles";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Create contractor profile | Contractor Marketplace",
  robots: { index: false, follow: false },
};

export default async function CreateContractorProfilePage() {
  const session = await requireRole(UserRole.CONTRACTOR);
  const existing = await getContractorProfileForUser(session.user.id);

  if (existing) {
    redirect("/contractor-profile/edit");
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create your profile</h1>
      <p className="mt-2 text-sm text-slate-600">
        This information is public. Verification is handled by the platform and is not part of this
        form.
      </p>
      <div className="mt-8 rounded-md border border-slate-200 bg-white p-6">
        <ContractorProfileForm action={createContractorProfileAction} submitLabel="Publish profile" />
      </div>
    </section>
  );
}
