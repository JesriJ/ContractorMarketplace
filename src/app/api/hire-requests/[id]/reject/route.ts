import { NextResponse } from "next/server";
import { rejectHireRequest } from "@/lib/hire-requests";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await rejectHireRequest(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ request: result.data });
}
