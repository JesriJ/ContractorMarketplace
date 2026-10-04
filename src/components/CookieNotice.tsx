"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(localStorage.getItem("essential-cookie-notice") !== "seen"), 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return <aside aria-label="Cookie notice" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-md border border-slate-300 bg-white p-4 shadow-lg">
    <p className="text-sm text-slate-700">We use only cookies necessary for sign-in, security, and core functionality. We do not use advertising cookies. <Link href="/cookies" className="text-blue-700 underline">Cookie notice</Link></p>
    <button onClick={() => { localStorage.setItem("essential-cookie-notice", "seen"); setVisible(false); }} className="mt-3 rounded border px-3 py-1.5 text-sm">Dismiss</button>
  </aside>;
}
