import { Router } from "express";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";
import { getAuthContext, parseId } from "../../utils/http.js";
import {
  listAccountsQuerySchema,
  listJournalEntriesQuerySchema,
} from "./accounting.schemas.js";
import {
  getJournalEntryById,
  listAccountingAccounts,
  listJournalEntries,
} from "./accounting.service.js";

export const accountingRouter = Router();

accountingRouter.use(authMiddleware);

accountingRouter.get("/accounts", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  const result = listAccountsQuerySchema.safeParse(req.query);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid query parameters",
      errors: result.error.flatten(),
    });
    return;
  }

  const accounts = await listAccountingAccounts(context, result.data);

  res.json({
    accounts,
  });
});

accountingRouter.get("/journal-entries", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  const result = listJournalEntriesQuerySchema.safeParse(req.query);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid query parameters",
      errors: result.error.flatten(),
    });
    return;
  }

  const journalEntries = await listJournalEntries(context, result.data);

  res.json({
    journalEntries,
  });
});

accountingRouter.get("/journal-entries/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const journalEntryId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!journalEntryId) {
    res.status(400).json({
      message: "Invalid journal entry id",
    });
    return;
  }

  const journalEntry = await getJournalEntryById(context, {
    journalEntryId,
  });

  res.json({
    journalEntry,
  });
});
