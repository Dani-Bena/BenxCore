import { Router } from "express";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";
import { getAuthContext, parseId } from "../../utils/http.js";
import {
  createInvoiceSeriesSchema,
  updateInvoiceSeriesSchema,
} from "./invoice-series.schemas.js";
import {
  createInvoiceSeries,
  deactivateInvoiceSeries,
  getInvoiceSeriesById,
  listInvoiceSeries,
  updateInvoiceSeries,
} from "./invoice-series.service.js";

export const invoiceSeriesRouter = Router();

invoiceSeriesRouter.use(authMiddleware);

invoiceSeriesRouter.get("/", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  const includeInactive = req.query.includeInactive === "true";
  const invoiceSeries = await listInvoiceSeries(context, {
    includeInactive,
  });

  res.json({
    invoiceSeries,
  });
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

  const invoiceSeries = await getInvoiceSeriesById(context, {
    invoiceSeriesId,
  });

  res.json({
    invoiceSeries,
  });
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

  const invoiceSeries = await createInvoiceSeries(context, result.data);

  res.status(201).json({
    invoiceSeries,
  });
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

  const invoiceSeries = await updateInvoiceSeries(
    context,
    { invoiceSeriesId },
    result.data
  );

  res.json({
    invoiceSeries,
  });
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

  const invoiceSeries = await deactivateInvoiceSeries(context, {
    invoiceSeriesId,
  });

  res.json({
    message: "Invoice series deactivated successfully",
    invoiceSeries,
  });
});
