/** Canonical marketplace vocabulary used by profiles, jobs, and matching. */

export const TRADES = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "Carpentry",
  "Painting",
  "Roofing",
  "Flooring",
  "Landscaping",
  "General Contracting",
  "Remodeling",
  "Masonry",
  "Concrete",
  "Drywall",
  "Insulation",
  "Cleaning",
] as const;

export const SKILLS = [
  "plumbing",
  "pipe repair",
  "drain cleaning",
  "water heater",
  "electrical",
  "wiring",
  "panel upgrade",
  "lighting",
  "hvac",
  "furnace",
  "air conditioning",
  "ductwork",
  "carpentry",
  "framing",
  "cabinet installation",
  "trim work",
  "painting",
  "drywall",
  "tiling",
  "flooring",
  "hardwood",
  "vinyl plank",
  "roofing",
  "roof repair",
  "gutter installation",
  "landscaping",
  "lawn care",
  "fencing",
  "concrete",
  "masonry",
  "insulation",
  "waterproofing",
  "demo",
  "cleanup",
] as const;

export const SERVICE_CATEGORIES = [
  "bathroom remodeling",
  "kitchen renovation",
  "basement finishing",
  "home addition",
  "deck and patio",
  "roof replacement",
  "interior painting",
  "exterior painting",
  "flooring installation",
  "electrical repair",
  "plumbing repair",
  "hvac service",
  "landscaping project",
  "general handyman",
  "water damage repair",
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: "asap", label: "Available ASAP" },
  { value: "this_week", label: "This week" },
  { value: "next_week", label: "Next week" },
  { value: "this_month", label: "This month" },
  { value: "flexible", label: "Flexible / by appointment" },
  { value: "weekends", label: "Weekends only" },
  { value: "weekdays", label: "Weekdays only" },
] as const;

export const EXPERIENCE_LEVELS = [
  { value: "any", label: "Any experience level" },
  { value: "entry", label: "Entry / junior OK" },
  { value: "experienced", label: "Experienced (5+ years preferred)" },
  { value: "expert", label: "Expert / licensed specialist" },
] as const;

export const PROJECT_TYPES = [
  "bathroom remodeling",
  "kitchen renovation",
  "basement finishing",
  "roofing",
  "electrical repair",
  "plumbing repair",
  "hvac service",
  "painting",
  "flooring installation",
  "landscaping project",
  "general handyman",
  "other",
] as const;

export type Trade = (typeof TRADES)[number];

export function normalizeTag(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 60);
}

export function normalizeTagList(values: string[], max = 30) {
  return [...new Set(values.map(normalizeTag).filter(Boolean))].slice(0, max);
}

export function parseTagListInput(value: unknown, max = 30) {
  if (Array.isArray(value)) {
    return normalizeTagList(
      value.filter((item): item is string => typeof item === "string"),
      max,
    );
  }
  if (typeof value !== "string") return [];
  return normalizeTagList(
    value.split(/[,;\n]/).map((part) => part.trim()),
    max,
  );
}

export function availabilityLabel(value: string | null | undefined) {
  if (!value) return null;
  return AVAILABILITY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function experienceLabel(value: string | null | undefined) {
  if (!value) return null;
  return EXPERIENCE_LEVELS.find((option) => option.value === value)?.label ?? value;
}

/** Map free text toward the closest canonical skill when possible. */
export function canonicalizeSkill(value: string) {
  const normalized = normalizeTag(value);
  const exact = SKILLS.find((skill) => skill === normalized);
  if (exact) return exact;
  const partial = SKILLS.find(
    (skill) => normalized.includes(skill) || skill.includes(normalized),
  );
  return partial ?? normalized;
}

export function canonicalizeSkillList(values: string[]) {
  return normalizeTagList(values.map(canonicalizeSkill));
}
