import { z } from "zod";

// Convierte strings vacíos a null para compatibilidad con forms HTML
const emptyStringToNull = (value: unknown) => {
  if (value === "") return null;
  return value;
};

// Bug fix: nullish() = nullable + optional, evita que z.string() rechace null
// antes de que el schema llegue al validador nullable()
const nullableTrimmedString = (max: number, message: string) =>
  z.preprocess(
    emptyStringToNull,
    z.string().trim().max(max, message).nullish()
  );

const decimalNumber = (fieldName: string) =>
  z
    .number({ message: `${fieldName} must be a number` })
    .min(0, `${fieldName} cannot be negative`)
    .max(99_999_999.99, `${fieldName} is too high`);

// Nuevo helper simétrico a nullableTrimmedString — aplica preprocess + nullish
const nullableDecimal = (fieldName: string) =>
  z.preprocess(emptyStringToNull, decimalNumber(fieldName).nullish());

export const createProductSchema = z.object({
  code:        nullableTrimmedString(50,   "Code is too long"),
  name:        z.string().trim()
                 .min(2,   "Product name must have at least 2 characters")
                 .max(150, "Product name is too long"),
  description: nullableTrimmedString(1000, "Description is too long"),
  type:        z.enum(["PRODUCT", "SERVICE"]).default("SERVICE"),
  unit:        z.string().trim()
                 .min(1,  "Unit is required")
                 .max(30, "Unit is too long")
                 .default("unit"),
  price:       decimalNumber("Price"),
  costPrice:   nullableDecimal("Cost price"),
  taxRate:     z
                 .number({ message: "Tax rate must be a number" })
                 .min(0,   "Tax rate cannot be negative")
                 .max(100, "Tax rate cannot exceed 100")
                 .default(21),
  revenueAccountId: z
                 .number({ message: "Revenue account must be a number" })
                 .int("Revenue account ID must be an integer")
                 .positive("Revenue account ID must be positive")
                 .nullish(),
});

// PATCH: todos los campos opcionales + active solo editable en update
export const updateProductSchema = createProductSchema
  .partial()
  .extend({ active: z.boolean().optional() });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
