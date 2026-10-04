import { Prisma } from "@prisma/client";
import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { POLICY_VERSION } from "@/lib/legal";
import { rateLimit } from "@/lib/rate-limit";

const PASSWORD_SALT_ROUNDS = 12;

export async function POST(request: Request) {
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`register:${client}`, 5, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many registration attempts. Try again later." }, { status: 429 });
  }
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Invalid registration details." },
      { status: 400 },
    );
  }

  const { email, password, role } = parsed.data;
  const passwordHash = await hash(password, PASSWORD_SALT_ROUNDS);

  try {
    const forwarded = client === "unknown" ? undefined : client;
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role,
        consents: {
          create: {
            termsVersion: POLICY_VERSION,
            privacyVersion: POLICY_VERSION,
            ipAddress: forwarded?.slice(0, 64),
            userAgent: request.headers.get("user-agent")?.slice(0, 500),
          },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}
