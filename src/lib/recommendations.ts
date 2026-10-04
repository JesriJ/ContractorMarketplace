import { ExtractionStatus, JobStatus, Prisma, UserRole } from "@prisma/client";
import { extractJobRequirements } from "@/lib/ai/extract-job-requirements";
import { embedGeminiText } from "@/lib/ai/gemini";
import {
  inferCityFromLocation,
  inferStateFromLocation,
  passesHardFilters,
  scoreMatch,
} from "@/lib/ai/matching";
import { getCachedJson, setCachedJson } from "@/lib/recommendation-cache";
import { prisma } from "@/lib/prisma";
import { ratingSummaries } from "@/lib/reviews";
import { getSession } from "@/lib/session";

const TOP_N = 10;
const CACHE_TTL_MS = 60_000;

export type RecommendedJob = {
  jobId: string;
  title: string;
  location: string;
  budget: string | null;
  status: JobStatus;
  matchScore: number;
  reasons: string[];
  warnings: string[];
  breakdown: Record<string, number>;
};

export type RecommendedContractor = {
  contractorId: string;
  companyName: string;
  trade: string;
  matchScore: number;
  ratingAverage: number | null;
  completedJobs: number;
  reasons: string[];
  warnings: string[];
  breakdown: Record<string, number>;
  hourlyRate: string;
  city: string;
  state: string;
};

function contractorEmbeddingText(profile: {
  trade: string;
  bio: string;
  skills: string[];
  serviceCategories: string[];
  city: string;
  state: string;
  yearsExperience: number;
}) {
  return [
    profile.trade,
    profile.skills.join(", "),
    profile.serviceCategories.join(", "),
    profile.bio.slice(0, 1200),
    `${profile.city}, ${profile.state}`,
    `${profile.yearsExperience} years experience`,
  ].join("\n");
}

function jobEmbeddingText(input: {
  title: string;
  description: string;
  requiredSkills: string[];
  projectType: string | null;
  location: string;
}) {
  return [
    input.title,
    input.projectType ?? "",
    input.requiredSkills.join(", "),
    input.description.slice(0, 1500),
    input.location,
  ].join("\n");
}

export async function refreshContractorEmbedding(profileId: string) {
  const profile = await prisma.contractorProfile.findUnique({ where: { id: profileId } });
  if (!profile) return;
  const embedding = await embedGeminiText(contractorEmbeddingText(profile));
  if (embedding.length === 0) return;
  await prisma.contractorProfile.update({
    where: { id: profileId },
    data: { embedding },
  });
}

export async function extractAndStoreJobRequirements(jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      description: true,
      budget: true,
      location: true,
      requiredSkills: true,
      projectType: true,
      experienceLevel: true,
      availabilityNeeded: true,
    },
  });
  if (!job) return;

  await prisma.jobRequirements.upsert({
    where: { jobId },
    create: { jobId, extractionStatus: ExtractionStatus.PENDING },
    update: { extractionStatus: ExtractionStatus.PENDING },
  });

  const budget = job.budget ? Number(job.budget.toString()) : null;
  const extracted = await extractJobRequirements({
    title: job.title,
    description: job.description,
    budget,
    location: job.location,
  });

  const requiredSkills =
    job.requiredSkills.length > 0 ? job.requiredSkills : extracted.data.skills;
  const projectType = job.projectType ?? extracted.data.projectType ?? null;
  const experienceLevel = job.experienceLevel ?? extracted.data.experienceLevel ?? "any";
  const availabilityHint = job.availabilityNeeded ?? extracted.data.availability ?? null;

  const embedding = await embedGeminiText(
    jobEmbeddingText({
      title: job.title,
      description: job.description,
      requiredSkills,
      projectType,
      location: job.location,
    }),
  );

  await prisma.jobRequirements.update({
    where: { jobId },
    data: {
      requiredSkills,
      preferredSkills: extracted.data.preferredSkills,
      projectType,
      experienceLevel,
      budgetMin: extracted.data.budgetMin,
      budgetMax: extracted.data.budgetMax ?? budget,
      locationText: job.location,
      availabilityHint,
      rawExtraction: {
        source: extracted.source,
        structuredFromForm: {
          requiredSkills: job.requiredSkills,
          projectType: job.projectType,
          experienceLevel: job.experienceLevel,
          availabilityNeeded: job.availabilityNeeded,
        },
        ai: extracted.raw,
      } as Prisma.InputJsonValue,
      embedding,
      extractedAt: new Date(),
      extractionStatus:
        requiredSkills.length > 0 || extracted.source === "gemini"
          ? ExtractionStatus.READY
          : ExtractionStatus.FAILED,
    },
  });

  await recomputeRecommendationsForJob(jobId);
}

async function loadRequirements(jobId: string) {
  let requirements = await prisma.jobRequirements.findUnique({ where: { jobId } });
  if (!requirements || requirements.extractionStatus === ExtractionStatus.PENDING) {
    await extractAndStoreJobRequirements(jobId);
    requirements = await prisma.jobRequirements.findUnique({ where: { jobId } });
  }
  return requirements;
}

export async function recomputeRecommendationsForJob(jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { requirements: true },
  });
  if (!job || (job.status !== JobStatus.OPEN && job.status !== JobStatus.BIDDING)) {
    await prisma.jobRecommendation.deleteMany({ where: { jobId } });
    return;
  }

  const requirements = job.requirements ?? (await loadRequirements(jobId));
  if (!requirements) return;

  const jobState = job.state ?? inferStateFromLocation(job.location);
  const jobCity = job.city ?? inferCityFromLocation(job.location);
  const contractors = await prisma.contractorProfile.findMany({
    select: {
      id: true,
      trade: true,
      bio: true,
      skills: true,
      serviceCategories: true,
      yearsExperience: true,
      city: true,
      state: true,
      serviceRadiusMiles: true,
      availability: true,
      availabilityNotes: true,
      hourlyRate: true,
      embedding: true,
    },
  });

  const ratings = await ratingSummaries(contractors.map((row) => row.id));
  const completedCounts = await prisma.job.groupBy({
    by: ["contractorId"],
    where: { status: JobStatus.COMPLETED, contractorId: { in: contractors.map((row) => row.id) } },
    _count: { _all: true },
  });
  const completedMap = new Map(
    completedCounts.map((row) => [row.contractorId!, row._count._all]),
  );

  const computedAt = new Date();
  const payloads: Prisma.JobRecommendationCreateManyInput[] = [];

  for (const contractor of contractors) {
    const sameState = Boolean(
      jobState && contractor.state.toUpperCase() === jobState.toUpperCase(),
    );
    const sameCity = Boolean(
      jobCity &&
        contractor.city.trim().toLowerCase() === jobCity.trim().toLowerCase() &&
        sameState,
    );
    if (
      !passesHardFilters({
        jobStatus: job.status,
        sameState,
        sameCity,
        contractorRadiusMiles: contractor.serviceRadiusMiles,
      })
    ) {
      continue;
    }

    const rating = ratings.get(contractor.id)?.ratingAverage ?? null;
    const result = scoreMatch({
      requiredSkills: requirements.requiredSkills,
      preferredSkills: requirements.preferredSkills,
      experienceLevel: requirements.experienceLevel,
      availabilityHint: requirements.availabilityHint,
      budgetMin: requirements.budgetMin ? Number(requirements.budgetMin.toString()) : null,
      budgetMax: requirements.budgetMax ? Number(requirements.budgetMax.toString()) : null,
      jobLocation: job.location,
      jobCity,
      jobStateHint: jobState,
      jobEmbedding: requirements.embedding,
      contractorSkills: contractor.skills,
      contractorCategories: contractor.serviceCategories,
      contractorTrade: contractor.trade,
      contractorYears: contractor.yearsExperience,
      contractorCity: contractor.city,
      contractorState: contractor.state,
      contractorRadiusMiles: contractor.serviceRadiusMiles,
      contractorAvailability: contractor.availability,
      contractorAvailabilityNotes: contractor.availabilityNotes,
      contractorHourlyRate: Number(contractor.hourlyRate.toString()),
      contractorRating: rating,
      contractorEmbedding: contractor.embedding,
      sameState,
      sameCity,
    });

    payloads.push({
      jobId,
      contractorId: contractor.id,
      score: result.score,
      breakdown: result.breakdown,
      reasons: [...result.reasons, ...result.warnings.map((warning) => `⚠ ${warning}`)],
      computedAt,
    });
  }

  payloads.sort((a, b) => b.score - a.score);
  const top = payloads.slice(0, 50);

  await prisma.$transaction([
    prisma.jobRecommendation.deleteMany({ where: { jobId } }),
    ...(top.length > 0
      ? [
          prisma.jobRecommendation.createMany({
            data: top.map((row) => ({
              ...row,
              breakdown: row.breakdown as Prisma.InputJsonValue,
              reasons: row.reasons as Prisma.InputJsonValue,
            })),
          }),
        ]
      : []),
  ]);

  await invalidateRecommendationCaches(jobId);
  void completedMap;
}

async function invalidateRecommendationCaches(jobId: string) {
  // Cache keys are short-lived; job-specific keys cleared by overwrite on next read.
  void jobId;
}

export async function getRecommendedJobsForContractor(limit = TOP_N): Promise<
  | { ok: true; recommendations: RecommendedJob[] }
  | { ok: false; status: number; error: string }
> {
  const session = await getSession();
  if (!session?.user) return { ok: false, status: 401, error: "Not authenticated." };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, contractorProfile: { select: { id: true } } },
  });
  if (!user || user.role !== UserRole.CONTRACTOR || !user.contractorProfile) {
    return { ok: false, status: 403, error: "Contractor profile required." };
  }

  const contractorId = user.contractorProfile.id;
  const cacheKey = `rec:jobs:${contractorId}:${limit}`;
  const cached = await getCachedJson<RecommendedJob[]>(cacheKey);
  if (cached) return { ok: true, recommendations: cached };

  const openJobs = await prisma.job.findMany({
    where: { status: { in: [JobStatus.OPEN, JobStatus.BIDDING] } },
    select: { id: true },
    take: 40,
    orderBy: { createdAt: "desc" },
  });

  for (const job of openJobs) {
    const existing = await prisma.jobRecommendation.count({
      where: { jobId: job.id, contractorId },
    });
    if (existing === 0) {
      await recomputeRecommendationsForJob(job.id);
    }
  }

  const rows = await prisma.jobRecommendation.findMany({
    where: {
      contractorId,
      job: { status: { in: [JobStatus.OPEN, JobStatus.BIDDING] } },
    },
    include: {
      job: { select: { id: true, title: true, location: true, budget: true, status: true } },
    },
    orderBy: { score: "desc" },
    take: limit,
  });

  const recommendations: RecommendedJob[] = rows.map((row) => ({
    jobId: row.job.id,
    title: row.job.title,
    location: row.job.location,
    budget: row.job.budget?.toString() ?? null,
    status: row.job.status,
    matchScore: row.score,
    reasons: Array.isArray(row.reasons)
      ? (row.reasons as string[]).filter((reason) => !reason.startsWith("⚠"))
      : [],
    warnings: Array.isArray(row.reasons)
      ? (row.reasons as string[])
          .filter((reason) => reason.startsWith("⚠"))
          .map((reason) => reason.replace(/^⚠\s*/, ""))
      : [],
    breakdown: (row.breakdown ?? {}) as Record<string, number>,
  }));

  await setCachedJson(cacheKey, recommendations, CACHE_TTL_MS);
  return { ok: true, recommendations };
}

export async function getRecommendedContractorsForJob(
  jobId: string,
  limit = TOP_N,
): Promise<
  | { ok: true; recommendations: RecommendedContractor[] }
  | { ok: false; status: number; error: string }
> {
  const session = await getSession();
  if (!session?.user) return { ok: false, status: 401, error: "Not authenticated." };

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, customerId: true, status: true },
  });
  if (!job) return { ok: false, status: 404, error: "Job not found." };
  if (job.customerId !== session.user.id) {
    return { ok: false, status: 403, error: "Unauthorized." };
  }

  const cacheKey = `rec:contractors:${jobId}:${limit}`;
  const cached = await getCachedJson<RecommendedContractor[]>(cacheKey);
  if (cached) return { ok: true, recommendations: cached };

  const count = await prisma.jobRecommendation.count({ where: { jobId } });
  if (count === 0) {
    await recomputeRecommendationsForJob(jobId);
  }

  const rows = await prisma.jobRecommendation.findMany({
    where: { jobId },
    include: {
      contractor: {
        select: {
          id: true,
          companyName: true,
          trade: true,
          hourlyRate: true,
          city: true,
          state: true,
        },
      },
    },
    orderBy: { score: "desc" },
    take: limit,
  });

  const ratings = await ratingSummaries(rows.map((row) => row.contractorId));
  const completedCounts = await prisma.job.groupBy({
    by: ["contractorId"],
    where: {
      status: JobStatus.COMPLETED,
      contractorId: { in: rows.map((row) => row.contractorId) },
    },
    _count: { _all: true },
  });
  const completedMap = new Map(
    completedCounts.map((row) => [row.contractorId!, row._count._all]),
  );

  const recommendations: RecommendedContractor[] = rows.map((row) => ({
    contractorId: row.contractor.id,
    companyName: row.contractor.companyName,
    trade: row.contractor.trade,
    matchScore: row.score,
    ratingAverage: ratings.get(row.contractorId)?.ratingAverage ?? null,
    completedJobs: completedMap.get(row.contractorId) ?? 0,
    reasons: Array.isArray(row.reasons)
      ? (row.reasons as string[]).filter((reason) => !reason.startsWith("⚠"))
      : [],
    warnings: Array.isArray(row.reasons)
      ? (row.reasons as string[])
          .filter((reason) => reason.startsWith("⚠"))
          .map((reason) => reason.replace(/^⚠\s*/, ""))
      : [],
    breakdown: (row.breakdown ?? {}) as Record<string, number>,
    hourlyRate: row.contractor.hourlyRate.toString(),
    city: row.contractor.city,
    state: row.contractor.state,
  }));

  await setCachedJson(cacheKey, recommendations, CACHE_TTL_MS);
  return { ok: true, recommendations };
}

export async function trackRecommendationEvent(input: {
  eventType: string;
  jobId?: string;
  contractorId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const session = await getSession();
  await prisma.recommendationEvent.create({
    data: {
      userId: session?.user?.id,
      jobId: input.jobId,
      contractorId: input.contractorId,
      eventType: input.eventType,
      metadata: input.metadata,
    },
  });
}
