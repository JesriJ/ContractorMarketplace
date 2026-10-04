import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { HireRequestList } from "@/components/HireRequestList";
import { listHireRequestsForCurrentUser } from "@/lib/hire-requests";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Service requests | Contractor Marketplace",
  robots: { index: false, follow: false },
};

export default async function HireRequestsPage() {
  await requireSession();
  const result = await listHireRequestsForCurrentUser();

  if (!result.ok) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState title="Unable to load requests" description={result.error} />
      </section>
    );
  }

  const isContractor = result.data.role === "CONTRACTOR";

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        {isContractor ? "Incoming requests" : "Your service requests"}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {isContractor
          ? "Accepting a request creates an assigned job with that customer."
          : "These are requests you sent to specific contractors."}
      </p>
      {result.data.requests.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No service requests."
            description={
              isContractor
                ? "Requests from customers will appear here."
                : "Request service from a contractor profile to start one."
            }
          />
        </div>
      ) : (
        <HireRequestList requests={result.data.requests} role={result.data.role} />
      )}
    </section>
  );
}
