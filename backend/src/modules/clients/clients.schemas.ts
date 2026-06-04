import { z } from "zod";

const emptyStringToNull = (value: unknown) => {
  if (value === "") return null;
  return value;
};

const nullableTrimmedString = (max: number, message: string) =>
  z.preprocess(
    emptyStringToNull,
    z.string().trim().max(max, message).nullable().optional()
  );

export const createClientSchema = z.object({
  legalName: z
    .string()
    .trim()
    .min(2, "Legal name must have at least 2 characters")
    .max(150, "Legal name is too long"),

  tradeName: nullableTrimmedString(150, "Trade name is too long"),

  type: z
    .enum(["COMPANY", "FREELANCER", "INDIVIDUAL", "PUBLIC_ENTITY", "OTHER"])
    .default("COMPANY"),

  taxId: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .trim()
      .toUpperCase()
      .min(5, "Tax ID is too short")
      .max(20, "Tax ID is too long")
      .regex(/^[A-Z0-9\-]{5,20}$/, "Tax ID contains invalid characters")
      .nullable()
      .optional()
  ),

  taxIdType: z
    .enum(["NIF", "CIF", "NIE", "VAT", "PASSPORT", "OTHER"])
    .default("CIF"),

  email: z.preprocess(
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

  invoicingEmail: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid invoicing email")
      .max(255, "Invoicing email is too long")
      .nullable()
      .optional()
  ),

  phone: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .trim()
      .regex(/^\+?[0-9\s\-().]{7,30}$/, "Invalid phone format")
      .nullable()
      .optional()
  ),

  contactName: nullableTrimmedString(150, "Contact name is too long"),

  address: nullableTrimmedString(255, "Address is too long"),

  city: nullableTrimmedString(100, "City is too long"),

  province: nullableTrimmedString(100, "Province is too long"),

  postalCode: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .trim()
      .max(20, "Postal code is too long")
      .nullable()
      .optional()
  ),

  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, "Country code must use ISO 2-letter format")
    .default("ES"),

  paymentTermsDays: z
    .number()
    .int("Payment terms must be an integer")
    .min(0, "Payment terms cannot be negative")
    .max(365, "Payment terms are too long")
    .default(0),

  notes: nullableTrimmedString(1000, "Notes are too long"),
});

export const updateClientSchema = createClientSchema.partial().extend({
  active: z.boolean().optional(),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;