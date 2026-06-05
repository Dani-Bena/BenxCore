import { Router, type Response } from "express";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";
import {
  listAccountsQuerySchema,
  listJournalEntriesQuerySchema,
} from "./accounting.schemas.js";
import {
  AccountingServiceError,
  getJournalEntryById,
  listAccountingAccounts,
  listJournalEntries,
} from "./accounting.service.js";

export const accountingRouter = Router();

accountingRouter.use(authMiddleware);

function getCompanyId(req: AuthenticatedRequest): number | null {
  return req.auth?.companyId ?? null;
}

function getUserId(req: AuthenticatedRequest): number | null {
  return req.auth?.userId ?? null;
}

function parseId(id: string | undefined): number | null {
  if (!id) return null;

  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return parsedId;
}

function getAuthContext(req: AuthenticatedRequest) {
  const companyId = getCompanyId(req);

  if (!companyId) {
    return null;
  }

  return {
    companyId,
    userId: getUserId(req),
  };
}

function handleAccountingError(error: unknown, res: Response) {
  if (error instanceof AccountingServiceError) {
    res.status(error.statusCode).json({
      message: error.message,
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    message: "Internal server error",
  });
}

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

  try {
    const accounts = await listAccountingAccounts(context, result.data);

    res.json({
      accounts,
    });
  } catch (error) {
    handleAccountingError(error, res);
  }
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

  try {
    const journalEntries = await listJournalEntries(context, result.data);

    res.json({
      journalEntries,
    });
  } catch (error) {
    handleAccountingError(error, res);
  }
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

  try {
    const journalEntry = await getJournalEntryById(context, {
      journalEntryId,
    });

    res.json({
      journalEntry,
    });
  } catch (error) {
    handleAccountingError(error, res);
  }
});