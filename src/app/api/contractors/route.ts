import { NextResponse } from "next/server";
import { createContractorProfile, searchContractors } from "@/lib/contractor-profiles";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");

  try {
    const result = await searchContractors({
      trade: searchParams.get("trade") ?? undefined,
      city: searchParams.get("city") ?? undefined,
      state: searchParams.get("state") ?? undefined,
      page: Number.isFinite(page) ? page : 1,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unable to load contractors." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await createContractorProfile(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ profile: result.profile }, { status: 201 });
}
