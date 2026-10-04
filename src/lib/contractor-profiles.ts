import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ratingSummaries } from "@/lib/reviews";
import { getSession } from "@/lib/session";
import {
  contractorProfileSchema,
  profileValidationMessage,
  type ContractorProfileInput,
} from "@/lib/validations/contractor-profile";

export const CONTRACTOR_PAGE_SIZE = 12;

const publicProfileSelect = {
  id: true,
  companyName: true,
  trade: true,
  bio: true,
  hourlyRate: true,
  yearsExperience: true,
  city: true,
  state: true,
  skills: true,
  serviceCategories: true,
  serviceRadiusMiles: true,
  availability: true,
  availabilityNotes: true,
  portfolioImages: true,
  preferredRateMax: true,
  profileImage: true,
  verified: true,
  createdAt: true,
} satisfies Prisma.ContractorProfileSelect;

type ProfileRecord = Prisma.ContractorProfileGetPayload<{
  select: typeof publicProfileSelect;
}>;

export type PublicContractor = {
  id: string;
  companyName: string;
  trade: string;
  bio: string;
  hourlyRate: string;
  yearsExperience: number;
  city: string;
  state: string;
  skills: string[];
  serviceCategories: string[];
  serviceRadiusMiles: number;
  availability: string | null;
  availabilityNotes: string | null;
  portfolioImages: string[];
  preferredRateMax: string | null;
  profileImage: string | null;
  verified: boolean;
  createdAt: string;
  ratingAverage: number | null;
  reviewCount: number;
};

export type ProfileMutationResult =
  | { ok: true; profile: PublicContractor }
  | { ok: false; status: number; error: string };

export type ContractorSearch = {
  trade?: string;
  city?: string;
  state?: string;
  page?: number;
};

function toPublicContractor(profile: ProfileRecord): PublicContractor {
  return {
    id: profile.id,
    companyName: profile.companyName,
    trade: profile.trade,
    bio: profile.bio,
    hourlyRate: profile.hourlyRate.toString(),
    yearsExperience: profile.yearsExperience,
    city: profile.city,
    state: profile.state,
    skills: profile.skills,
    serviceCategories: profile.serviceCategories,
    serviceRadiusMiles: profile.serviceRadiusMiles,
    availability: profile.availability,
    availabilityNotes: profile.availabilityNotes,
    portfolioImages: profile.portfolioImages,
    preferredRateMax: profile.preferredRateMax?.toString() ?? null,
    profileImage: profile.profileImage,
    verified: profile.verified,
    createdAt: profile.createdAt.toISOString(),
    ratingAverage: null,
    reviewCount: 0,
  };
}

function cleanQuery(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed.slice(0, 80) : undefined;
}

export function contractorSearchWhere(search: ContractorSearch): Prisma.ContractorProfileWhereInput {
  const trade = cleanQuery(search.trade);
  const city = cleanQuery(search.city);
  const state = cleanQuery(search.state)?.toUpperCase();
  const filters: Prisma.ContractorProfileWhereInput[] = [];

  if (trade) {
    filters.push({ trade: { contains: trade, mode: "insensitive" } });
  }

  if (city) {
    filters.push({
      OR: [
        { city: { contains: city, mode: "insensitive" } },
        { state: { contains: city, mode: "insensitive" } },
      ],
    });
  }

  if (state) {
    filters.push({ state: { equals: state, mode: "insensitive" } });
  }

  return filters.length > 0 ? { AND: filters } : {};
}

export async function searchContractors(search: ContractorSearch) {
  const where = contractorSearchWhere(search);
  const total = await prisma.contractorProfile.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / CONTRACTOR_PAGE_SIZE));
  const page = Math.min(
    Number.isInteger(search.page) && search.page && search.page > 0 ? search.page : 1,
    pageCount,
  );
  const profiles = await prisma.contractorProfile.findMany({
    where,
    select: publicProfileSelect,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * CONTRACTOR_PAGE_SIZE,
    take: CONTRACTOR_PAGE_SIZE,
  });

  const contractors = await attachRatings(profiles.map(toPublicContractor));

  return {
    contractors,
    total,
    page,
    pageSize: CONTRACTOR_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / CONTRACTOR_PAGE_SIZE)),
  };
}

async function attachRatings<T extends { id: string }>(contractors: T[]) {
  const summaries = await ratingSummaries(contractors.map((contractor) => contractor.id));
  return contractors.map((contractor) => {
    const summary = summaries.get(contractor.id);
    return {
      ...contractor,
      ratingAverage: summary?.ratingAverage ?? null,
      reviewCount: summary?.reviewCount ?? 0,
    };
  });
}

export async function getPublicContractor(id: string) {
  const profile = await prisma.contractorProfile.findUnique({
    where: { id },
    select: publicProfileSelect,
  });

  if (!profile) {
    return null;
  }

  const [withRating] = await attachRatings([toPublicContractor(profile)]);
  return withRating;
}

export async function getContractorProfileForUser(userId: string) {
  const profile = await prisma.contractorProfile.findUnique({
    where: { userId },
    select: publicProfileSelect,
  });

  return profile ? toPublicContractor(profile) : null;
}

async function requireContractorSession(): Promise<
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

  if (!user || user.role !== UserRole.CONTRACTOR) {
    return { ok: false, status: 403, error: "Unauthorized." };
  }

  return { ok: true, userId: user.id };
}

function profileData(input: ContractorProfileInput) {
  return {
    companyName: input.companyName,
    trade: input.trade,
    bio: input.bio,
    city: input.city,
    state: input.state,
    yearsExperience: input.yearsExperience,
    hourlyRate: input.hourlyRate,
    skills: input.skills.length > 0 ? input.skills : [input.trade.toLowerCase()],
    serviceCategories: input.serviceCategories,
    serviceRadiusMiles: input.serviceRadiusMiles,
    availability: input.availability,
    availabilityNotes: input.availabilityNotes,
    profileImage: input.profileImage,
    portfolioImages: input.portfolioImages,
  };
}

export async function createContractorProfile(input: unknown): Promise<ProfileMutationResult> {
  const access = await requireContractorSession();
  if (!access.ok) {
    return access;
  }

  const parsed = contractorProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, status: 400, error: profileValidationMessage(parsed.error) };
  }

  try {
    const profile = await prisma.contractorProfile.create({
      data: {
        userId: access.userId,
        ...profileData(parsed.data),
      },
      select: publicProfileSelect,
    });

    try {
      const { refreshContractorEmbedding } = await import("@/lib/recommendations");
      await refreshContractorEmbedding(profile.id);
    } catch {
      // Profile create still succeeds without embeddings.
    }

    return { ok: true, profile: toPublicContractor(profile) };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, status: 409, error: "You already have a contractor profile." };
    }

    return { ok: false, status: 500, error: "Unable to save profile." };
  }
}

export async function updateContractorProfile(input: unknown): Promise<ProfileMutationResult> {
  const access = await requireContractorSession();
  if (!access.ok) {
    return access;
  }

  const parsed = contractorProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, status: 400, error: profileValidationMessage(parsed.error) };
  }

  try {
    const profile = await prisma.contractorProfile.update({
      where: { userId: access.userId },
      data: profileData(parsed.data),
      select: publicProfileSelect,
    });

    try {
      const { refreshContractorEmbedding } = await import("@/lib/recommendations");
      await refreshContractorEmbedding(profile.id);
    } catch {
      // Profile update still succeeds without embeddings.
    }

    return { ok: true, profile: toPublicContractor(profile) };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { ok: false, status: 404, error: "Contractor profile not found." };
    }

    return { ok: false, status: 500, error: "Unable to save profile." };
  }
}
