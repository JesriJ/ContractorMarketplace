import { z } from "zod";

export const messageSchema = z.object({
  content: z
    .unknown()
    .transform((value) => (typeof value === "string" ? value.trim() : ""))
    .pipe(
      z.string().min(1, "Message cannot be empty.").max(2000, "Message must be 2000 characters or fewer."),
    )
    .refine(
      (value) =>
        !/\b(?:\d[ -]*?){13,19}\b/.test(value) &&
        !/\b(?:routing|account)\s*(?:number|#|no\.?)?\s*[:=-]?\s*\d{6,17}\b/i.test(value),
      "Do not send card or bank account numbers. Arrange payment details outside the platform.",
    ),
});

export function messageValidationError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid message.";
}
