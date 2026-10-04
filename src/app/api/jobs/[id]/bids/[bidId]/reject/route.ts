import { NextResponse } from "next/server";
import { rejectBid } from "@/lib/jobs";

type RouteContext = {
  params: Promise<{ id: string; bidId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id, bidId } = await context.params;
  const result = await rejectBid(id, bidId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ job: result.data });
}
