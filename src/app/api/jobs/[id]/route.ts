import { NextResponse } from "next/server";
import { cancelJob, getJobDetail, updateJob } from "@/lib/jobs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const detail = await getJobDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await updateJob(id, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ job: result.data });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: { action?: string } = {};
  try {
    body = (await request.json()) as { action?: string };
  } catch {
    body = {};
  }

  if (body.action !== "cancel") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const result = await cancelJob(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ job: result.data });
}
