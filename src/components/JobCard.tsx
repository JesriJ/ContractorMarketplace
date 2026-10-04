import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney, formatPostedDate } from "@/lib/format";
import type { PublicJob } from "@/lib/jobs";

export function JobCard({ job }: { job: PublicJob }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{job.title}</h2>
        <StatusBadge status={job.status} />
      </div>
      {job.projectType ? <p className="mt-1 text-sm capitalize text-slate-600">{job.projectType}</p> : null}
      <p className="mt-2 text-sm text-slate-700">{job.location}</p>
      <p className="mt-1 text-sm text-slate-700">
        {job.budget ? `Budget: ${formatMoney(job.budget)}` : "Budget not specified"}
      </p>
      {job.requiredSkills.length > 0 ? (
        <p className="mt-2 text-xs text-slate-600">{job.requiredSkills.slice(0, 4).join(" · ")}</p>
      ) : null}
      <p className="mt-2 text-sm text-slate-600">
        {job.bidCount} {job.bidCount === 1 ? "bid" : "bids"} · Posted {formatPostedDate(job.createdAt)}
      </p>
      <Link href={`/jobs/${job.id}`} className="mt-4 inline-block text-sm font-medium text-blue-700 hover:text-blue-800">
        View job
      </Link>
    </article>
  );
}
