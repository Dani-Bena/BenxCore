import { z } from "zod";

export const registerSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  companyNif: z.string().min(5, "Company NIF is required").max(20, "NIF is too long"),
  companyAddress: z.string().min(2, "Company address is required").max(255, "Address is too long"),
  companyEmail: z.string().email("Invalid company email").optional().or(z.literal("")),
  companyPhone: z.string().max(30, "Phone is too long").optional().or(z.literal("")),
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must have at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;