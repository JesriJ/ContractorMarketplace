import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const id = session.user.id;
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        email: `deleted-${id}@invalid.local`,
        password: randomBytes(48).toString("hex"),
        deactivatedAt: new Date(),
      },
    }),
    prisma.auditEvent.create({ data: { userId: id, action: "ACCOUNT_DEACTIVATED", entityType: "User", entityId: id } }),
  ]);
  return NextResponse.redirect(new URL("/api/auth/signout?callbackUrl=/", request.url), 303);
}
