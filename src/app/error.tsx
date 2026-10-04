"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="mt-3 text-sm text-slate-700">This page could not be loaded. Try again.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
      >
        Try again
      </button>
    </section>
  );
}
