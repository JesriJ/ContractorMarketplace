"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
      role: String(formData.get("role") ?? ""),
      acceptLegal: formData.get("acceptLegal") === "on",
    };

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Unable to create account.");
        return;
      }

      const result = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
        router.refresh();
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to create account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Confirm password</span>
        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Account type</legend>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="radio" name="role" value={UserRole.CUSTOMER} defaultChecked required />
          Customer — I want to hire contractors
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="radio" name="role" value={UserRole.CONTRACTOR} required />
          Contractor — I provide services
        </label>
      </fieldset>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" name="acceptLegal" required className="mt-1" />
        <span>I am at least 18 and agree to the <a href="/terms" target="_blank" className="text-blue-700 underline">Terms</a> and acknowledge the <a href="/privacy" target="_blank" className="text-blue-700 underline">Privacy Policy</a>.</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
