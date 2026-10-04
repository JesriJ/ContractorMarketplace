import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { EmptyState } from "@/components/EmptyState";
import { HireRequestForm } from "@/components/HireRequestForm";
import { StarRating } from "@/components/StarRating";
import { getPublicContractor, getContractorProfileForUser } from "@/lib/contractor-profiles";
import { formatHourlyRate, formatLocation, formatPostedDate } from "@/lib/format";
import { getContractorReputation } from "@/lib/reviews";
import { getSession } from "@/lib/session";
import { availabilityLabel } from "@/lib/taxonomy";

type ContractorProfilePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reviewPage?: string }>;
};

export async function generateMetadata({ params }: ContractorProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const contractor = await getPublicContractor(id).catch(() => null);

  if (!contractor) {
    return { title: "Contractor not found | Contractor Marketplace" };
  }

  return {
    title: `${contractor.companyName} | Contractor Marketplace`,
    description: `${contractor.trade} in ${formatLocation(contractor.city, contractor.state)}.`,
  };
}

export default async function ContractorProfilePage({ params, searchParams }: ContractorProfilePageProps) {
  const { id } = await params;
  const { reviewPage } = await searchParams;
  const parsedReviewPage = Number(reviewPage ?? "1");

  let contractor: Awaited<ReturnType<typeof getPublicContractor>> = null;
  try {
    contractor = await getPublicContractor(id);
  } catch {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="Unable to load this profile"
          description="Confirm the database is running, then try again."
        />
      </section>
    );
  }

  if (!contractor) {
    notFound();
  }

  const session = await getSession();
  const reputation = await getContractorReputation(
    contractor.id,
    Number.isFinite(parsedReviewPage) ? parsedReviewPage : 1,
  );
  const ownProfile =
    session?.user.role === UserRole.CONTRACTOR
      ? await getContractorProfileForUser(session.user.id)
      : null;
  const isOwner = ownProfile?.id === contractor.id;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-slate-500">
        <Link href="/contractors" className="hover:text-slate-800">
          Find contractors
        </Link>
      </p>

      <div className="mt-4 flex flex-wrap items-start gap-4">
        {contractor.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contractor.profileImage}
            alt=""
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-2xl font-semibold text-slate-600">
            {contractor.companyName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{contractor.companyName}</h1>
          <p className="mt-1 text-slate-700">{contractor.trade}</p>
          <div className="mt-2">
            <StarRating value={reputation.ratingAverage} count={reputation.reviewCount} size="md" />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {contractor.verified
              ? "Identity check recorded; not an endorsement"
              : "Credentials not verified—check independently"}
          </p>
        </div>
      </div>

      <dl className="mt-6 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <div>
          <dt className="font-medium text-slate-900">Location</dt>
          <dd>{formatLocation(contractor.city, contractor.state)}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900">Rate</dt>
          <dd>{formatHourlyRate(contractor.hourlyRate)}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900">Experience</dt>
          <dd>
            {contractor.yearsExperience} {contractor.yearsExperience === 1 ? "year" : "years"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900">Service radius</dt>
          <dd>{contractor.serviceRadiusMiles} miles</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900">Availability</dt>
          <dd>{availabilityLabel(contractor.availability) ?? "Not specified"}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900">Completed jobs</dt>
          <dd>{reputation.pastWork.length}</dd>
        </div>
      </dl>

      {contractor.skills.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900">Skills</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {contractor.skills.map((skill) => (
              <span key={skill} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
                {skill}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {contractor.serviceCategories.length > 0 ? (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-slate-900">Service categories</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {contractor.serviceCategories.map((category) => (
              <span
                key={category}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        {session?.user.role === UserRole.CUSTOMER ? (
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <h2 className="text-base font-semibold text-slate-900">Request service</h2>
            <p className="mt-1 text-sm text-slate-600">
              Describe the work. {contractor.companyName} can accept or reject this request.
            </p>
            <div className="mt-4">
              <HireRequestForm contractorId={contractor.id} />
            </div>
          </div>
        ) : null}
        {!session ? (
          <Link
            href={`/login?callbackUrl=/contractors/${contractor.id}`}
            className="text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            Log in to request service
          </Link>
        ) : null}
        {isOwner ? (
          <Link href="/contractor-profile/edit" className="text-sm font-medium text-blue-700 hover:text-blue-800">
            Edit your profile
          </Link>
        ) : null}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">About</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{contractor.bio}</p>
      {contractor.availabilityNotes ? (
        <p className="mt-3 text-sm text-slate-600">Scheduling notes: {contractor.availabilityNotes}</p>
      ) : null}

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Portfolio</h2>
      {contractor.portfolioImages.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="No portfolio photos yet."
            description="Contractors can add photo URLs of previous jobs on their profile."
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {contractor.portfolioImages.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="Previous job" className="h-48 w-full rounded-md object-cover" />
          ))}
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Reviews</h2>
      {reputation.reviews.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="No reviews yet."
            description="Reviews appear here after a customer completes a job with this contractor."
          />
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {reputation.reviews.map((review) => (
            <li key={review.id} className="rounded-md border border-slate-200 bg-white p-4">
              <StarRating value={review.rating} />
              <p className="mt-1 text-sm text-slate-600">{review.jobTitle}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{review.comment}</p>
              <p className="mt-2 text-xs text-slate-500">{formatPostedDate(review.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
      {reputation.reviewPageCount > 1 ? (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Review pages">
          {reputation.reviewPage > 1 ? (
            <Link
              href={`/contractors/${contractor.id}?reviewPage=${reputation.reviewPage - 1}`}
              className="font-medium text-blue-700 hover:text-blue-800"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-slate-600">
            Page {reputation.reviewPage} of {reputation.reviewPageCount}
          </span>
          {reputation.reviewPage < reputation.reviewPageCount ? (
            <Link
              href={`/contractors/${contractor.id}?reviewPage=${reputation.reviewPage + 1}`}
              className="font-medium text-blue-700 hover:text-blue-800"
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Past work</h2>
      {reputation.pastWork.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="No completed jobs yet."
            description="Completed marketplace jobs will be listed here."
          />
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {reputation.pastWork.map((job) => (
            <li key={job.id} className="rounded-md border border-slate-200 bg-white p-4">
              <Link href={`/jobs/${job.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-800">
                {job.title}
              </Link>
              <p className="mt-1 text-sm text-slate-600">{job.location}</p>
              <p className="mt-1 text-sm text-slate-600">Completed</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
