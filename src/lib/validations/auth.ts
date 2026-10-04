import { UserRole } from "@prisma/client";
import { z } from "zod";

export const userRoles = [UserRole.CUSTOMER, UserRole.CONTRACTOR] as const;

export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Email is required.")
      .email("Enter a valid email address.")
      .max(254, "Email is too long.")
      .transform((value) => value.toLowerCase()),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password must be at most 72 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
    role: z.enum(userRoles, {
      message: "Choose customer or contractor.",
    }),
    acceptLegal: z.literal(true, { message: "You must accept the Terms and Privacy Policy." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password is required."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type CredentialsInput = z.infer<typeof credentialsSchema>;
