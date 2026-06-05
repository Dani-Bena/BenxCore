import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const booleanQuery = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean().optional());

const optionalDateQuery = z.preprocess(
  emptyStringToUndefined,
  z.coerce.date().optional()
);

export const listAccountsQuerySchema = z.object({
  includeInactive: booleanQuery,
});

export const listJournalEntriesQuerySchema = z.object({
  source: z.enum(["INVOICE", "PAYMENT", "MANUAL"]).optional(),
  dateFrom: optionalDateQuery,
  dateTo: optionalDateQuery,
});

export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>;
export type ListJournalEntriesQuery = z.infer<
  typeof listJournalEntriesQuerySchema
>;