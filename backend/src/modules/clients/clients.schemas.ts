import { z } from "zod";

const emptyStringToNull = (value: unknown) => {
  if (value === "") return null;
  return value;
};

export const createClientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Client name must have at least 2 characters")
    .max(150, "Client name is too long"),

  nif: z
    .preprocess(
      emptyStringToNull,
      z
        .string()
        .trim()
        .toUpperCase()
        .min(5, "NIF is too short")
        .max(20, "NIF is too long")
        .regex(/^[A-Z0-9\-]{5,20}$/, "NIF contains invalid characters")
        .nullable()
        .optional()
    ),

  email: z
    .preprocess(
      emptyStringToNull,
      z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email")
        .max(255, "Email is too long")
        .nullable()
        .optional()
    ),

  phone: z
    .preprocess(
      emptyStringToNull,
      z
        .string()
        .trim()
        .regex(/^\+?[0-9\s\-().]{7,30}$/, "Invalid phone format")
        .nullable()
        .optional()
    ),

  address: z
    .preprocess(
      emptyStringToNull,
      z
        .string()
        .trim()
        .max(255, "Address is too long")
        .nullable()
        .optional()
    ),
});

export const updateClientSchema = createClientSchema
  .partial()
  .extend({
    active: z.boolean().optional(),
  });