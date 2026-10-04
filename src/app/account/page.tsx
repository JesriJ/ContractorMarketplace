import Link from "next/link";
import { requireSession } from "@/lib/session";

export default async function AccountPage() {
  await requireSession();
  return <section className="mx-auto max-w-2xl px-4 py-12">
    <h1 className="text-2xl font-semibold">Account and privacy</h1>
    <p className="mt-2 text-sm text-slate-600">Manage a copy of your information or deactivate your account.</p>
    <div className="mt-8 space-y-6 rounded-md border bg-white p-6">
      <section><h2 className="font-semibold">Download your data</h2><p className="mt-1 text-sm text-slate-600">Exports your account, projects, messages, quotes, reviews, and consent history as JSON.</p><Link href="/api/account/export" className="mt-3 inline-block rounded border px-3 py-2 text-sm">Download JSON</Link></section>
      <section className="border-t pt-6"><h2 className="font-semibold">Deactivate and delete personal details</h2><p className="mt-1 text-sm text-slate-600">This signs you out and pseudonymizes your login. Agreement and audit records may be retained for legal and dispute purposes.</p><form action="/api/account/delete" method="post" className="mt-3"><button className="rounded bg-red-700 px-3 py-2 text-sm text-white">Deactivate account</button></form></section>
    </div>
  </section>;
}
