import { z } from "zod";

export const reviewSchema = z.object({
  rating: z
    .unknown()
    .transform((value) => {
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
      if (typeof value === "string") return value.trim();
      return "";
    })
    .pipe(
      z
        .string()
        .regex(/^[1-5]$/, "Rating must be a whole number from 1 to 5.")
        .transform((value) => Number(value)),
    ),
  comment: z
    .unknown()
    .transform((value) => (typeof value === "string" ? value.trim() : ""))
    .pipe(
      z.string().min(1, "Comment is required.").max(2000, "Comment must be 2000 characters or fewer."),
    ),
});

export function reviewValidationError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid review.";
}
