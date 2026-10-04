import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { RecommendedJob } from "@/lib/recommendations";

export function RecommendedJobs({ recommendations }: { recommendations: RecommendedJob[] }) {
  if (recommendations.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-600">
        No recommended jobs yet. Add skills and a service radius to your profile, then check back when customers post work.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {recommendations.map((item) => (
        <li key={item.jobId} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{item.location}</p>
              <p className="mt-1 text-sm text-slate-700">
                {item.budget ? formatMoney(item.budget) : "Budget not specified"}
              </p>
            </div>
            <p className="rounded-md bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">
              {item.matchScore.toFixed(0)}% Match
            </p>
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Why you&apos;re a match</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {item.reasons.map((reason) => (
                <li key={reason}>✓ {reason}</li>
              ))}
              {item.warnings.map((warning) => (
                <li key={warning} className="text-amber-800">
                  ⚠ {warning}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href={`/jobs/${item.jobId}`} className="font-medium text-blue-700 hover:text-blue-800">
              View job
            </Link>
            <Link href={`/jobs/${item.jobId}`} className="font-medium text-blue-700 hover:text-blue-800">
              Apply / bid
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
