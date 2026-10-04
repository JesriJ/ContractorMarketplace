import type { Metadata } from "next";
import Link from "next/link";
import { ContractorCard } from "@/components/ContractorCard";
import { EmptyState } from "@/components/EmptyState";
import { searchContractors } from "@/lib/contractor-profiles";
import { US_STATES } from "@/lib/us-states";

export const metadata: Metadata = {
  title: "Find Contractors | Contractor Marketplace",
  description: "Search local contractors by trade and location.",
};

type ContractorsPageProps = {
  searchParams: Promise<{ trade?: string; city?: string; state?: string; page?: string }>;
};

function directoryHref(input: { trade?: string; city?: string; state?: string; page?: number }) {
  const params = new URLSearchParams();
  if (input.trade) params.set("trade", input.trade);
  if (input.city) params.set("city", input.city);
  if (input.state) params.set("state", input.state);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query ? `/contractors?${query}` : "/contractors";
}

export default async function ContractorsPage({ searchParams }: ContractorsPageProps) {
  const params = await searchParams;
  const trade = params.trade?.trim() ?? "";
  const city = params.city?.trim() ?? "";
  const state = params.state?.trim().toUpperCase() ?? "";
  const parsedPage = Number(params.page ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const hasQuery = Boolean(trade || city || state);

  let result: Awaited<ReturnType<typeof searchContractors>> | null = null;
  let loadError = false;

  try {
    result = await searchContractors({ trade, city, state, page });
  } catch {
    loadError = true;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Find a contractor</h1>
      <p className="mt-2 text-sm text-slate-600">Search by trade and location.</p>

      <form
        action="/contractors"
        method="get"
        className="mt-6 grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[1fr_1fr_12rem_auto]"
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Trade</span>
          <input
            type="search"
            name="trade"
            defaultValue={trade}
            placeholder="Plumbing, electrical..."
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">City</span>
          <input
            type="search"
            name="city"
            defaultValue={city}
            placeholder="City or state"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">State</span>
          <select
            name="state"
            defaultValue={state}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
          >
            <option value="">Any state</option>
            {US_STATES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.code}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 md:w-auto"
          >
            Search
          </button>
        </div>
      </form>

      <div className="mt-8">
        {loadError ? (
          <EmptyState
            title="Unable to load contractors"
            description="The directory could not be loaded. Confirm the database is running, then try again."
          />
        ) : null}

        {result && result.total === 0 ? (
          <EmptyState
            title={hasQuery ? "No contractors found." : "No contractors are listed yet."}
            description={
              hasQuery
                ? "Try searching for another trade or location."
                : "Contractor profiles will show up here after contractors publish them."
            }
          />
        ) : null}

        {result && result.contractors.length > 0 ? (
          <>
            <p className="text-sm text-slate-600">
              {result.total} {result.total === 1 ? "contractor" : "contractors"}
            </p>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.contractors.map((contractor) => (
                <li key={contractor.id}>
                  <ContractorCard contractor={contractor} />
                </li>
              ))}
            </ul>
            {result.pageCount > 1 ? (
              <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Pagination">
                {page > 1 ? (
                  <Link
                    href={directoryHref({ trade, city, state, page: page - 1 })}
                    className="font-medium text-blue-700 hover:text-blue-800"
                  >
                    Previous
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-slate-600">
                  Page {page} of {result.pageCount}
                </span>
                {page < result.pageCount ? (
                  <Link
                    href={directoryHref({ trade, city, state, page: page + 1 })}
                    className="font-medium text-blue-700 hover:text-blue-800"
                  >
                    Next
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
