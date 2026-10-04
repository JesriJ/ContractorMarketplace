import type { Metadata } from "next";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { ContractorProfileForm } from "@/components/ContractorProfileForm";
import { updateContractorProfileAction } from "@/lib/actions/contractor-profile";
import { getContractorProfileForUser } from "@/lib/contractor-profiles";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Edit contractor profile | Contractor Marketplace",
  robots: { index: false, follow: false },
};

export default async function EditContractorProfilePage() {
  const session = await requireRole(UserRole.CONTRACTOR);
  const profile = await getContractorProfileForUser(session.user.id);

  if (!profile) {
    redirect("/contractor-profile/create");
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Edit your profile</h1>
      <p className="mt-2 text-sm text-slate-600">
        Identity-check status remains {profile.verified ? "recorded (not an endorsement)" : "not verified"}. You cannot
        change that here.
      </p>
      <div className="mt-8 rounded-md border border-slate-200 bg-white p-6">
        <ContractorProfileForm
          action={updateContractorProfileAction}
          submitLabel="Save changes"
          defaultValues={{
            companyName: profile.companyName,
            trade: profile.trade,
            bio: profile.bio,
            city: profile.city,
            state: profile.state,
            yearsExperience: String(profile.yearsExperience),
            hourlyRate: profile.hourlyRate,
            skills: profile.skills,
            serviceCategories: profile.serviceCategories,
            serviceRadiusMiles: String(profile.serviceRadiusMiles),
            availability: profile.availability ?? "flexible",
            availabilityNotes: profile.availabilityNotes ?? "",
            profileImage: profile.profileImage ?? "",
            portfolioImages: profile.portfolioImages,
          }}
        />
      </div>
    </section>
  );
}
