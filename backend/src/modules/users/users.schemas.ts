import { z } from "zod";

export const userRoleSchema = z.enum(["ADMIN", "ACCOUNTANT", "USER"]);

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(8, "Password must have at least 8 characters"),
  role: userRoleSchema.default("USER"),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  email: z.string().trim().email("Invalid email").optional(),
  password: z
    .string()
    .min(8, "Password must have at least 8 characters")
    .optional(),
  role: userRoleSchema.optional(),
  active: z.boolean().optional(),
});

export const listUsersQuerySchema = z.object({
  includeInactive: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;