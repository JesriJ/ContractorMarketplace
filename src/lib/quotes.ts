import { JobStatus, QuoteStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const quoteSchema = z.object({
  scope: z.string().trim().min(10).max(5000),
  laborAmount: z.coerce.number().min(0).max(10_000_000),
  materialsAmount: z.coerce.number().min(0).max(10_000_000),
  taxAmount: z.coerce.number().min(0).max(10_000_000),
  depositTerms: z.string().trim().max(1000).optional(),
  milestoneTerms: z.string().trim().max(2000).optional(),
  schedule: z.string().trim().min(3).max(1000),
  cancellationTerms: z.string().trim().min(3).max(2000),
  expiresAt: z.coerce.date().refine((date) => date > new Date(), "Expiration must be in the future."),
});

export type QuoteResult = { ok: true } | { ok: false; error: string };

async function context(jobId: string) {
  const session = await getSession();
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, contractorProfile: { select: { id: true } } },
  });
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, customerId: true, contractorId: true, status: true },
  });
  if (!user || !job) return null;
  const participant = user.id === job.customerId || user.contractorProfile?.id === job.contractorId;
  return participant ? { user, job } : null;
}

export async function getQuotes(jobId: string) {
  const access = await context(jobId);
  if (!access) return [];
  return prisma.quote.findMany({ where: { jobId }, orderBy: { version: "desc" } });
}

export async function sendQuote(jobId: string, input: unknown): Promise<QuoteResult> {
  const access = await context(jobId);
  if (!access || access.user.role !== UserRole.CONTRACTOR || !access.user.contractorProfile) {
    return { ok: false, error: "Only the assigned contractor can send a quote." };
  }
  if (access.job.contractorId !== access.user.contractorProfile.id || access.job.status === JobStatus.CANCELLED) {
    return { ok: false, error: "This job cannot receive a quote." };
  }
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid quote." };
  const total = parsed.data.laborAmount + parsed.data.materialsAmount + parsed.data.taxAmount;
  if (total <= 0) return { ok: false, error: "The quote total must be greater than zero." };

  await prisma.$transaction(async (tx) => {
    await tx.quote.updateMany({
      where: { jobId, status: QuoteStatus.SENT },
      data: { status: QuoteStatus.EXPIRED },
    });
    const latest = await tx.quote.findFirst({ where: { jobId }, orderBy: { version: "desc" }, select: { version: true } });
    const quote = await tx.quote.create({
      data: {
        jobId,
        contractorId: access.user.contractorProfile!.id,
        authorId: access.user.id,
        version: (latest?.version ?? 0) + 1,
        ...parsed.data,
        totalAmount: total,
      },
    });
    await tx.auditEvent.create({
      data: { userId: access.user.id, action: "QUOTE_SENT", entityType: "Quote", entityId: quote.id },
    });
  });
  return { ok: true };
}

export async function decideQuote(quoteId: string, decision: "accept" | "decline"): Promise<QuoteResult> {
  const session = await getSession();
  if (!session?.user) return { ok: false, error: "Not authenticated." };
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { job: true } });
  if (!quote || quote.job.customerId !== session.user.id) return { ok: false, error: "Unauthorized." };
  if (quote.status !== QuoteStatus.SENT || quote.expiresAt <= new Date()) {
    return { ok: false, error: "This quote is no longer available." };
  }
  const accepted = decision === "accept";
  await prisma.$transaction([
    prisma.quote.update({
      where: { id: quote.id },
      data: accepted
        ? { status: QuoteStatus.ACCEPTED, acceptedAt: new Date(), acceptedById: session.user.id }
        : { status: QuoteStatus.DECLINED, declinedAt: new Date() },
    }),
    prisma.auditEvent.create({
      data: {
        userId: session.user.id,
        action: accepted ? "QUOTE_ACCEPTED" : "QUOTE_DECLINED",
        entityType: "Quote",
        entityId: quote.id,
        metadata: accepted ? { version: quote.version, total: quote.totalAmount.toString() } : undefined,
      },
    }),
  ]);
  return { ok: true };
}

export async function markPaidOutside(quoteId: string): Promise<QuoteResult> {
  const session = await getSession();
  if (!session?.user) return { ok: false, error: "Not authenticated." };
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { job: { select: { customerId: true, contractorId: true } } },
  });
  const profile = await prisma.contractorProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  const participant = quote && (quote.job.customerId === session.user.id || quote.job.contractorId === profile?.id);
  if (!quote || !participant || quote.status !== QuoteStatus.ACCEPTED) return { ok: false, error: "Unauthorized." };
  await prisma.quote.update({
    where: { id: quote.id },
    data: { paidOutsideAt: new Date(), paidOutsideById: session.user.id },
  });
  return { ok: true };
}
