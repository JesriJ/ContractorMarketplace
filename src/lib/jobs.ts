import { BidStatus, JobStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createJobConversation } from "@/lib/messages";
import { bidSchema, jobSchema, validationMessage } from "@/lib/validations/job";

export const JOB_PAGE_SIZE = 12;
const openStatuses: JobStatus[] = [JobStatus.OPEN, JobStatus.BIDDING];

class JobActionError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type MutationResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

export type PublicJob = {
  id: string;
  title: string;
  description: string;
  budget: string | null;
  location: string;
  city: string | null;
  state: string | null;
  status: JobStatus;
  bidCount: number;
  createdAt: string;
  requiredSkills: string[];
  projectType: string | null;
  experienceLevel: string | null;
  availabilityNeeded: string | null;
  imageUrls: string[];
  contractor: { id: string; companyName: string } | null;
};

export type BidView = {
  id: string;
  amount: string;
  message: string;
  estimatedDuration: string;
  status: BidStatus;
  createdAt: string;
  contractor: {
    id: string;
    companyName: string;
    trade: string;
    city: string;
    state: string;
  };
};

export type JobDetail = {
  job: PublicJob;
  isOwner: boolean;
  canBid: boolean;
  needsProfile: boolean;
  customerEmail: string | null;
  myBid: BidView | null;
  canMessage: boolean;
  isAssignedContractor: boolean;
  canReview: boolean;
  review: { rating: number; comment: string } | null;
  bids: BidView[];
};

type Viewer = {
  id: string;
  role: UserRole;
  profileId: string | null;
};

function money(value: { toString(): string }) {
  return value.toString();
}

function toBid(bid: {
  id: string;
  amount: { toString(): string };
  message: string;
  estimatedDuration: string;
  status: BidStatus;
  createdAt: Date;
  contractor: { id: string; companyName: string; trade: string; city: string; state: string };
}): BidView {
  return {
    id: bid.id,
    amount: money(bid.amount),
    message: bid.message,
    estimatedDuration: bid.estimatedDuration,
    status: bid.status,
    createdAt: bid.createdAt.toISOString(),
    contractor: bid.contractor,
  };
}

const jobInclude = {
  contractor: { select: { id: true, companyName: true } },
  customer: { select: { id: true, email: true } },
  _count: { select: { bids: true } },
  bids: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      amount: true,
      message: true,
      estimatedDuration: true,
      status: true,
      createdAt: true,
      contractorId: true,
      contractor: {
        select: { id: true, companyName: true, trade: true, city: true, state: true },
      },
    },
  },
} satisfies Prisma.JobInclude;

type JobRecord = Prisma.JobGetPayload<{ include: typeof jobInclude }>;

function toPublicJob(job: JobRecord): PublicJob {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    budget: job.budget ? money(job.budget) : null,
    location: job.location,
    city: job.city,
    state: job.state,
    status: job.status,
    bidCount: job._count.bids,
    createdAt: job.createdAt.toISOString(),
    requiredSkills: job.requiredSkills,
    projectType: job.projectType,
    experienceLevel: job.experienceLevel,
    availabilityNeeded: job.availabilityNeeded,
    imageUrls: job.imageUrls,
    contractor: job.contractor,
  };
}

function cleanQuery(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed.slice(0, 80) : undefined;
}

async function requireRoleUser(role: UserRole): Promise<
  { ok: true; userId: string } | { ok: false; status: number; error: string }
> {
  const session = await getSession();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Not authenticated." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  if (!user || user.role !== role) {
    return { ok: false, status: 403, error: "Unauthorized." };
  }

  return { ok: true, userId: user.id };
}

async function viewerFromSession(): Promise<Viewer | null> {
  const session = await getSession();
  if (!session?.user) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, contractorProfile: { select: { id: true } } },
  });

  if (!user) {
    return null;
  }

  return { id: user.id, role: user.role, profileId: user.contractorProfile?.id ?? null };
}

function resultFromError(error: unknown): MutationResult<never> {
  if (error instanceof JobActionError) {
    return { ok: false, status: error.status, error: error.message };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { ok: false, status: 409, error: "You already submitted a bid on this job." };
  }

  return { ok: false, status: 500, error: "Unable to save this change." };
}

export async function searchJobs(search: { keyword?: string; location?: string; page?: number }) {
  const keyword = cleanQuery(search.keyword);
  const location = cleanQuery(search.location);
  const filters: Prisma.JobWhereInput[] = [{ status: { in: openStatuses } }];

  if (keyword) {
    filters.push({
      OR: [
        { title: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
        { location: { contains: keyword, mode: "insensitive" } },
      ],
    });
  }

  if (location) {
    filters.push({
      OR: [
        { location: { contains: location, mode: "insensitive" } },
        { city: { contains: location, mode: "insensitive" } },
        { state: { equals: location.toUpperCase(), mode: "insensitive" } },
      ],
    });
  }

  const where = { AND: filters };
  const total = await prisma.job.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / JOB_PAGE_SIZE));
  const page = Math.min(
    Number.isInteger(search.page) && search.page && search.page > 0 ? search.page : 1,
    pageCount,
  );
  const jobs = await prisma.job.findMany({
    where,
    include: jobInclude,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * JOB_PAGE_SIZE,
    take: JOB_PAGE_SIZE,
  });

  return {
    jobs: jobs.map(toPublicJob),
    total,
    page,
    pageCount,
  };
}

export async function getJobDetail(jobId: string): Promise<JobDetail | null> {
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: jobInclude });
  if (!job) {
    return null;
  }

  const viewer = await viewerFromSession();
  const isOwner = viewer?.id === job.customerId;
  const myBidRecord = viewer?.profileId
    ? job.bids.find((bid) => bid.contractorId === viewer.profileId)
    : undefined;
  const hiredContractor = viewer?.profileId !== null && job.contractorId === viewer?.profileId;

  const review = await prisma.review.findUnique({
    where: { jobId: job.id },
    select: { rating: true, comment: true },
  });

  return {
    job: toPublicJob(job),
    isOwner,
    canBid:
      viewer?.role === UserRole.CONTRACTOR &&
      Boolean(viewer.profileId) &&
      !isOwner &&
      openStatuses.includes(job.status) &&
      !myBidRecord,
    needsProfile: viewer?.role === UserRole.CONTRACTOR && !viewer.profileId,
    customerEmail: isOwner || hiredContractor ? job.customer.email : null,
    myBid: myBidRecord ? toBid(myBidRecord) : null,
    bids: isOwner ? job.bids.map(toBid) : [],
    canMessage:
      Boolean(job.contractorId) &&
      (job.status === JobStatus.ASSIGNED ||
        job.status === JobStatus.IN_PROGRESS ||
        job.status === JobStatus.PENDING_CONFIRMATION ||
        job.status === JobStatus.COMPLETED) &&
      (isOwner || viewer?.profileId === job.contractorId),
    isAssignedContractor: viewer?.profileId != null && viewer.profileId === job.contractorId,
    canReview: isOwner && job.status === JobStatus.COMPLETED && Boolean(job.contractorId) && !review,
    review,
  };
}

export async function listJobsForCustomer(userId: string) {
  const jobs = await prisma.job.findMany({
    where: { customerId: userId },
    include: jobInclude,
    orderBy: { updatedAt: "desc" },
  });

  return jobs.map(toPublicJob);
}

export async function listJobsForContractor(profileId: string) {
  const [activeJobs, bids] = await Promise.all([
    prisma.job.findMany({
      where: { contractorId: profileId },
      include: jobInclude,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.bid.findMany({
      where: { contractorId: profileId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        job: { select: { id: true, title: true, location: true, status: true } },
      },
    }),
  ]);

  return {
    activeJobs: activeJobs.map(toPublicJob),
    bids: bids.map((bid) => ({
      id: bid.id,
      amount: money(bid.amount),
      status: bid.status,
      createdAt: bid.createdAt.toISOString(),
      job: bid.job,
    })),
  };
}

export async function createJob(input: unknown): Promise<MutationResult<PublicJob>> {
  const access = await requireRoleUser(UserRole.CUSTOMER);
  if (!access.ok) {
    return access;
  }

  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, status: 400, error: validationMessage(parsed.error) };
  }

  const job = await prisma.job.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      budget: parsed.data.budget,
      location: parsed.data.location,
      city: parsed.data.city,
      state: parsed.data.state,
      requiredSkills: parsed.data.requiredSkills,
      projectType: parsed.data.projectType,
      experienceLevel: parsed.data.experienceLevel,
      availabilityNeeded: parsed.data.availabilityNeeded,
      imageUrls: parsed.data.imageUrls,
      customerId: access.userId,
    },
    include: jobInclude,
  });

  try {
    const { extractAndStoreJobRequirements } = await import("@/lib/recommendations");
    await extractAndStoreJobRequirements(job.id);
  } catch {
    // Job creation still succeeds if AI extraction fails.
  }

  return { ok: true, data: toPublicJob(job) };
}

export async function updateJob(jobId: string, input: unknown): Promise<MutationResult<PublicJob>> {
  const access = await requireRoleUser(UserRole.CUSTOMER);
  if (!access.ok) {
    return access;
  }

  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, status: 400, error: validationMessage(parsed.error) };
  }

  const existing = await prisma.job.findUnique({
    where: { id: jobId },
    select: { customerId: true, status: true },
  });

  if (!existing) {
    return { ok: false, status: 404, error: "Job not found." };
  }
  if (existing.customerId !== access.userId) {
    return { ok: false, status: 403, error: "Unauthorized." };
  }
  if (!openStatuses.includes(existing.status)) {
    return { ok: false, status: 400, error: "This job can no longer be edited." };
  }

  const updated = await prisma.job.updateMany({
    where: { id: jobId, customerId: access.userId, status: { in: openStatuses } },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      budget: parsed.data.budget,
      location: parsed.data.location,
      city: parsed.data.city,
      state: parsed.data.state,
      requiredSkills: parsed.data.requiredSkills,
      projectType: parsed.data.projectType,
      experienceLevel: parsed.data.experienceLevel,
      availabilityNeeded: parsed.data.availabilityNeeded,
      imageUrls: parsed.data.imageUrls,
    },
  });

  if (updated.count !== 1) {
    return { ok: false, status: 400, error: "This job can no longer be edited." };
  }

  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId }, include: jobInclude });

  try {
    const { extractAndStoreJobRequirements } = await import("@/lib/recommendations");
    await extractAndStoreJobRequirements(job.id);
  } catch {
    // Job update still succeeds if AI extraction fails.
  }

  return { ok: true, data: toPublicJob(job) };
}

export async function cancelJob(jobId: string): Promise<MutationResult<PublicJob>> {
  const access = await requireRoleUser(UserRole.CUSTOMER);
  if (!access.ok) {
    return access;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.job.findUnique({
        where: { id: jobId },
        select: { customerId: true },
      });
      if (!existing) {
        throw new JobActionError(404, "Job not found.");
      }
      if (existing.customerId !== access.userId) {
        throw new JobActionError(403, "Unauthorized.");
      }

      const cancelled = await tx.job.updateMany({
        where: { id: jobId, customerId: access.userId, status: { in: openStatuses } },
        data: { status: JobStatus.CANCELLED },
      });
      if (cancelled.count !== 1) {
        throw new JobActionError(400, "This job can no longer be cancelled.");
      }

      await tx.bid.updateMany({
        where: { jobId, status: BidStatus.PENDING },
        data: { status: BidStatus.REJECTED },
      });
    });
  } catch (error) {
    return resultFromError(error);
  }

  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId }, include: jobInclude });
  return { ok: true, data: toPublicJob(job) };
}

export async function submitBid(jobId: string, input: unknown): Promise<MutationResult<BidView>> {
  const access = await requireRoleUser(UserRole.CONTRACTOR);
  if (!access.ok) {
    return access;
  }

  const parsed = bidSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, status: 400, error: validationMessage(parsed.error) };
  }

  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: access.userId },
    select: { id: true },
  });
  if (!profile) {
    return { ok: false, status: 400, error: "Create a contractor profile before submitting a bid." };
  }

  try {
    const bid = await prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({
        where: { id: jobId },
        select: { id: true, customerId: true },
      });
      if (!job) {
        throw new JobActionError(404, "Job not found.");
      }
      if (job.customerId === access.userId) {
        throw new JobActionError(403, "You cannot bid on your own job.");
      }

      const created = await tx.bid.create({
        data: {
          jobId: job.id,
          contractorId: profile.id,
          amount: parsed.data.amount,
          message: parsed.data.message,
          estimatedDuration: parsed.data.estimatedDuration,
        },
        select: {
          id: true,
          amount: true,
          message: true,
          estimatedDuration: true,
          status: true,
          createdAt: true,
          contractor: {
            select: { id: true, companyName: true, trade: true, city: true, state: true },
          },
        },
      });

      const opened = await tx.job.updateMany({
        where: { id: job.id, status: { in: openStatuses } },
        data: { status: JobStatus.BIDDING },
      });
      if (opened.count !== 1) {
        throw new JobActionError(400, "This job is no longer accepting bids.");
      }

      return created;
    });

    return { ok: true, data: toBid(bid) };
  } catch (error) {
    return resultFromError(error);
  }
}

export async function acceptBid(jobId: string, bidId: string): Promise<MutationResult<PublicJob>> {
  const access = await requireRoleUser(UserRole.CUSTOMER);
  if (!access.ok) {
    return access;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({
        where: { id: jobId },
        select: { id: true, customerId: true },
      });
      if (!job) {
        throw new JobActionError(404, "Job not found.");
      }
      if (job.customerId !== access.userId) {
        throw new JobActionError(403, "Unauthorized.");
      }

      const bid = await tx.bid.findUnique({
        where: { id: bidId },
        select: { id: true, jobId: true, contractorId: true, status: true },
      });
      if (!bid || bid.jobId !== job.id) {
        throw new JobActionError(404, "Bid not found.");
      }
      if (bid.status !== BidStatus.PENDING) {
        throw new JobActionError(400, "This bid can no longer be accepted.");
      }

      const assigned = await tx.job.updateMany({
        where: { id: job.id, customerId: access.userId, status: { in: openStatuses } },
        data: { status: JobStatus.ASSIGNED, contractorId: bid.contractorId },
      });
      if (assigned.count !== 1) {
        throw new JobActionError(400, "This job is no longer accepting bids.");
      }

      const accepted = await tx.bid.updateMany({
        where: { id: bid.id, jobId: job.id, status: BidStatus.PENDING },
        data: { status: BidStatus.ACCEPTED },
      });
      if (accepted.count !== 1) {
        throw new JobActionError(400, "This bid can no longer be accepted.");
      }

      await tx.bid.updateMany({
        where: { jobId: job.id, id: { not: bid.id }, status: BidStatus.PENDING },
        data: { status: BidStatus.REJECTED },
      });

      await createJobConversation(tx, {
        jobId: job.id,
        customerId: job.customerId,
        contractorId: bid.contractorId,
      });
    });
  } catch (error) {
    return resultFromError(error);
  }

  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId }, include: jobInclude });
  return { ok: true, data: toPublicJob(job) };
}

export async function rejectBid(jobId: string, bidId: string): Promise<MutationResult<PublicJob>> {
  const access = await requireRoleUser(UserRole.CUSTOMER);
  if (!access.ok) {
    return access;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({
        where: { id: jobId },
        select: { id: true, customerId: true },
      });
      if (!job) {
        throw new JobActionError(404, "Job not found.");
      }
      if (job.customerId !== access.userId) {
        throw new JobActionError(403, "Unauthorized.");
      }

      const bid = await tx.bid.findUnique({
        where: { id: bidId },
        select: { id: true, jobId: true, status: true },
      });
      if (!bid || bid.jobId !== job.id) {
        throw new JobActionError(404, "Bid not found.");
      }

      const rejected = await tx.bid.updateMany({
        where: { id: bid.id, jobId: job.id, status: BidStatus.PENDING },
        data: { status: BidStatus.REJECTED },
      });
      if (rejected.count !== 1) {
        throw new JobActionError(400, "This bid can no longer be rejected.");
      }

      const pending = await tx.bid.count({
        where: { jobId: job.id, status: BidStatus.PENDING },
      });
      if (pending === 0) {
        await tx.job.updateMany({
          where: { id: job.id, customerId: access.userId, status: JobStatus.BIDDING },
          data: { status: JobStatus.OPEN },
        });
      }
    });
  } catch (error) {
    return resultFromError(error);
  }

  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId }, include: jobInclude });
  return { ok: true, data: toPublicJob(job) };
}

async function reloadJob(jobId: string) {
  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId }, include: jobInclude });
  return toPublicJob(job);
}

async function changeAssignedJobStatus(jobId: string, from: JobStatus, to: JobStatus, failure: string) {
  const access = await requireRoleUser(UserRole.CONTRACTOR);
  if (!access.ok) {
    return access;
  }

  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: access.userId },
    select: { id: true },
  });
  if (!profile) {
    return { ok: false as const, status: 400, error: "Contractor profile not found." };
  }

  const existing = await prisma.job.findUnique({
    where: { id: jobId },
    select: { contractorId: true },
  });
  if (!existing) {
    return { ok: false as const, status: 404, error: "Job not found." };
  }
  if (existing.contractorId !== profile.id) {
    return { ok: false as const, status: 403, error: "Unauthorized." };
  }

  const updated = await prisma.job.updateMany({
    where: { id: jobId, contractorId: profile.id, status: from },
    data: { status: to },
  });
  if (updated.count !== 1) {
    return { ok: false as const, status: 400, error: failure };
  }

  return { ok: true as const, data: await reloadJob(jobId) };
}

export async function startJob(jobId: string): Promise<MutationResult<PublicJob>> {
  return changeAssignedJobStatus(jobId, JobStatus.ASSIGNED, JobStatus.IN_PROGRESS, "This job cannot be started.");
}

export async function requestJobCompletion(jobId: string): Promise<MutationResult<PublicJob>> {
  return changeAssignedJobStatus(
    jobId,
    JobStatus.IN_PROGRESS,
    JobStatus.PENDING_CONFIRMATION,
    "This job cannot be marked complete.",
  );
}

export async function confirmJobCompletion(jobId: string): Promise<MutationResult<PublicJob>> {
  const access = await requireRoleUser(UserRole.CUSTOMER);
  if (!access.ok) {
    return access;
  }

  const existing = await prisma.job.findUnique({
    where: { id: jobId },
    select: { customerId: true },
  });
  if (!existing) {
    return { ok: false, status: 404, error: "Job not found." };
  }
  if (existing.customerId !== access.userId) {
    return { ok: false, status: 403, error: "Unauthorized." };
  }

  const updated = await prisma.job.updateMany({
    where: { id: jobId, customerId: access.userId, status: JobStatus.PENDING_CONFIRMATION },
    data: { status: JobStatus.COMPLETED },
  });
  if (updated.count !== 1) {
    return { ok: false, status: 400, error: "This job is not ready to confirm." };
  }

  return { ok: true, data: await reloadJob(jobId) };
}
