import { z } from "zod";

export const hireRequestSchema = z.object({
  message: z
    .unknown()
    .transform((value) => (typeof value === "string" ? value.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Describe the work you need done.")
        .max(2000, "Description must be 2000 characters or fewer."),
    ),
});

export function hireRequestValidationMessage(error: z.ZodError) {
  return error.issues
    .slice(0, 3)
    .map((issue) => issue.message)
    .join(" ");
}
