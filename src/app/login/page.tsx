import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Log in | Contractor Marketplace",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Log in</h1>
      <p className="mt-2 text-sm text-slate-600">Use the email and password you registered with.</p>
      <div className="mt-8 rounded-md border border-slate-200 bg-white p-6">
        <Suspense fallback={<p className="text-sm text-slate-600">Loading...</p>}>
          <LoginForm />
        </Suspense>
      </div>
      <p className="mt-4 text-sm text-slate-600">
        Need an account?{" "}
        <Link href="/register" className="font-medium text-blue-700 hover:text-blue-800">
          Sign up
        </Link>
      </p>
    </section>
  );
}
