import { Router } from "express";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";
import {
  createInvoiceSeriesSchema,
  updateInvoiceSeriesSchema,
} from "./invoice-series.schemas.js";
import {
  InvoiceSeriesServiceError,
  createInvoiceSeries,
  deactivateInvoiceSeries,
  getInvoiceSeriesById,
  listInvoiceSeries,
  updateInvoiceSeries,
} from "./invoice-series.service.js";

export const invoiceSeriesRouter = Router();

invoiceSeriesRouter.use(authMiddleware);

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

function handleServiceError(error: unknown, res: any) {
  if (error instanceof InvoiceSeriesServiceError) {
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

invoiceSeriesRouter.get("/", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  try {
    const includeInactive = req.query.includeInactive === "true";
    const invoiceSeries = await listInvoiceSeries(context, {
      includeInactive,
    });

    res.json({
      invoiceSeries,
    });
  } catch (error) {
    handleServiceError(error, res);
  }
});

invoiceSeriesRouter.get("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const invoiceSeriesId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!invoiceSeriesId) {
    res.status(400).json({
      message: "Invalid invoice series id",
    });
    return;
  }

  try {
    const invoiceSeries = await getInvoiceSeriesById(context, {
      invoiceSeriesId,
    });

    res.json({
      invoiceSeries,
    });
  } catch (error) {
    handleServiceError(error, res);
  }
});

invoiceSeriesRouter.post("/", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  const result = createInvoiceSeriesSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid request data",
      errors: result.error.flatten(),
    });
    return;
  }

  try {
    const invoiceSeries = await createInvoiceSeries(context, result.data);

    res.status(201).json({
      invoiceSeries,
    });
  } catch (error) {
    handleServiceError(error, res);
  }
});

invoiceSeriesRouter.put("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const invoiceSeriesId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!invoiceSeriesId) {
    res.status(400).json({
      message: "Invalid invoice series id",
    });
    return;
  }

  const result = updateInvoiceSeriesSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid request data",
      errors: result.error.flatten(),
    });
    return;
  }

  try {
    const invoiceSeries = await updateInvoiceSeries(
      context,
      { invoiceSeriesId },
      result.data
    );

    res.json({
      invoiceSeries,
    });
  } catch (error) {
    handleServiceError(error, res);
  }
});

invoiceSeriesRouter.delete("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const invoiceSeriesId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!invoiceSeriesId) {
    res.status(400).json({
      message: "Invalid invoice series id",
    });
    return;
  }

  try {
    const invoiceSeries = await deactivateInvoiceSeries(context, {
      invoiceSeriesId,
    });

    res.json({
      message: "Invoice series deactivated successfully",
      invoiceSeries,
    });
  } catch (error) {
    handleServiceError(error, res);
  }
});