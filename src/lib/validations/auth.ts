import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: passwordSchema,
});

export const signUpSchema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const onboardingSchema = z.object({
  teamName: z.string().min(2, "Team name must be at least 2 characters").max(50),
  eaId: z.string().min(2, "EA ID must be at least 2 characters").max(30),
});

/** Same rules as onboarding; used when players edit profile after signup. */
export const playerProfileSchema = onboardingSchema;
