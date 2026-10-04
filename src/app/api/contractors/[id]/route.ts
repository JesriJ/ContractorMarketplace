import { NextResponse } from "next/server";
import { getPublicContractor } from "@/lib/contractor-profiles";
import { getContractorReputation } from "@/lib/reviews";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const contractor = await getPublicContractor(id);
  if (!contractor) {
    return NextResponse.json({ error: "Contractor profile not found." }, { status: 404 });
  }

  const reputation = await getContractorReputation(id);
  return NextResponse.json({ contractor, ...reputation });
}
