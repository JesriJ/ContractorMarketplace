import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { JobCard } from "@/components/JobCard";
import { searchJobs } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Find Jobs | Contractor Marketplace",
  description: "Browse open jobs posted by customers.",
};

type JobsPageProps = {
  searchParams: Promise<{ keyword?: string; location?: string; page?: string }>;
};

function jobsHref(input: { keyword?: string; location?: string; page?: number }) {
  const params = new URLSearchParams();
  if (input.keyword) params.set("keyword", input.keyword);
  if (input.location) params.set("location", input.location);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query ? `/jobs?${query}` : "/jobs";
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const params = await searchParams;
  const keyword = params.keyword?.trim() ?? "";
  const location = params.location?.trim() ?? "";
  const parsedPage = Number(params.page ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const hasQuery = Boolean(keyword || location);

  let result: Awaited<ReturnType<typeof searchJobs>> | null = null;
  let loadError = false;
  try {
    result = await searchJobs({ keyword, location, page });
  } catch {
    loadError = true;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Find jobs</h1>
      <p className="mt-2 text-sm text-slate-600">Open jobs that are still accepting bids.</p>

      <form action="/jobs" method="get" className="mt-6 grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[1fr_1fr_auto]">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Keyword</span>
          <input
            type="search"
            name="keyword"
            defaultValue={keyword}
            placeholder="Sink, fence, painting..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Location</span>
          <input
            type="search"
            name="location"
            defaultValue={location}
            placeholder="City"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <div className="flex items-end">
          <button type="submit" className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 md:w-auto">
            Search
          </button>
        </div>
      </form>

      <div className="mt-8">
        {loadError ? (
          <EmptyState
            title="Unable to load jobs"
            description="Confirm the database is running, then try again."
          />
        ) : null}
        {result && result.total === 0 ? (
          <EmptyState
            title={hasQuery ? "No jobs found." : "No jobs posted yet."}
            description={
              hasQuery
                ? "Try another keyword or location."
                : "Customer job posts will appear here while they are open for bids."
            }
          />
        ) : null}
        {result && result.jobs.length > 0 ? (
          <>
            <p className="text-sm text-slate-600">
              {result.total} {result.total === 1 ? "job" : "jobs"}
            </p>
            <ul className="mt-4 grid gap-4">
              {result.jobs.map((job) => (
                <li key={job.id}>
                  <JobCard job={job} />
                </li>
              ))}
            </ul>
            {result.pageCount > 1 ? (
              <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Pagination">
                {page > 1 ? (
                  <Link href={jobsHref({ keyword, location, page: page - 1 })} className="font-medium text-blue-700 hover:text-blue-800">
                    Previous
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-slate-600">
                  Page {page} of {result.pageCount}
                </span>
                {page < result.pageCount ? (
                  <Link href={jobsHref({ keyword, location, page: page + 1 })} className="font-medium text-blue-700 hover:text-blue-800">
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
