import type { Metadata } from "next";
import { UserRole } from "@prisma/client";
import { JobForm } from "@/components/JobForm";
import { createJobAction } from "@/lib/actions/job";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Post a job | Contractor Marketplace",
  robots: { index: false, follow: false },
};

export default async function CreateJobPage() {
  await requireRole(UserRole.CUSTOMER);

  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Post a job</h1>
      <p className="mt-2 text-sm text-slate-600">
        Contractors can find this job and submit bids while it is open.
      </p>
      <div className="mt-8 rounded-md border border-slate-200 bg-white p-6">
        <JobForm action={createJobAction} submitLabel="Post job" />
      </div>
    </section>
  );
}
