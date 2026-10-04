import { z } from "zod";
import {
  AVAILABILITY_OPTIONS,
  EXPERIENCE_LEVELS,
  PROJECT_TYPES,
  canonicalizeSkillList,
  parseTagListInput,
} from "@/lib/taxonomy";
import { US_STATE_CODES } from "@/lib/us-states";

const availabilityValues = ["", ...AVAILABILITY_OPTIONS.map((option) => option.value)] as [
  string,
  ...string[],
];
const experienceValues = EXPERIENCE_LEVELS.map((option) => option.value) as [string, ...string[]];
const projectTypes = PROJECT_TYPES as unknown as [string, ...string[]];
const stateCodes = US_STATE_CODES as unknown as [string, ...string[]];

function asString(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

function textField(max: number, requiredMessage: string, lengthMessage: string) {
  return z
    .unknown()
    .transform((value) => (typeof value === "string" ? value.trim() : ""))
    .pipe(z.string().min(1, requiredMessage).max(max, lengthMessage));
}

function moneyField(label: string, max: number) {
  return z
    .unknown()
    .transform(asString)
    .pipe(
      z
        .string()
        .regex(
          /^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/,
          `${label} must be a positive amount with up to 2 decimal places.`,
        )
        .refine((value) => {
          const amount = Number(value);
          return amount > 0 && amount <= max;
        }, `${label} must be between 0.01 and ${max}.`),
    );
}

function parseUrlList(value: unknown, max: number) {
  const raw =
    typeof value === "string"
      ? value
      : Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string").join("\n")
        : "";
  return [
    ...new Set(
      raw
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter((item) => {
          if (!item) return false;
          try {
            const url = new URL(item);
            return url.protocol === "https:" || url.protocol === "http:";
          } catch {
            return false;
          }
        }),
    ),
  ].slice(0, max);
}

export const jobSchema = z
  .object({
    title: textField(120, "Title is required.", "Title must be 120 characters or fewer."),
    description: textField(5000, "Description is required.", "Description must be 5000 characters or fewer."),
    budget: moneyField("Budget", 1_000_000),
    city: textField(80, "City is required.", "City must be 80 characters or fewer."),
    state: z
      .unknown()
      .transform((value) => (typeof value === "string" ? value.trim().toUpperCase() : ""))
      .pipe(z.enum(stateCodes, { message: "Choose a state." })),
    requiredSkills: z
      .unknown()
      .transform((value) => canonicalizeSkillList(parseTagListInput(value, 20)))
      .refine((value) => value.length > 0, "Choose at least one required skill."),
    projectType: z
      .unknown()
      .transform((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
      .pipe(z.enum(projectTypes, { message: "Choose a project type." })),
    experienceLevel: z
      .unknown()
      .transform((value) => (typeof value === "string" ? value.trim() : "any"))
      .pipe(z.enum(experienceValues, { message: "Choose an experience level." })),
    availabilityNeeded: z
      .unknown()
      .transform((value) => (typeof value === "string" ? value.trim() : ""))
      .pipe(z.enum(availabilityValues, { message: "Choose when you need the work." }))
      .transform((value) => (value.length > 0 ? value : null)),
    imageUrls: z.unknown().transform((value) => parseUrlList(value, 8)),
  })
  .transform((data) => ({
    ...data,
    location: `${data.city}, ${data.state}`,
  }));

export const bidSchema = z.object({
  amount: moneyField("Bid amount", 1_000_000),
  message: textField(2000, "Message is required.", "Message must be 2000 characters or fewer."),
  estimatedDuration: textField(
    120,
    "Estimated time is required.",
    "Estimated time must be 120 characters or fewer.",
  ),
});

export type JobInput = z.infer<typeof jobSchema>;
export type BidInput = z.infer<typeof bidSchema>;

export function validationMessage(error: z.ZodError) {
  return error.issues
    .slice(0, 3)
    .map((issue) => issue.message)
    .join(" ");
}

export function jobInputFromFormData(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description"),
    budget: formData.get("budget"),
    city: formData.get("city"),
    state: formData.get("state"),
    requiredSkills: formData.get("requiredSkills"),
    projectType: formData.get("projectType"),
    experienceLevel: formData.get("experienceLevel"),
    availabilityNeeded: formData.get("availabilityNeeded"),
    imageUrls: formData.get("imageUrls"),
  };
}

export function bidInputFromFormData(formData: FormData) {
  return {
    amount: formData.get("amount"),
    message: formData.get("message"),
    estimatedDuration: formData.get("estimatedDuration"),
  };
}
