import { z } from "zod";

const emptyStringToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
};

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const nullableTrimmedString = (max: number, message: string) =>
  z.preprocess(
    emptyStringToNull,
    z.string().trim().max(max, message).nullish()
  );

const nullableUppercaseString = (max: number, message: string) =>
  z.preprocess(
    emptyStringToNull,
    z.string().trim().toUpperCase().max(max, message).nullish()
  );

const requiredDecimal = (fieldName: string) =>
  z.preprocess(
    emptyStringToUndefined,
    z.coerce
      .number({
        message: `${fieldName} must be a number`,
      })
      .min(0, `${fieldName} cannot be negative`)
      .max(99_999_999.99, `${fieldName} is too high`)
  );

const nullableDecimal = (fieldName: string) =>
  z.preprocess(
    emptyStringToNull,
    z.coerce
      .number({
        message: `${fieldName} must be a number`,
      })
      .min(0, `${fieldName} cannot be negative`)
      .max(99_999_999.99, `${fieldName} is too high`)
      .nullish()
  );

const optionalPositiveInteger = (fieldName: string) =>
  z.preprocess(
    emptyStringToNull,
    z.coerce
      .number({
        message: `${fieldName} must be a number`,
      })
      .int(`${fieldName} must be an integer`)
      .positive(`${fieldName} must be positive`)
      .nullish()
  );

export const createProductSchema = z.object({
  code: nullableUppercaseString(50, "Code is too long"),

  name: z
    .string()
    .trim()
    .min(2, "Product name must have at least 2 characters")
    .max(150, "Product name is too long"),

  description: nullableTrimmedString(1000, "Description is too long"),

  type: z.enum(["PRODUCT", "SERVICE"]).default("SERVICE"),

  unit: z
    .string()
    .trim()
    .min(1, "Unit is required")
    .max(30, "Unit is too long")
    .default("unit"),

  price: requiredDecimal("Price"),

  costPrice: nullableDecimal("Cost price"),

  taxRate: z.preprocess(
    emptyStringToUndefined,
    z.coerce
      .number({
        message: "Tax rate must be a number",
      })
      .min(0, "Tax rate cannot be negative")
      .max(100, "Tax rate cannot exceed 100")
      .default(21)
  ),

  revenueAccountId: optionalPositiveInteger("Revenue account ID"),
});

export const updateProductSchema = z.object({
  code: nullableUppercaseString(50, "Code is too long"),

  name: z
    .string()
    .trim()
    .min(2, "Product name must have at least 2 characters")
    .max(150, "Product name is too long")
    .optional(),

  description: nullableTrimmedString(1000, "Description is too long"),

  type: z.enum(["PRODUCT", "SERVICE"]).optional(),

  unit: z
    .string()
    .trim()
    .min(1, "Unit is required")
    .max(30, "Unit is too long")
    .optional(),

  price: requiredDecimal("Price").optional(),

  costPrice: nullableDecimal("Cost price"),

  taxRate: z.preprocess(
    emptyStringToUndefined,
    z.coerce
      .number({
        message: "Tax rate must be a number",
      })
      .min(0, "Tax rate cannot be negative")
      .max(100, "Tax rate cannot exceed 100")
      .optional()
  ),

  revenueAccountId: optionalPositiveInteger("Revenue account ID"),

  active: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;