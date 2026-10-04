import { NextResponse } from "next/server";
import { getRecommendedJobsForContractor, trackRecommendationEvent } from "@/lib/recommendations";

export async function GET() {
  const result = await getRecommendedJobsForContractor();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  await trackRecommendationEvent({
    eventType: "view_job_recommendations",
    metadata: { count: result.recommendations.length },
  });
  return NextResponse.json({ recommendations: result.recommendations });
}
