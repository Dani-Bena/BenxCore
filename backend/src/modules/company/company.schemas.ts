import { z } from "zod";

const emptyStringToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

export const updateCompanySchema = z.object({
  name: z.string().min(2, "Company name must have at least 2 characters").optional(),
  nif: z.preprocess(emptyStringToNull, z.string().max(20, "NIF is too long").nullable().optional()),
  email: z.preprocess(emptyStringToNull, z.string().email("Invalid email").nullable().optional()),
  phone: z.preprocess(emptyStringToNull, z.string().max(30, "Phone is too long").nullable().optional()),
  address: z.preprocess(emptyStringToNull, z.string().max(255, "Address is too long").nullable().optional()),
});