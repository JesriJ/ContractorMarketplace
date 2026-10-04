import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getContractorProfileForUser,
  updateContractorProfile,
} from "@/lib/contractor-profiles";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const profile = await getContractorProfileForUser(session.user.id);
  if (!profile) {
    return NextResponse.json({ error: "Contractor profile not found." }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await updateContractorProfile(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ profile: result.profile });
}
