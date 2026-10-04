import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JobStatus } from "@prisma/client";
import { BidForm } from "@/components/BidForm";
import { DecisionForm } from "@/components/DecisionForm";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { acceptBidAction, cancelJobAction, confirmCompletionAction, rejectBidAction, requestCompletionAction, startJobAction, submitBidAction } from "@/lib/actions/job";
import { QuoteForm } from "@/components/QuoteForm";
import { RecommendedContractors } from "@/components/RecommendedContractors";
import { ReviewForm } from "@/components/ReviewForm";
import { markPaidOutsideAction, quoteDecisionAction } from "@/lib/actions/quote";
import { formatLocation, formatMoney, formatPostedDate } from "@/lib/format";
import { getJobDetail } from "@/lib/jobs";
import { getQuotes } from "@/lib/quotes";
import { getRecommendedContractorsForJob } from "@/lib/recommendations";
import { getSession } from "@/lib/session";
import { availabilityLabel, experienceLabel } from "@/lib/taxonomy";

type JobPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: JobPageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getJobDetail(id).catch(() => null);
  if (!detail) {
    return { title: "Job not found | Contractor Marketplace" };
  }
  return {
    title: `${detail.job.title} | Contractor Marketplace`,
    description: `${detail.job.title} in ${detail.job.location}.`,
  };
}

export default async function JobPage({ params }: JobPageProps) {
  const { id } = await params;
  const detail = await getJobDetail(id).catch(() => null);
  if (!detail) {
    notFound();
  }

  const session = await getSession();
  const { job } = detail;
  const quotes = detail.isOwner || detail.isAssignedContractor ? await getQuotes(job.id) : [];
  const canManage = detail.isOwner && (job.status === JobStatus.OPEN || job.status === JobStatus.BIDDING);
  const recommendedContractors =
    detail.isOwner && canManage ? await getRecommendedContractorsForJob(job.id, 5) : null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-slate-500">
        <Link href="/jobs" className="hover:text-slate-800">
          Find jobs
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{job.title}</h1>
        <StatusBadge status={job.status} />
      </div>
      {job.projectType ? <p className="mt-2 text-sm capitalize text-slate-600">{job.projectType}</p> : null}
      <p className="mt-3 text-sm text-slate-700">{job.location}</p>
      <p className="mt-1 text-sm text-slate-700">
        {job.budget ? `Budget: ${formatMoney(job.budget)}` : "Budget not specified"}
      </p>
      {job.requiredSkills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {job.requiredSkills.map((skill) => (
            <span key={skill} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
              {skill}
            </span>
          ))}
        </div>
      ) : null}
      <p className="mt-2 text-sm text-slate-600">
        {[
          experienceLabel(job.experienceLevel),
          availabilityLabel(job.availabilityNeeded),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p className="mt-1 text-sm text-slate-600">
        {job.bidCount} {job.bidCount === 1 ? "bid" : "bids"} · Posted {formatPostedDate(job.createdAt)}
      </p>
      {detail.customerEmail ? (
        <p className="mt-2 text-sm text-slate-600">Customer: {detail.customerEmail}</p>
      ) : null}
      {job.contractor ? (
        <p className="mt-2 text-sm text-slate-700">
          Assigned to{" "}
          <Link href={`/contractors/${job.contractor.id}`} className="font-medium text-blue-700 hover:text-blue-800">
            {job.contractor.companyName}
          </Link>
        </p>
      ) : null}
      {detail.canMessage ? (
        <p className="mt-3 text-sm">
          <Link href={`/jobs/${job.id}/messages`} className="font-medium text-blue-700 hover:text-blue-800">
            Message
          </Link>
        </p>
      ) : null}

      {(detail.isOwner || detail.isAssignedContractor) && job.contractor ? (
        <div className="mt-6 rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Quotes and agreement</h2>
          <p className="mt-2 text-sm text-slate-600">You negotiate here, but pay each other outside the platform. We do not hold, process, or verify funds.</p>
          {quotes.map((quote) => (
            <article key={quote.id} className="mt-4 rounded-md border border-slate-200 p-4">
              <div className="flex justify-between gap-3"><strong>Quote v{quote.version}: {formatMoney(quote.totalAmount)}</strong><StatusBadge status={quote.status} /></div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{quote.scope}</p>
              <dl className="mt-2 text-sm text-slate-600"><div>Schedule: {quote.schedule}</div><div>Cancellation: {quote.cancellationTerms}</div><div>Expires: {quote.expiresAt.toLocaleString()}</div></dl>
              {detail.isOwner && quote.status === "SENT" ? (
                <div className="mt-3 flex gap-2">
                  <form action={quoteDecisionAction}><input type="hidden" name="jobId" value={job.id} /><input type="hidden" name="quoteId" value={quote.id} /><button name="decision" value="accept" className="rounded bg-blue-700 px-3 py-2 text-sm text-white">Accept quote</button></form>
                  <form action={quoteDecisionAction}><input type="hidden" name="jobId" value={job.id} /><input type="hidden" name="quoteId" value={quote.id} /><button name="decision" value="decline" className="rounded border px-3 py-2 text-sm">Decline</button></form>
                  <span className="self-center text-sm text-slate-500">Or decide later—no action is saved.</span>
                </div>
              ) : null}
              {quote.status === "ACCEPTED" && !quote.paidOutsideAt ? (
                <form action={markPaidOutsideAction} className="mt-3"><input type="hidden" name="jobId" value={job.id} /><input type="hidden" name="quoteId" value={quote.id} /><button className="rounded border px-3 py-2 text-sm">Mark paid outside platform</button></form>
              ) : null}
              {quote.paidOutsideAt ? <p className="mt-2 text-sm text-slate-600">A participant reported outside payment on {quote.paidOutsideAt.toLocaleString()}. This is not verified by the platform.</p> : null}
            </article>
          ))}
          {detail.isAssignedContractor && job.status !== JobStatus.CANCELLED ? <QuoteForm jobId={job.id} /> : null}
        </div>
      ) : null}

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Description</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{job.description}</p>

      {job.imageUrls.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-slate-900">Job photos</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {job.imageUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="Job reference" className="h-48 w-full rounded-md object-cover" />
            ))}
          </div>
        </div>
      ) : null}

      {recommendedContractors?.ok ? (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">Recommended contractors</h2>
          <p className="mt-1 text-sm text-slate-600">
            Ranked with structured matching and optional semantic similarity. Facts come from profiles and reviews.
          </p>
          <div className="mt-3">
            <RecommendedContractors recommendations={recommendedContractors.recommendations} />
          </div>
        </div>
      ) : null}

      {canManage ? (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link href={`/jobs/${job.id}/edit`} className="text-sm font-medium text-blue-700 hover:text-blue-800">
            Edit job
          </Link>
          <DecisionForm action={cancelJobAction} jobId={job.id} label="Cancel job" pendingLabel="Cancelling..." />
        </div>
      ) : null}

      {detail.isAssignedContractor && job.status === JobStatus.ASSIGNED ? (
        <div className="mt-6">
          <DecisionForm action={startJobAction} jobId={job.id} label="Start job" pendingLabel="Starting..." />
        </div>
      ) : null}
      {detail.isAssignedContractor && job.status === JobStatus.IN_PROGRESS ? (
        <div className="mt-6">
          <DecisionForm
            action={requestCompletionAction}
            jobId={job.id}
            label="Mark complete"
            pendingLabel="Submitting..."
          />
        </div>
      ) : null}
      {detail.isOwner && job.status === JobStatus.PENDING_CONFIRMATION ? (
        <div className="mt-6 space-y-2">
          <p className="text-sm text-slate-700">The contractor marked this job complete. Confirm when the work is finished.</p>
          <DecisionForm
            action={confirmCompletionAction}
            jobId={job.id}
            label="Confirm completion"
            pendingLabel="Confirming..."
          />
        </div>
      ) : null}

      {detail.canReview ? (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">Leave a review</h2>
          <div className="mt-4 rounded-md border border-slate-200 bg-white p-6">
            <ReviewForm jobId={job.id} />
          </div>
        </div>
      ) : null}
      {detail.isOwner && detail.review ? (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">Your review</h2>
          <p className="mt-2 text-sm text-slate-800">{detail.review.rating} / 5</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{detail.review.comment}</p>
        </div>
      ) : null}

      {detail.isOwner ? (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">Bids</h2>
          {detail.bids.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No bids yet."
                description="Contractors will appear here once they respond."
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-4">
              {detail.bids.map((bid) => (
                <li key={bid.id} className="rounded-md border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/contractors/${bid.contractor.id}`} className="font-medium text-slate-900 hover:text-blue-800">
                        {bid.contractor.companyName}
                      </Link>
                      <p className="text-sm text-slate-600">
                        {bid.contractor.trade} ┬╖ {formatLocation(bid.contractor.city, bid.contractor.state)}
                      </p>
                    </div>
                    <StatusBadge status={bid.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-800">{formatMoney(bid.amount)}</p>
                  <p className="mt-1 text-sm text-slate-600">Estimated time: {bid.estimatedDuration}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{bid.message}</p>
                  {bid.status === "PENDING" && canManage ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <DecisionForm
                        action={acceptBidAction}
                        jobId={job.id}
                        bidId={bid.id}
                        label="Accept bid"
                        pendingLabel="Accepting..."
                      />
                      <DecisionForm
                        action={rejectBidAction}
                        jobId={job.id}
                        bidId={bid.id}
                        label="Reject bid"
                        pendingLabel="Rejecting..."
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {detail.canBid ? (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">Submit a bid</h2>
          <div className="mt-4 rounded-md border border-slate-200 bg-white p-6">
            <BidForm action={submitBidAction} jobId={job.id} />
          </div>
        </div>
      ) : null}

      {detail.needsProfile ? (
        <p className="mt-8 text-sm text-slate-700">
          <Link href="/contractor-profile/create" className="font-medium text-blue-700 hover:text-blue-800">
            Create your contractor profile
          </Link>{" "}
          before submitting a bid.
        </p>
      ) : null}

      {detail.myBid ? (
        <div className="mt-10 rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Your bid</h2>
          <div className="mt-2">
            <StatusBadge status={detail.myBid.status} />
          </div>
          <p className="mt-3 text-sm text-slate-800">{formatMoney(detail.myBid.amount)}</p>
          <p className="mt-1 text-sm text-slate-600">Estimated time: {detail.myBid.estimatedDuration}</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{detail.myBid.message}</p>
        </div>
      ) : null}

      {!session && (job.status === JobStatus.OPEN || job.status === JobStatus.BIDDING) ? (
        <p className="mt-8 text-sm">
          <Link href={`/login?callbackUrl=/jobs/${job.id}`} className="font-medium text-blue-700 hover:text-blue-800">
            Log in
          </Link>{" "}
          to submit a bid.
        </p>
      ) : null}
    </section>
  );
}
