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

const nullableDate = z.preprocess(
  emptyStringToNull,
  z.coerce.date().nullish()
);

const requiredPositiveDecimal = (fieldName: string) =>
  z.preprocess(
    emptyStringToUndefined,
    z.coerce
      .number({
        message: `${fieldName} must be a number`,
      })
      .positive(`${fieldName} must be greater than zero`)
      .max(99_999_999.99, `${fieldName} is too high`)
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

export const invoiceLineInputSchema = z.object({
  productId: optionalPositiveInteger("Product ID"),

  description: z
    .string()
    .trim()
    .min(2, "Line description must have at least 2 characters")
    .max(255, "Line description is too long"),

  unit: z
    .string()
    .trim()
    .min(1, "Unit is required")
    .max(30, "Unit is too long")
    .default("unit"),

  quantity: requiredPositiveDecimal("Quantity"),

  unitPrice: requiredDecimal("Unit price"),

  discountRate: z.preprocess(
    emptyStringToUndefined,
    z.coerce
      .number({
        message: "Discount rate must be a number",
      })
      .min(0, "Discount rate cannot be negative")
      .max(100, "Discount rate cannot exceed 100")
      .default(0)
  ),

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
});

export const createInvoiceSchema = z.object({
  clientId: z.coerce
    .number({
      message: "Client ID must be a number",
    })
    .int("Client ID must be an integer")
    .positive("Client ID must be positive"),

  invoiceSeriesId: optionalPositiveInteger("Invoice series ID"),

  type: z.enum(["STANDARD", "PROFORMA"]).default("STANDARD"),

  dueDate: nullableDate,

  notes: nullableTrimmedString(1000, "Notes are too long"),

  lines: z
    .array(invoiceLineInputSchema)
    .min(1, "Invoice must have at least one line"),
});

export const updateDraftInvoiceSchema = z.object({
  clientId: optionalPositiveInteger("Client ID"),

  invoiceSeriesId: optionalPositiveInteger("Invoice series ID"),

  dueDate: nullableDate.optional(),

  notes: nullableTrimmedString(1000, "Notes are too long"),

  lines: z.array(invoiceLineInputSchema).min(1).optional(),
});

export type InvoiceLineInput = z.infer<typeof invoiceLineInputSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateDraftInvoiceInput = z.infer<typeof updateDraftInvoiceSchema>;