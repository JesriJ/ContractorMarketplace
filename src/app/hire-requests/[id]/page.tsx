import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HireRequestList } from "@/components/HireRequestList";
import { getHireRequestForCurrentUser } from "@/lib/hire-requests";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Service request | Contractor Marketplace",
  robots: { index: false, follow: false },
};

type HireRequestPageProps = {
  params: Promise<{ id: string }>;
};

export default async function HireRequestPage({ params }: HireRequestPageProps) {
  const session = await requireSession();
  const { id } = await params;
  const result = await getHireRequestForCurrentUser(id);

  if (!result.ok) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-slate-500">
        <Link href="/hire-requests" className="hover:text-slate-800">
          Service requests
        </Link>
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Service request</h1>
      <div className="mt-6">
        <HireRequestList requests={[result.data]} role={session.user.role} />
      </div>
    </section>
  );
}
