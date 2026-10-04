import { NextResponse } from "next/server";
import { trackRecommendationEvent } from "@/lib/recommendations";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const record = body as {
    eventType?: string;
    jobId?: string;
    contractorId?: string;
  };
  if (!record.eventType?.trim()) {
    return NextResponse.json({ error: "eventType is required." }, { status: 400 });
  }

  await trackRecommendationEvent({
    eventType: record.eventType.trim().slice(0, 80),
    jobId: record.jobId,
    contractorId: record.contractorId,
  });
  return NextResponse.json({ ok: true });
}
