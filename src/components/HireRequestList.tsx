import Link from "next/link";
import { UserRole } from "@prisma/client";
import { RequestActionForm } from "@/components/RequestActionForm";
import { StatusBadge } from "@/components/StatusBadge";
import {
  acceptHireRequestAction,
  cancelHireRequestAction,
  rejectHireRequestAction,
} from "@/lib/actions/hire-request";
import { formatPostedDate } from "@/lib/format";
import type { HireRequestView } from "@/lib/hire-requests";

export function HireRequestList({
  requests,
  role,
}: {
  requests: HireRequestView[];
  role: UserRole;
}) {
  const isContractor = role === UserRole.CONTRACTOR;

  return (
    <ul className="mt-3 space-y-4">
      {requests.map((request) => (
        <li key={request.id} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              {isContractor ? (
                <p className="text-sm font-medium text-slate-900">{request.customer.email}</p>
              ) : (
                <Link
                  href={`/contractors/${request.contractor.id}`}
                  className="text-sm font-medium text-slate-900 hover:text-blue-800"
                >
                  {request.contractor.companyName}
                </Link>
              )}
              <p className="mt-1 text-sm text-slate-600">{formatPostedDate(request.createdAt)}</p>
            </div>
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{request.message}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href={`/hire-requests/${request.id}`} className="text-sm font-medium text-blue-700 hover:text-blue-800">
              View request
            </Link>
            {request.jobId ? (
              <Link href={`/jobs/${request.jobId}`} className="text-sm font-medium text-blue-700 hover:text-blue-800">
                View job
              </Link>
            ) : null}
            {request.status === "PENDING" && isContractor ? (
              <>
                <RequestActionForm
                  action={acceptHireRequestAction}
                  requestId={request.id}
                  label="Accept"
                  pendingLabel="Accepting..."
                />
                <RequestActionForm
                  action={rejectHireRequestAction}
                  requestId={request.id}
                  label="Reject"
                  pendingLabel="Rejecting..."
                />
              </>
            ) : null}
            {request.status === "PENDING" && !isContractor ? (
              <RequestActionForm
                action={cancelHireRequestAction}
                requestId={request.id}
                label="Cancel request"
                pendingLabel="Cancelling..."
              />
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
