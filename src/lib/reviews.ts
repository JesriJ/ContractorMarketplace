import { JobStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { reviewSchema, reviewValidationError } from "@/lib/validations/review";

class ReviewError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type ReviewResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

export type RatingSummary = {
  ratingAverage: number | null;
  reviewCount: number;
};

export type PublicReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  jobTitle: string;
};

export type PastWorkItem = {
  id: string;
  title: string;
  location: string;
};

export const REVIEW_PAGE_SIZE = 10;

export type ContractorReputation = RatingSummary & {
  reviews: PublicReview[];
  reviewPage: number;
  reviewPageCount: number;
  pastWork: PastWorkItem[];
};

export async function ratingSummaries(contractorIds: string[]) {
  const summaries = new Map<string, RatingSummary>();
  if (contractorIds.length === 0) {
    return summaries;
  }

  const grouped = await prisma.review.groupBy({
    by: ["contractorId"],
    where: { contractorId: { in: contractorIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  for (const row of grouped) {
    summaries.set(row.contractorId, {
      ratingAverage: row._avg.rating,
      reviewCount: row._count.rating,
    });
  }

  return summaries;
}

export async function getContractorReputation(
  contractorId: string,
  requestedPage = 1,
): Promise<ContractorReputation> {
  const summary = await ratingSummaries([contractorId]);
  const reviewCount = summary.get(contractorId)?.reviewCount ?? 0;
  const reviewPageCount = Math.max(1, Math.ceil(reviewCount / REVIEW_PAGE_SIZE));
  const reviewPage = Math.min(requestedPage > 0 ? requestedPage : 1, reviewPageCount);
  const [reviews, pastWork] = await Promise.all([
    prisma.review.findMany({
      where: { contractorId },
      orderBy: { createdAt: "desc" },
      skip: (reviewPage - 1) * REVIEW_PAGE_SIZE,
      take: REVIEW_PAGE_SIZE,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        job: { select: { title: true } },
      },
    }),
    prisma.job.findMany({
      where: { contractorId, status: JobStatus.COMPLETED },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, title: true, location: true },
    }),
  ]);

  return {
    ratingAverage: summary.get(contractorId)?.ratingAverage ?? null,
    reviewCount,
    reviewPage,
    reviewPageCount,
    reviews: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      jobTitle: review.job.title,
    })),
    pastWork,
  };
}

export async function createReview(jobId: string, input: unknown): Promise<ReviewResult<{ id: string; rating: number; comment: string }>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      return { ok: false, status: 401, error: "Not authenticated." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });
    if (!user || user.role !== UserRole.CUSTOMER) {
      return { ok: false, status: 403, error: "Unauthorized." };
    }

    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, status: 400, error: reviewValidationError(parsed.error) };
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, customerId: true, contractorId: true, status: true },
    });
    if (!job) {
      return { ok: false, status: 404, error: "Job not found." };
    }
    if (job.customerId !== user.id) {
      return { ok: false, status: 403, error: "Unauthorized." };
    }
    if (!job.contractorId || job.status !== JobStatus.COMPLETED) {
      return { ok: false, status: 400, error: "Reviews are available after the job is completed." };
    }

    try {
      const review = await prisma.review.create({
        data: {
          jobId: job.id,
          customerId: user.id,
          contractorId: job.contractorId,
          rating: parsed.data.rating,
          comment: parsed.data.comment,
        },
        select: { id: true, rating: true, comment: true },
      });
      return { ok: true, data: review };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { ok: false, status: 409, error: "You already reviewed this job." };
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof ReviewError) {
      return { ok: false, status: error.status, error: error.message };
    }
    return { ok: false, status: 500, error: "Unable to save review." };
  }
}
