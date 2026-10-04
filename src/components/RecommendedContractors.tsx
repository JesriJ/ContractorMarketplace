import Link from "next/link";
import { StarRating } from "@/components/StarRating";
import { formatHourlyRate, formatLocation } from "@/lib/format";
import type { RecommendedContractor } from "@/lib/recommendations";

export function RecommendedContractors({
  recommendations,
}: {
  recommendations: RecommendedContractor[];
}) {
  if (recommendations.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-600">
        No contractor matches yet. Matching improves after job requirements are extracted.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {recommendations.map((item, index) => (
        <li key={item.contractorId} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">#{index + 1}</p>
              <h3 className="text-base font-semibold text-slate-900">{item.companyName}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {item.trade} · {formatLocation(item.city, item.state)}
              </p>
              <div className="mt-1">
                <StarRating value={item.ratingAverage} />
              </div>
              <p className="mt-1 text-sm text-slate-700">
                {item.completedJobs} completed {item.completedJobs === 1 ? "job" : "jobs"} ·{" "}
                {formatHourlyRate(item.hourlyRate)}
              </p>
            </div>
            <p className="rounded-md bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">
              {item.matchScore.toFixed(0)}% Match
            </p>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {item.reasons.map((reason) => (
              <li key={reason}>✓ {reason}</li>
            ))}
            {item.warnings.map((warning) => (
              <li key={warning} className="text-amber-800">
                ⚠ {warning}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            <Link
              href={`/contractors/${item.contractorId}`}
              className="font-medium text-blue-700 hover:text-blue-800"
            >
              View profile
            </Link>
          </p>
        </li>
      ))}
    </ol>
  );
}
