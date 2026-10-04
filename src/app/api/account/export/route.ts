import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const data = await prisma.user.findUnique({
    where: { id: session.user.id },
    omit: { password: true },
    include: {
      contractorProfile: true,
      jobs: { include: { bids: true, quotes: true, review: true } },
      messages: true,
      reviews: true,
      consents: true,
      auditEvents: true,
    },
  });
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="contractor-marketplace-data.json"',
      "cache-control": "no-store",
    },
  });
}
