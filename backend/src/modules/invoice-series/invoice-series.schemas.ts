import { z } from "zod";

const emptyStringToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
};

const nullableYear = z.preprocess(
  emptyStringToNull,
  z.coerce
    .number({
      message: "Year must be a number",
    })
    .int("Year must be an integer")
    .min(2000, "Year is too old")
    .max(2100, "Year is too far in the future")
    .nullish()
);

export const createInvoiceSeriesSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Code must have at least 2 characters")
    .max(30, "Code is too long")
    .regex(/^[A-Z0-9\-_]+$/, "Code contains invalid characters"),

  prefix: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Prefix is required")
    .max(30, "Prefix is too long")
    .regex(/^[A-Z0-9\-_\/]+$/, "Prefix contains invalid characters"),

  currentNumber: z.coerce
    .number({
      message: "Current number must be a number",
    })
    .int("Current number must be an integer")
    .min(0, "Current number cannot be negative")
    .default(0),

  year: nullableYear,
});

export const updateInvoiceSeriesSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Code must have at least 2 characters")
    .max(30, "Code is too long")
    .regex(/^[A-Z0-9\-_]+$/, "Code contains invalid characters")
    .optional(),

  prefix: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Prefix is required")
    .max(30, "Prefix is too long")
    .regex(/^[A-Z0-9\-_\/]+$/, "Prefix contains invalid characters")
    .optional(),

  year: nullableYear.optional(),

  active: z.boolean().optional(),
});

export type CreateInvoiceSeriesInput = z.infer<
  typeof createInvoiceSeriesSchema
>;

export type UpdateInvoiceSeriesInput = z.infer<
  typeof updateInvoiceSeriesSchema
>;