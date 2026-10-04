const labels: Record<string, string> = {
  OPEN: "Open",
  BIDDING: "Bidding",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  PENDING_CONFIRMATION: "Awaiting confirmation",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  SUCCEEDED: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  DRAFT: "Draft",
  SENT: "Sent",
  DECLINED: "Declined",
  EXPIRED: "Expired",
};

export function StatusBadge({ status }: { status: string }) {
  const label = labels[status] ?? status;
  return (
    <span className="inline-flex items-center rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
      {label}
    </span>
  );
}
