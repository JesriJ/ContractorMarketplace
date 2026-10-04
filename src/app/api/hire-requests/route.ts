import { NextResponse } from "next/server";
import { listHireRequestsForCurrentUser } from "@/lib/hire-requests";

export async function GET() {
  const result = await listHireRequestsForCurrentUser();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
