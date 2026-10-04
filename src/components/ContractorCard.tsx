import Link from "next/link";
import { StarRating } from "@/components/StarRating";
import type { PublicContractor } from "@/lib/contractor-profiles";
import { formatHourlyRate, formatLocation } from "@/lib/format";
import { availabilityLabel } from "@/lib/taxonomy";

export function ContractorCard({ contractor }: { contractor: PublicContractor }) {
  return (
    <article className="flex h-full flex-col rounded-md border border-slate-200 bg-white p-4">
      <div className="flex gap-3">
        {contractor.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contractor.profileImage}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
            {contractor.companyName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold text-slate-900">{contractor.companyName}</h2>
          <p className="mt-1 text-sm text-slate-600">{contractor.trade}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700">{formatLocation(contractor.city, contractor.state)}</p>
      <p className="mt-2 text-sm text-slate-700">{formatHourlyRate(contractor.hourlyRate)}</p>
      <div className="mt-2">
        <StarRating value={contractor.ratingAverage} count={contractor.reviewCount} />
      </div>
      {contractor.skills.length > 0 ? (
        <p className="mt-2 line-clamp-2 text-xs text-slate-600">{contractor.skills.slice(0, 5).join(" · ")}</p>
      ) : null}
      {contractor.availability ? (
        <p className="mt-2 text-xs text-slate-600">{availabilityLabel(contractor.availability)}</p>
      ) : null}
      <p className="mt-1 text-sm text-slate-700">
        {contractor.yearsExperience} {contractor.yearsExperience === 1 ? "year" : "years"} experience
      </p>
      <p className="mt-2 text-sm text-slate-600">
        {contractor.verified
          ? "Identity check recorded; not an endorsement"
          : "Credentials not verified—check independently"}
      </p>
      <Link
        href={`/contractors/${contractor.id}`}
        className="mt-4 text-sm font-medium text-blue-700 hover:text-blue-800"
      >
        View profile
      </Link>
    </article>
  );
}
