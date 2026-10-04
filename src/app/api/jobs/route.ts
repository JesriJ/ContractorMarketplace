import { NextResponse } from "next/server";
import { createJob, searchJobs } from "@/lib/jobs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");

  try {
    const result = await searchJobs({
      keyword: searchParams.get("keyword") ?? undefined,
      location: searchParams.get("location") ?? undefined,
      page: Number.isFinite(page) ? page : 1,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unable to load jobs." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await createJob(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ job: result.data }, { status: 201 });
}
