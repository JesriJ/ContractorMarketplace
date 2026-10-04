import { legal } from "@/lib/legal";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 text-slate-700">
      <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">Effective and last updated: {legal.effectiveDate}</p>
      <div className="mt-8 space-y-6 leading-7 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
    </article>
  );
}
