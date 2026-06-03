import { z } from "zod";

export const updateCompanySchema = z.object({
  name: z.string().min(2, "Company name must have at least 2 characters").optional(),
  nif: z.string().max(20, "NIF is too long").nullable().optional(),
  email: z.string().email("Invalid email").nullable().optional(),
  phone: z.string().max(30, "Phone is too long").nullable().optional(),
  address: z.string().max(255, "Address is too long").nullable().optional(),
});