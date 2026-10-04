import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-3 text-sm text-slate-700">That address is not part of Contractor Marketplace.</p>
      <p className="mt-4 text-sm">
        <Link href="/" className="font-medium text-blue-700 hover:text-blue-800">
          Back to home
        </Link>
      </p>
    </section>
  );
}
