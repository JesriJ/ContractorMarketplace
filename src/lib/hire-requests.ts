import { HireRequestStatus, JobStatus, Prisma, UserRole } from "@prisma/client";
import { createJobConversation } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hireRequestSchema, hireRequestValidationMessage } from "@/lib/validations/hire-request";

class HireRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type HireRequestResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

export type HireRequestView = {
  id: string;
  message: string;
  status: HireRequestStatus;
  createdAt: string;
  jobId: string | null;
  customer: { id: string; email: string };
  contractor: { id: string; companyName: string; trade: string; city: string; state: string };
};

const requestSelect = {
  id: true,
  message: true,
  status: true,
  createdAt: true,
  jobId: true,
  customerId: true,
  contractorId: true,
  customer: { select: { id: true, email: true } },
  contractor: {
    select: { id: true, userId: true, companyName: true, trade: true, city: true, state: true },
  },
} satisfies Prisma.HireRequestSelect;

type RequestRecord = Prisma.HireRequestGetPayload<{ select: typeof requestSelect }>;

function toView(request: RequestRecord): HireRequestView {
  return {
    id: request.id,
    message: request.message,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    jobId: request.jobId,
    customer: request.customer,
    contractor: {
      id: request.contractor.id,
      companyName: request.contractor.companyName,
      trade: request.contractor.trade,
      city: request.contractor.city,
      state: request.contractor.state,
    },
  };
}

function jobTitle(message: string) {
  const compact = message.replace(/\s+/g, " ").trim();
  if (compact.length <= 120) {
    return compact;
  }
  return `${compact.slice(0, 117)}...`;
}

async function requireUser(role?: UserRole) {
  const session = await getSession();
  if (!session?.user) {
    throw new HireRequestError(401, "Not authenticated.");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, contractorProfile: { select: { id: true } } },
  });

  if (!user || (role && user.role !== role)) {
    throw new HireRequestError(403, "Unauthorized.");
  }

  return user;
}

function fromError(error: unknown): HireRequestResult<never> {
  if (error instanceof HireRequestError) {
    return { ok: false, status: error.status, error: error.message };
  }
  return { ok: false, status: 500, error: "Unable to save this change." };
}

async function loadRequest(id: string) {
  return prisma.hireRequest.findUnique({ where: { id }, select: requestSelect });
}

export async function createHireRequest(
  contractorProfileId: string,
  input: unknown,
): Promise<HireRequestResult<HireRequestView>> {
  try {
    const user = await requireUser(UserRole.CUSTOMER);
    const parsed = hireRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, status: 400, error: hireRequestValidationMessage(parsed.error) };
    }

    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorProfileId },
      select: { id: true, userId: true },
    });
    if (!contractor) {
      return { ok: false, status: 404, error: "Contractor profile not found." };
    }
    if (contractor.userId === user.id) {
      return { ok: false, status: 403, error: "You cannot request service from yourself." };
    }

    const request = await prisma.hireRequest.create({
      data: {
        customerId: user.id,
        contractorId: contractor.id,
        message: parsed.data.message,
      },
      select: requestSelect,
    });

    return { ok: true, data: toView(request) };
  } catch (error) {
    return fromError(error);
  }
}

export async function listHireRequestsForCurrentUser(): Promise<
  HireRequestResult<{ role: UserRole; requests: HireRequestView[] }>
> {
  try {
    const user = await requireUser();
    const where =
      user.role === UserRole.CONTRACTOR
        ? { contractor: { userId: user.id } }
        : { customerId: user.id };

    const requests = await prisma.hireRequest.findMany({
      where,
      select: requestSelect,
      orderBy: { createdAt: "desc" },
    });

    return { ok: true, data: { role: user.role, requests: requests.map(toView) } };
  } catch (error) {
    return fromError(error);
  }
}

export async function getHireRequestForCurrentUser(id: string): Promise<HireRequestResult<HireRequestView>> {
  try {
    const user = await requireUser();
    const request = await loadRequest(id);
    if (!request) {
      return { ok: false, status: 404, error: "Hire request not found." };
    }

    const isCustomer = request.customerId === user.id;
    const isContractor = request.contractor.userId === user.id;
    if (!isCustomer && !isContractor) {
      return { ok: false, status: 403, error: "Unauthorized." };
    }

    return { ok: true, data: toView(request) };
  } catch (error) {
    return fromError(error);
  }
}

export async function acceptHireRequest(id: string): Promise<HireRequestResult<HireRequestView>> {
  try {
    const user = await requireUser(UserRole.CONTRACTOR);
    if (!user.contractorProfile) {
      return { ok: false, status: 400, error: "Create a contractor profile before responding to requests." };
    }

    const existing = await loadRequest(id);
    if (!existing) {
      return { ok: false, status: 404, error: "Hire request not found." };
    }
    if (existing.contractorId !== user.contractorProfile.id) {
      return { ok: false, status: 403, error: "Unauthorized." };
    }

    const profileId = user.contractorProfile.id;

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.hireRequest.updateMany({
        where: {
          id,
          contractorId: profileId,
          status: HireRequestStatus.PENDING,
          jobId: null,
        },
        data: { status: HireRequestStatus.ACCEPTED },
      });
      if (claimed.count !== 1) {
        throw new HireRequestError(400, "This request can no longer be accepted.");
      }

      const job = await tx.job.create({
        data: {
          title: jobTitle(existing.message),
          description: existing.message,
          location: `${existing.contractor.city}, ${existing.contractor.state}`,
          status: JobStatus.ASSIGNED,
          customerId: existing.customerId,
          contractorId: existing.contractorId,
        },
        select: { id: true },
      });

      await tx.hireRequest.update({
        where: { id },
        data: { jobId: job.id },
      });

      await createJobConversation(tx, {
        jobId: job.id,
        customerId: existing.customerId,
        contractorId: existing.contractorId,
      });
    });

    const request = await loadRequest(id);
    if (!request) {
      return { ok: false, status: 404, error: "Hire request not found." };
    }
    return { ok: true, data: toView(request) };
  } catch (error) {
    return fromError(error);
  }
}

export async function rejectHireRequest(id: string): Promise<HireRequestResult<HireRequestView>> {
  try {
    const user = await requireUser(UserRole.CONTRACTOR);
    if (!user.contractorProfile) {
      return { ok: false, status: 400, error: "Create a contractor profile before responding to requests." };
    }

    const existing = await loadRequest(id);
    if (!existing) {
      return { ok: false, status: 404, error: "Hire request not found." };
    }
    if (existing.contractorId !== user.contractorProfile.id) {
      return { ok: false, status: 403, error: "Unauthorized." };
    }

    const rejected = await prisma.hireRequest.updateMany({
      where: {
        id,
        contractorId: user.contractorProfile.id,
        status: HireRequestStatus.PENDING,
        jobId: null,
      },
      data: { status: HireRequestStatus.REJECTED },
    });
    if (rejected.count !== 1) {
      return { ok: false, status: 400, error: "This request can no longer be rejected." };
    }

    const request = await loadRequest(id);
    if (!request) {
      return { ok: false, status: 404, error: "Hire request not found." };
    }
    return { ok: true, data: toView(request) };
  } catch (error) {
    return fromError(error);
  }
}

export async function cancelHireRequest(id: string): Promise<HireRequestResult<HireRequestView>> {
  try {
    const user = await requireUser(UserRole.CUSTOMER);
    const existing = await loadRequest(id);
    if (!existing) {
      return { ok: false, status: 404, error: "Hire request not found." };
    }
    if (existing.customerId !== user.id) {
      return { ok: false, status: 403, error: "Unauthorized." };
    }

    const cancelled = await prisma.hireRequest.updateMany({
      where: {
        id,
        customerId: user.id,
        status: HireRequestStatus.PENDING,
        jobId: null,
      },
      data: { status: HireRequestStatus.CANCELLED },
    });
    if (cancelled.count !== 1) {
      return { ok: false, status: 400, error: "This request can no longer be cancelled." };
    }

    const request = await loadRequest(id);
    if (!request) {
      return { ok: false, status: 404, error: "Hire request not found." };
    }
    return { ok: true, data: toView(request) };
  } catch (error) {
    return fromError(error);
  }
}
