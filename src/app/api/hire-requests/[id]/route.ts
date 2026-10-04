import { NextResponse } from "next/server";
import { cancelHireRequest, getHireRequestForCurrentUser } from "@/lib/hire-requests";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await getHireRequestForCurrentUser(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ request: result.data });
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

  const result = await cancelHireRequest(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ request: result.data });
}
