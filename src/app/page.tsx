import Link from "next/link";
import { ContractorCard } from "@/components/ContractorCard";
import { EmptyState } from "@/components/EmptyState";
import { JobCard } from "@/components/JobCard";
import { searchContractors } from "@/lib/contractor-profiles";
import { searchJobs } from "@/lib/jobs";

const popularServices = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "Landscaping",
  "Painting",
  "Carpentry",
] as const;

export default async function HomePage() {
  let listed: Awaited<ReturnType<typeof searchContractors>>["contractors"] = [];
  let recentJobs: Awaited<ReturnType<typeof searchJobs>>["jobs"] = [];
  let contractorError = false;
  let jobError = false;

  try {
    const result = await searchContractors({ page: 1 });
    listed = result.contractors.slice(0, 6);
  } catch {
    contractorError = true;
  }

  try {
    const result = await searchJobs({ page: 1 });
    recentJobs = result.jobs.slice(0, 4);
  } catch {
    jobError = true;
  }
  return (
    <div>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Find the right contractor for the job.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Connect with local contractors, compare bids, communicate directly, and
            manage your project from one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contractors"
              className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
            >
              Find a Contractor
            </Link>
            <Link
              href="/jobs/create"
              className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Post a Job
            </Link>
          </div>

          <form
            action="/contractors"
            method="get"
            className="mt-10 grid max-w-3xl gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]"
          >
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                What service do you need?
              </span>
              <input
                type="search"
                name="trade"
                placeholder="Plumbing, electrical, landscaping..."
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Where?</span>
              <input
                type="search"
                name="city"
                placeholder="City"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
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
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-lg font-semibold text-slate-900">Popular services</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {popularServices.map((service) => (
            <li key={service}>
              <Link
                href={`/contractors?trade=${encodeURIComponent(service.toLowerCase())}`}
                className="block rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 hover:border-slate-300"
              >
                {service}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Listed contractors</h2>
          <Link href="/contractors" className="text-sm font-medium text-blue-700 hover:text-blue-800">
            View all
          </Link>
        </div>
        <div className="mt-4">
          {contractorError ? (
            <EmptyState
              title="Unable to load contractors"
              description="Confirm the database is running, then refresh this page."
            />
          ) : null}
          {!contractorError && listed.length === 0 ? (
            <EmptyState
              title="No contractors are listed yet."
              description="Published contractor profiles will show up here."
            />
          ) : null}
          {listed.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listed.map((contractor) => (
                <li key={contractor.id}>
                  <ContractorCard contractor={contractor} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Open jobs</h2>
          <Link href="/jobs" className="text-sm font-medium text-blue-700 hover:text-blue-800">
            View all
          </Link>
        </div>
        <div className="mt-4">
          {jobError ? (
            <EmptyState
              title="Unable to load jobs"
              description="Confirm the database is running, then refresh this page."
            />
          ) : null}
          {!jobError && recentJobs.length === 0 ? (
            <EmptyState title="No jobs posted yet." description="Open customer jobs will show up here." />
          ) : null}
          {recentJobs.length > 0 ? (
            <ul className="grid gap-4">
              {recentJobs.map((job) => (
                <li key={job.id}>
                  <JobCard job={job} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-lg font-semibold text-slate-900">How it works</h2>
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                For customers
              </h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
                <li>Post a job</li>
                <li>Compare bids</li>
                <li>Hire a contractor</li>
              </ol>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                For contractors
              </h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
                <li>Find jobs</li>
                <li>Submit a bid</li>
                <li>Get hired</li>
              </ol>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
