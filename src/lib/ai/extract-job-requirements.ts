import { z } from "zod";
import { generateGeminiJson, hasGeminiKey } from "@/lib/ai/gemini";
import { canonicalizeSkillList } from "@/lib/taxonomy";

const extractionSchema = z.object({
  skills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  projectType: z.string().nullable().optional(),
  experienceLevel: z.enum(["any", "entry", "experienced", "expert"]).nullable().optional(),
  availability: z.string().nullable().optional(),
  locationRequired: z.boolean().optional(),
  budgetMin: z.number().nullable().optional(),
  budgetMax: z.number().nullable().optional(),
});

export type ExtractedJobRequirements = z.infer<typeof extractionSchema>;

const SKILL_KEYWORDS = [
  "plumbing",
  "tiling",
  "tile",
  "electrical",
  "electric",
  "drywall",
  "painting",
  "carpentry",
  "cabinet",
  "roofing",
  "hvac",
  "flooring",
  "remodel",
  "renovation",
  "landscaping",
  "concrete",
  "framing",
  "insulation",
  "waterproofing",
  "pipe",
];

function normalizeSkill(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 60);
}

function uniqueSkills(values: string[]) {
  return [...new Set(values.map(normalizeSkill).filter(Boolean))].slice(0, 20);
}

export function heuristicExtractJob(input: {
  title: string;
  description: string;
  budget?: number | null;
  location: string;
}): ExtractedJobRequirements {
  const text = `${input.title} ${input.description}`.toLowerCase();
  const skills = SKILL_KEYWORDS.filter((skill) => text.includes(skill)).map((skill) =>
    skill === "tile" ? "tiling" : skill === "electric" ? "electrical" : skill === "pipe" ? "plumbing" : skill,
  );

  let experienceLevel: ExtractedJobRequirements["experienceLevel"] = "any";
  if (/\b(expert|master|licensed|highly experienced)\b/.test(text)) experienceLevel = "expert";
  else if (/\b(experienced|years of experience|seasoned)\b/.test(text)) experienceLevel = "experienced";
  else if (/\b(beginner|entry|junior)\b/.test(text)) experienceLevel = "entry";

  let availability: string | null = null;
  if (/\bnext week\b/.test(text)) availability = "next week";
  else if (/\basap|urgent|immediately\b/.test(text)) availability = "asap";
  else if (/\bthis month\b/.test(text)) availability = "this month";

  let projectType: string | null = null;
  if (text.includes("bathroom")) projectType = "bathroom remodeling";
  else if (text.includes("kitchen")) projectType = "kitchen renovation";
  else if (text.includes("roof")) projectType = "roofing";
  else if (skills[0]) projectType = skills[0];

  const budget = input.budget && input.budget > 0 ? input.budget : null;

  return {
    skills: canonicalizeSkillList(uniqueSkills(skills)),
    preferredSkills: [],
    projectType,
    experienceLevel,
    availability,
    locationRequired: true,
    budgetMin: budget ? Number((budget * 0.85).toFixed(2)) : null,
    budgetMax: budget,
  };
}

export async function extractJobRequirements(input: {
  title: string;
  description: string;
  budget?: number | null;
  location: string;
}): Promise<{ data: ExtractedJobRequirements; source: "gemini" | "heuristic"; raw: unknown }> {
  const fallback = heuristicExtractJob(input);
  if (!hasGeminiKey()) {
    return { data: fallback, source: "heuristic", raw: fallback };
  }

  const sanitized = {
    title: input.title.slice(0, 120),
    description: input.description.slice(0, 2500),
    budget: input.budget ?? null,
    location: input.location.replace(/\d{3,}/g, "").slice(0, 120),
  };

  const raw = await generateGeminiJson({
    system:
      "Extract structured contractor job requirements as JSON only. Do not invent personal data. " +
      "Return keys: skills (string[]), preferredSkills (string[]), projectType (string|null), " +
      "experienceLevel (any|entry|experienced|expert|null), availability (string|null), " +
      "locationRequired (boolean), budgetMin (number|null), budgetMax (number|null). " +
      "Normalize skills to short lowercase phrases.",
    user: JSON.stringify(sanitized),
  });

  const parsed = extractionSchema.safeParse(raw);
  if (!parsed.success) {
    return { data: fallback, source: "heuristic", raw: raw ?? fallback };
  }

  return {
    data: {
      ...parsed.data,
      skills: canonicalizeSkillList(uniqueSkills(parsed.data.skills)),
      preferredSkills: canonicalizeSkillList(uniqueSkills(parsed.data.preferredSkills)),
      projectType: parsed.data.projectType ? normalizeSkill(parsed.data.projectType) : null,
      availability: parsed.data.availability?.slice(0, 80) ?? null,
      budgetMin: parsed.data.budgetMin ?? fallback.budgetMin,
      budgetMax: parsed.data.budgetMax ?? fallback.budgetMax,
    },
    source: "gemini",
    raw,
  };
}
