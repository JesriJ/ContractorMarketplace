import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/RegisterForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sign up | Contractor Marketplace",
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create an account</h1>
      <p className="mt-2 text-sm text-slate-600">
        Choose whether you are hiring help or offering services. This cannot be changed from the
        browser after you register.
      </p>
      <div className="mt-8 rounded-md border border-slate-200 bg-white p-6">
        <RegisterForm />
      </div>
      <p className="mt-4 text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-blue-700 hover:text-blue-800">
          Log in
        </Link>
      </p>
    </section>
  );
}
