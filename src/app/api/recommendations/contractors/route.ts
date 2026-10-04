import { NextResponse } from "next/server";
import { getRecommendedContractorsForJob, trackRecommendationEvent } from "@/lib/recommendations";

export async function GET(request: Request) {
  const jobId = new URL(request.url).searchParams.get("jobId")?.trim() ?? "";
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required." }, { status: 400 });
  }
  const result = await getRecommendedContractorsForJob(jobId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  await trackRecommendationEvent({
    eventType: "view_contractor_recommendations",
    jobId,
    metadata: { count: result.recommendations.length },
  });
  return NextResponse.json({ recommendations: result.recommendations });
}
