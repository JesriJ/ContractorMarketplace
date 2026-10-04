import { cosineSimilarity } from "@/lib/ai/gemini";

export type MatchWeights = {
  skill: number;
  semantic: number;
  experience: number;
  location: number;
  availability: number;
  rating: number;
  price: number;
};

/** Hybrid weights: structured + optional semantic (Phase 13). */
export const HYBRID_WEIGHTS: MatchWeights = {
  skill: 0.3,
  semantic: 0.2,
  experience: 0.15,
  location: 0.1,
  availability: 0.1,
  rating: 0.1,
  price: 0.05,
};

/** MVP structured-only weights when no embeddings exist. */
export const STRUCTURED_WEIGHTS: MatchWeights = {
  skill: 0.35,
  semantic: 0,
  experience: 0.2,
  location: 0.15,
  availability: 0.1,
  rating: 0.1,
  price: 0.1,
};

export type MatchInput = {
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel: string | null;
  availabilityHint: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  jobLocation: string;
  jobCity: string | null;
  jobStateHint: string | null;
  jobEmbedding: number[];
  contractorSkills: string[];
  contractorCategories: string[];
  contractorTrade: string;
  contractorYears: number;
  contractorCity: string;
  contractorState: string;
  contractorRadiusMiles: number;
  contractorAvailability: string | null;
  contractorAvailabilityNotes: string | null;
  contractorHourlyRate: number;
  contractorRating: number | null;
  contractorEmbedding: number[];
  sameState: boolean;
  sameCity: boolean;
};

export type MatchResult = {
  score: number;
  breakdown: Record<string, number>;
  reasons: string[];
  warnings: string[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function skillSet(values: string[]) {
  return new Set(values.map(normalize).filter(Boolean));
}

function skillOverlapScore(required: string[], preferred: string[], contractorSkills: string[]) {
  const owned = skillSet(contractorSkills);
  const requiredList = [...skillSet(required)];
  const preferredList = [...skillSet(preferred)];
  if (requiredList.length === 0 && preferredList.length === 0) {
    return { score: 0.55, matchedRequired: 0, requiredTotal: 0 };
  }
  const matchedRequired = requiredList.filter((skill) =>
    [...owned].some((ownedSkill) => ownedSkill.includes(skill) || skill.includes(ownedSkill)),
  ).length;
  const matchedPreferred = preferredList.filter((skill) =>
    [...owned].some((ownedSkill) => ownedSkill.includes(skill) || skill.includes(ownedSkill)),
  ).length;
  const requiredScore = requiredList.length === 0 ? 0.7 : matchedRequired / requiredList.length;
  const preferredScore = preferredList.length === 0 ? 1 : matchedPreferred / preferredList.length;
  return {
    score: Math.min(1, requiredScore * 0.85 + preferredScore * 0.15),
    matchedRequired,
    requiredTotal: requiredList.length,
  };
}

function experienceScore(level: string | null, years: number) {
  const required =
    level === "expert" ? 10 : level === "experienced" ? 5 : level === "entry" ? 1 : 3;
  if (years >= required) return 1;
  if (years <= 0) return 0.2;
  return Math.max(0.2, years / required);
}

function locationScore(input: MatchInput) {
  if (input.sameCity) return 1;
  if (input.sameState) return 0.9;
  // Nearby border states: allow with reduced score when contractor covers a wide radius.
  if (input.contractorRadiusMiles >= 50) return 0.6;
  if (input.contractorRadiusMiles >= 25) return 0.45;
  return 0.25;
}

function availabilityScore(
  jobHint: string | null,
  contractorAvailability: string | null,
  contractorNotes: string | null,
) {
  if (!jobHint) return 0.75;
  const hint = normalize(jobHint);
  const availability = normalize(contractorAvailability ?? "");
  if (availability && availability === hint) return 1;
  if (availability === "flexible" || availability === "asap") return 0.9;
  if (
    (hint === "this_week" || hint === "next_week") &&
    (availability === "this_week" || availability === "next_week" || availability === "weekdays")
  ) {
    return 0.85;
  }
  const notes = normalize(contractorNotes ?? "");
  if (notes.includes("unavailable") || notes.includes("booked solid")) return 0.2;
  if (notes.includes("available")) return 0.7;
  return availability ? 0.55 : 0.45;
}

function ratingScore(rating: number | null) {
  if (rating == null) return 0.55;
  return Math.max(0, Math.min(1, rating / 5));
}

function priceScore(hourly: number, budgetMin: number | null, budgetMax: number | null) {
  if (budgetMax == null && budgetMin == null) return 0.7;
  const max = budgetMax ?? budgetMin ?? 0;
  if (max <= 0) return 0.7;
  // Rough project-day estimate: 8 hours * hourly compared to budget mid/max.
  const estimate = hourly * 8;
  if (estimate <= max) return 1;
  if (estimate <= max * 1.15) return 0.7;
  if (estimate <= max * 1.4) return 0.45;
  return 0.2;
}

export function scoreMatch(input: MatchInput, weights: MatchWeights = HYBRID_WEIGHTS): MatchResult {
  const skills = skillOverlapScore(
    input.requiredSkills,
    input.preferredSkills,
    [...input.contractorSkills, ...input.contractorCategories, input.contractorTrade],
  );
  const semantic =
    input.jobEmbedding.length > 0 && input.contractorEmbedding.length > 0
      ? cosineSimilarity(input.jobEmbedding, input.contractorEmbedding)
      : 0;
  const experience = experienceScore(input.experienceLevel, input.contractorYears);
  const location = locationScore(input);
  const availability = availabilityScore(
    input.availabilityHint,
    input.contractorAvailability,
    input.contractorAvailabilityNotes,
  );
  const rating = ratingScore(input.contractorRating);
  const price = priceScore(input.contractorHourlyRate, input.budgetMin, input.budgetMax);

  const activeWeights =
    semantic > 0
      ? weights
      : {
          ...STRUCTURED_WEIGHTS,
          semantic: 0,
        };

  const weightSum =
    activeWeights.skill +
    activeWeights.semantic +
    activeWeights.experience +
    activeWeights.location +
    activeWeights.availability +
    activeWeights.rating +
    activeWeights.price;

  const weighted =
    (skills.score * activeWeights.skill +
      semantic * activeWeights.semantic +
      experience * activeWeights.experience +
      location * activeWeights.location +
      availability * activeWeights.availability +
      rating * activeWeights.rating +
      price * activeWeights.price) /
    weightSum;

  const score = Math.round(weighted * 1000) / 10;
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (skills.requiredTotal > 0) {
    reasons.push(`Matches ${skills.matchedRequired}/${skills.requiredTotal} required skills`);
  } else if (input.contractorSkills.length > 0) {
    reasons.push(`Skills include ${input.contractorSkills.slice(0, 3).join(", ")}`);
  }
  reasons.push(`${input.contractorYears} years of experience`);
  if (input.sameCity) reasons.push("Same city as the job");
  else if (input.sameState) reasons.push("Same state as the job");
  else if (location >= 0.55) reasons.push("Within a broad service radius (may be nearby across a state line)");
  if (input.contractorRating != null) reasons.push(`${input.contractorRating.toFixed(1)}/5 rating from reviews`);
  if (availability >= 0.85) reasons.push("Availability looks compatible");
  if (semantic >= 0.75) reasons.push("Strong semantic profile match");
  if (!input.sameState && !input.sameCity) {
    warnings.push("Different state—confirm travel distance before hiring");
  }
  if (price < 0.5) warnings.push("Rate may be above the preferred budget range");
  if (skills.requiredTotal > 0 && skills.matchedRequired < skills.requiredTotal) {
    warnings.push(`Missing ${skills.requiredTotal - skills.matchedRequired} required skill(s)`);
  }

  return {
    score,
    breakdown: {
      skill: Math.round(skills.score * 100),
      semantic: Math.round(semantic * 100),
      experience: Math.round(experience * 100),
      location: Math.round(location * 100),
      availability: Math.round(availability * 100),
      rating: Math.round(rating * 100),
      price: Math.round(price * 100),
    },
    reasons,
    warnings,
  };
}

export function passesHardFilters(input: {
  jobStatus: string;
  contractorDeactivated?: boolean;
  sameState: boolean;
  sameCity?: boolean;
  contractorRadiusMiles: number;
}): boolean {
  if (input.contractorDeactivated) return false;
  if (input.jobStatus !== "OPEN" && input.jobStatus !== "BIDDING") return false;
  // Same city/state always eligible. Cross-state allowed when radius is wide enough
  // for border metro areas (exact miles need geocoding later).
  if (input.sameCity || input.sameState) return true;
  if (input.contractorRadiusMiles >= 50) return true;
  return false;
}

export function inferStateFromLocation(location: string): string | null {
  const trimmed = location.trim();
  const code = trimmed.match(/\b([A-Z]{2})\b/);
  if (code) return code[1] ?? null;
  // Fallback for legacy free-text like "Maryland"
  const lower = trimmed.toLowerCase();
  const byName: Record<string, string> = {
    maryland: "MD",
    virginia: "VA",
    "west virginia": "WV",
    pennsylvania: "PA",
    delaware: "DE",
    "district of columbia": "DC",
    washington: "WA",
  };
  for (const [name, state] of Object.entries(byName)) {
    if (lower.includes(name)) return state;
  }
  return null;
}

export function inferCityFromLocation(location: string): string | null {
  const beforeComma = location.split(",")[0]?.trim();
  return beforeComma && beforeComma.length > 1 ? beforeComma : null;
}
