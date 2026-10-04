import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JobStatus, UserRole } from "@prisma/client";
import { JobForm } from "@/components/JobForm";
import { inferStateFromLocation } from "@/lib/ai/matching";
import { updateJobAction } from "@/lib/actions/job";
import { getJobDetail } from "@/lib/jobs";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Edit job | Contractor Marketplace",
  robots: { index: false, follow: false },
};

type EditJobPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditJobPage({ params }: EditJobPageProps) {
  await requireRole(UserRole.CUSTOMER);
  const { id } = await params;
  const detail = await getJobDetail(id);

  if (!detail) {
    notFound();
  }
  if (!detail.isOwner) {
    redirect(`/jobs/${id}`);
  }
  if (detail.job.status !== JobStatus.OPEN && detail.job.status !== JobStatus.BIDDING) {
    redirect(`/jobs/${id}`);
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <p className="text-sm text-slate-500">
        <Link href={`/jobs/${id}`} className="hover:text-slate-800">
          Back to job
        </Link>
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Edit job</h1>
      <div className="mt-8 rounded-md border border-slate-200 bg-white p-6">
        <JobForm
          action={updateJobAction}
          submitLabel="Save changes"
          jobId={id}
          defaultValues={{
            title: detail.job.title,
            description: detail.job.description,
            budget: detail.job.budget ?? "",
            city: detail.job.city ?? detail.job.location.split(",")[0]?.trim() ?? "",
            state: detail.job.state ?? inferStateFromLocation(detail.job.location) ?? "",
            requiredSkills: detail.job.requiredSkills,
            projectType: detail.job.projectType ?? "",
            experienceLevel: detail.job.experienceLevel ?? "any",
            availabilityNeeded: detail.job.availabilityNeeded ?? "",
            imageUrls: detail.job.imageUrls,
          }}
        />
      </div>
    </section>
  );
}
