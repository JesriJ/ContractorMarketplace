import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-600">
        <p>Contractor Marketplace connects independent customers and contractors. Payments happen outside the platform.</p>
        <nav aria-label="Legal" className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/refunds-cancellations">Payment & cancellation</Link>
          <Link href="/marketplace-disclosures">Disclosures</Link>
          <Link href="/accessibility">Accessibility</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/account">Account</Link>
        </nav>
        <p className="mt-4 text-xs text-slate-500">© {new Date().getFullYear()} Contractor Marketplace. All rights reserved.</p>
      </div>
    </footer>
  );
}
