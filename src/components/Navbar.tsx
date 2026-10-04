import Link from "next/link";
import { UserRole } from "@prisma/client";
import { LogoutButton } from "@/components/LogoutButton";
import { getSession } from "@/lib/session";

export async function Navbar() {
  const session = await getSession();
  const isCustomer = session?.user.role === UserRole.CUSTOMER;

  const navLinks = [
    { href: "/contractors", label: "Find Contractors" },
    { href: "/jobs", label: "Find Jobs" },
    ...(isCustomer || !session ? [{ href: "/jobs/create", label: "Post a Job" }] : []),
    ...(session?.user.role === UserRole.CONTRACTOR
      ? [{ href: "/contractor-profile", label: "Profile" }]
      : []),
    ...(session ? [{ href: "/hire-requests", label: "Requests" }] : []),
    ...(session ? [{ href: "/messages", label: "Messages" }] : []),
  ];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-base font-semibold tracking-tight text-slate-900">
          Contractor Marketplace
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-slate-900">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {session ? (
            <>
              <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
                Dashboard
              </Link>
              <Link href="/account" className="text-slate-600 hover:text-slate-900">
                Account
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-slate-900">
                Log In
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
      <nav
        className="flex gap-4 overflow-x-auto border-t border-slate-100 px-4 py-2 text-sm text-slate-600 md:hidden"
        aria-label="Primary mobile"
      >
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href} className="whitespace-nowrap hover:text-slate-900">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
