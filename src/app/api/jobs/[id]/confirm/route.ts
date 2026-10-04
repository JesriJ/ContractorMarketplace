import { NextResponse } from "next/server";
import { confirmJobCompletion } from "@/lib/jobs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await confirmJobCompletion(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ job: result.data });
}
