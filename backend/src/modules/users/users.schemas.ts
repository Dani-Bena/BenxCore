import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const userRoleSchema = z.enum(["ADMIN", "ACCOUNTANT", "MANAGER", "VIEWER"]);

const booleanQuery = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean().optional());

export const listUsersQuerySchema = z.object({
  includeInactive: booleanQuery,
});

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "User name must have at least 2 characters")
    .max(100, "User name is too long"),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email")
    .max(255, "Email is too long"),

  password: z
    .string()
    .min(8, "Password must have at least 8 characters")
    .max(100, "Password is too long"),

  role: userRoleSchema.default("VIEWER"),
});

export const updateUserSchema = z.object({
  name: z
    .preprocess(
      emptyStringToUndefined,
      z
        .string()
        .trim()
        .min(2, "User name must have at least 2 characters")
        .max(100, "User name is too long")
        .optional()
    ),

  email: z
    .preprocess(
      emptyStringToUndefined,
      z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email")
        .max(255, "Email is too long")
        .optional()
    ),

  password: z
    .preprocess(
      emptyStringToUndefined,
      z
        .string()
        .min(8, "Password must have at least 8 characters")
        .max(100, "Password is too long")
        .optional()
    ),

  role: userRoleSchema.optional(),

  active: z.boolean().optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;