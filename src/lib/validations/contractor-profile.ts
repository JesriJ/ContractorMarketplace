import { z } from "zod";
import {
  AVAILABILITY_OPTIONS,
  TRADES,
  canonicalizeSkillList,
  parseTagListInput,
} from "@/lib/taxonomy";
import { US_STATE_CODES } from "@/lib/us-states";

const stateCodes = US_STATE_CODES as unknown as [string, ...string[]];
const trades = TRADES as unknown as [string, ...string[]];
const availabilityValues = AVAILABILITY_OPTIONS.map((option) => option.value) as [
  string,
  ...string[],
];

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

export const contractorProfileSchema = z.object({
  companyName: textField(100, "Company name is required.", "Company name must be 100 characters or fewer."),
  trade: z
    .unknown()
    .transform((value) => (typeof value === "string" ? value.trim() : ""))
    .pipe(z.enum(trades, { message: "Choose a trade." })),
  bio: textField(2000, "Bio is required.", "Bio must be 2000 characters or fewer."),
  city: textField(80, "City is required.", "City must be 80 characters or fewer."),
  state: z
    .unknown()
    .transform((value) => (typeof value === "string" ? value.trim().toUpperCase() : ""))
    .pipe(z.enum(stateCodes, { message: "Choose a state." })),
  yearsExperience: z
    .unknown()
    .transform(asString)
    .pipe(
      z
        .string()
        .regex(/^\d{1,2}$/, "Years of experience must be a whole number from 0 to 80.")
        .transform((value) => Number(value))
        .refine((value) => value <= 80, "Years of experience must be 80 or less."),
    ),
  hourlyRate: z
    .unknown()
    .transform(asString)
    .pipe(
      z
        .string()
        .regex(
          /^(?:0|[1-9]\d{0,4})(?:\.\d{1,2})?$/,
          "Hourly rate must be a positive amount with up to 2 decimal places.",
        )
        .refine((value) => {
          const amount = Number(value);
          return amount > 0 && amount <= 10000;
        }, "Hourly rate must be between 0.01 and 10000."),
    ),
  skills: z.unknown().transform((value) => canonicalizeSkillList(parseTagListInput(value, 30))),
  serviceCategories: z.unknown().transform((value) => parseTagListInput(value, 20)),
  serviceRadiusMiles: z
    .unknown()
    .transform(asString)
    .pipe(
      z
        .string()
        .regex(/^\d{1,3}$/, "Service radius must be a whole number from 1 to 500.")
        .transform((value) => Number(value))
        .refine((value) => value >= 1 && value <= 500, "Service radius must be between 1 and 500 miles."),
    ),
  availability: z
    .unknown()
    .transform((value) => (typeof value === "string" ? value.trim() : ""))
    .pipe(z.enum(availabilityValues, { message: "Choose availability." })),
  availabilityNotes: z
    .unknown()
    .transform((value) => (typeof value === "string" ? value.trim() : ""))
    .pipe(z.string().max(500, "Availability notes must be 500 characters or fewer."))
    .transform((value) => (value.length > 0 ? value : null)),
  profileImage: z
    .unknown()
    .transform((value) => (typeof value === "string" ? value.trim() : ""))
    .pipe(
      z
        .string()
        .max(500)
        .refine((value) => {
          if (!value) return true;
          try {
            const url = new URL(value);
            return url.protocol === "https:" || url.protocol === "http:";
          } catch {
            return false;
          }
        }, "Profile image must be a valid http(s) URL."),
    )
    .transform((value) => (value.length > 0 ? value : null)),
  portfolioImages: z.unknown().transform((value) => parseUrlList(value, 12)),
});

export type ContractorProfileInput = z.infer<typeof contractorProfileSchema>;

export function profileValidationMessage(error: z.ZodError) {
  return error.issues
    .slice(0, 3)
    .map((issue) => issue.message)
    .join(" ");
}

export function profileInputFromFormData(formData: FormData) {
  return {
    companyName: formData.get("companyName"),
    trade: formData.get("trade"),
    bio: formData.get("bio"),
    city: formData.get("city"),
    state: formData.get("state"),
    yearsExperience: formData.get("yearsExperience"),
    hourlyRate: formData.get("hourlyRate"),
    skills: formData.get("skills"),
    serviceCategories: formData.get("serviceCategories"),
    serviceRadiusMiles: formData.get("serviceRadiusMiles"),
    availability: formData.get("availability"),
    availabilityNotes: formData.get("availabilityNotes"),
    profileImage: formData.get("profileImage"),
    portfolioImages: formData.get("portfolioImages"),
  };
}
