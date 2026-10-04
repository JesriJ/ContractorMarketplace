import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authPages = new Set(["/login", "/register"]);
const protectedPages = ["/dashboard", "/messages", "/hire-requests"];
const customerOnlyPages = ["/jobs/create"];
const contractorOnlyPages = ["/contractor-profile"];

function matchesPath(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token && authPages.has(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const needsAuth =
    matchesPath(pathname, protectedPages) ||
    matchesPath(pathname, customerOnlyPages) ||
    matchesPath(pathname, contractorOnlyPages);

  if (!token && needsAuth) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && matchesPath(pathname, customerOnlyPages) && token.role !== "CUSTOMER") {
    const dashboardUrl = new URL("/dashboard", request.url);
    dashboardUrl.searchParams.set("notice", "customer-only");
    return NextResponse.redirect(dashboardUrl);
  }

  if (token && matchesPath(pathname, contractorOnlyPages) && token.role !== "CONTRACTOR") {
    const dashboardUrl = new URL("/dashboard", request.url);
    dashboardUrl.searchParams.set("notice", "contractor-only");
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/messages",
    "/messages/:path*",
    "/jobs/create/:path*",
    "/contractor-profile",
    "/contractor-profile/:path*",
    "/hire-requests",
    "/hire-requests/:path*",
    "/login",
    "/register",
  ],
};
