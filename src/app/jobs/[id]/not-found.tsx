import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

export default function JobNotFound() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <EmptyState title="Job not found." description="This job does not exist, or it was removed." />
      <p className="mt-4 text-sm">
        <Link href="/jobs" className="font-medium text-blue-700 hover:text-blue-800">
          Back to jobs
        </Link>
      </p>
    </section>
  );
}
