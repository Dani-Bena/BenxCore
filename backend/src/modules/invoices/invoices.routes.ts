import { Router, type Response } from "express";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";
import {
  createInvoiceSchema,
  registerPaymentSchema,
  updateDraftInvoiceSchema,
} from "./invoices.schemas.js";
import { generateInvoicePdf } from "./invoice-pdf.service.js";
import { generatePaymentReceiptPdf } from "./payment-receipt-pdf.service.js";
import {
  InvoiceServiceError,
  cancelDraftInvoice,
  createDraftInvoice,
  getInvoiceById,
  issueInvoice,
  listInvoicePayments,
  listInvoices,
  registerInvoicePayment,
  updateDraftInvoice,
} from "./invoices.service.js";

export const invoicesRouter = Router();

invoicesRouter.use(authMiddleware);

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

function handleInvoiceError(error: unknown, res: Response) {
  if (error instanceof InvoiceServiceError) {
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

/**
 * GET /api/invoices
 * List invoices for the authenticated company.
 */
invoicesRouter.get("/", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  try {
    const invoices = await listInvoices(context);

    res.json({
      invoices,
    });
  } catch (error) {
    handleInvoiceError(error, res);
  }
});

/**
 * GET /api/invoices/:id/pdf
 * Generate PDF for an issued invoice.
 */
invoicesRouter.get("/:id/pdf", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const invoiceId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!invoiceId) {
    res.status(400).json({
      message: "Invalid invoice id",
    });
    return;
  }

  try {
    const pdf = await generateInvoicePdf(context, { invoiceId });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${pdf.filename}"`
    );

    res.send(pdf.buffer);
  } catch (error) {
    handleInvoiceError(error, res);
  }
});

/**
 * GET /api/invoices/:id/payments/:paymentId/receipt
 * Generate payment receipt PDF.
 */
invoicesRouter.get("/:id/payments/:paymentId/receipt", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const invoiceId = parseId(req.params.id);
  const paymentId = parseId(req.params.paymentId);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!invoiceId) {
    res.status(400).json({
      message: "Invalid invoice id",
    });
    return;
  }

  if (!paymentId) {
    res.status(400).json({
      message: "Invalid payment id",
    });
    return;
  }

  try {
    const pdf = await generatePaymentReceiptPdf(context, {
      invoiceId,
      paymentId,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${pdf.filename}"`
    );

    res.send(pdf.buffer);
  } catch (error) {
    handleInvoiceError(error, res);
  }
});

/**
 * GET /api/invoices/:id/payments
 * List invoice payments.
 */
invoicesRouter.get("/:id/payments", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const invoiceId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!invoiceId) {
    res.status(400).json({
      message: "Invalid invoice id",
    });
    return;
  }

  try {
    const payments = await listInvoicePayments(context, { invoiceId });

    res.json({
      payments,
    });
  } catch (error) {
    handleInvoiceError(error, res);
  }
});

/**
 * GET /api/invoices/:id
 * Get invoice detail.
 */
invoicesRouter.get("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const invoiceId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!invoiceId) {
    res.status(400).json({
      message: "Invalid invoice id",
    });
    return;
  }

  try {
    const invoice = await getInvoiceById(context, { invoiceId });

    res.json({
      invoice,
    });
  } catch (error) {
    handleInvoiceError(error, res);
  }
});

/**
 * POST /api/invoices
 * Create draft invoice.
 */
invoicesRouter.post("/", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  const result = createInvoiceSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid request data",
      errors: result.error.flatten(),
    });
    return;
  }

  try {
    const invoice = await createDraftInvoice(context, result.data);

    res.status(201).json({
      invoice,
    });
  } catch (error) {
    handleInvoiceError(error, res);
  }
});

/**
 * POST /api/invoices/:id/issue
 * Issue draft invoice.
 */
invoicesRouter.post("/:id/issue", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const invoiceId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!invoiceId) {
    res.status(400).json({
      message: "Invalid invoice id",
    });
    return;
  }

  try {
    const invoice = await issueInvoice(context, { invoiceId });

    res.json({
      invoice,
    });
  } catch (error) {
    handleInvoiceError(error, res);
  }
});

/**
 * POST /api/invoices/:id/payments
 * Register invoice payment.
 */
invoicesRouter.post("/:id/payments", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const invoiceId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!invoiceId) {
    res.status(400).json({
      message: "Invalid invoice id",
    });
    return;
  }

  const result = registerPaymentSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid request data",
      errors: result.error.flatten(),
    });
    return;
  }

  try {
    const paymentResult = await registerInvoicePayment(
      context,
      { invoiceId },
      result.data
    );

    res.status(201).json(paymentResult);
  } catch (error) {
    handleInvoiceError(error, res);
  }
});

/**
 * PUT /api/invoices/:id
 * Update draft invoice.
 */
invoicesRouter.put("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const invoiceId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!invoiceId) {
    res.status(400).json({
      message: "Invalid invoice id",
    });
    return;
  }

  const result = updateDraftInvoiceSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid request data",
      errors: result.error.flatten(),
    });
    return;
  }

  try {
    const invoice = await updateDraftInvoice(
      context,
      { invoiceId },
      result.data
    );

    res.json({
      invoice,
    });
  } catch (error) {
    handleInvoiceError(error, res);
  }
});

/**
 * DELETE /api/invoices/:id
 * Cancel draft invoice.
 */
invoicesRouter.delete("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const invoiceId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!invoiceId) {
    res.status(400).json({
      message: "Invalid invoice id",
    });
    return;
  }

  try {
    const invoice = await cancelDraftInvoice(context, { invoiceId });

    res.json({
      message: "Draft invoice cancelled successfully",
      invoice,
    });
  } catch (error) {
    handleInvoiceError(error, res);
  }
});