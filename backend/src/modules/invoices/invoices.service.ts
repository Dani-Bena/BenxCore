import { prisma } from "../../lib/prisma.js";
import {
  createInvoiceIssuedJournalEntry,
  createInvoicePaymentJournalEntry,
} from "../accounting/accounting.service.js";
import type {
  CreateInvoiceInput,
  InvoiceLineInput,
  UpdateDraftInvoiceInput,
  RegisterPaymentInput,
} from "./invoices.schemas.js";

type ServiceContext = {
  companyId: number;
  userId: number | null;
};

type InvoiceIdInput = {
  invoiceId: number;
};

type CalculatedLine = {
  lineNumber: number;
  productId: number | null;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  discountAmount: string;
  taxRate: string;
  subtotal: string;
  taxAmount: string;
  total: string;
};

type TaxSummary = {
  taxRate: string;
  taxBase: string;
  taxAmount: string;
};

export class InvoiceServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

function toAuditJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toMoneyString(value: number): string {
  return roundMoney(value).toFixed(2);
}

function calculateInvoiceLines(lines: InvoiceLineInput[]) {
  const calculatedLines: CalculatedLine[] = [];
  const taxMap = new Map<number, { taxBase: number; taxAmount: number }>();

  let subtotal = 0;
  let taxTotal = 0;
  let total = 0;

  lines.forEach((line, index) => {
    const grossAmount = roundMoney(line.quantity * line.unitPrice);
    const discountAmount = roundMoney(grossAmount * (line.discountRate / 100));
    const lineSubtotal = roundMoney(grossAmount - discountAmount);
    const lineTaxAmount = roundMoney(lineSubtotal * (line.taxRate / 100));
    const lineTotal = roundMoney(lineSubtotal + lineTaxAmount);

    subtotal = roundMoney(subtotal + lineSubtotal);
    taxTotal = roundMoney(taxTotal + lineTaxAmount);
    total = roundMoney(total + lineTotal);

    const currentTax = taxMap.get(line.taxRate) ?? {
      taxBase: 0,
      taxAmount: 0,
    };

    taxMap.set(line.taxRate, {
      taxBase: roundMoney(currentTax.taxBase + lineSubtotal),
      taxAmount: roundMoney(currentTax.taxAmount + lineTaxAmount),
    });

    calculatedLines.push({
      lineNumber: index + 1,
      productId: line.productId ?? null,
      description: line.description,
      unit: line.unit,
      quantity: toMoneyString(line.quantity),
      unitPrice: toMoneyString(line.unitPrice),
      discountRate: toMoneyString(line.discountRate),
      discountAmount: toMoneyString(discountAmount),
      taxRate: toMoneyString(line.taxRate),
      subtotal: toMoneyString(lineSubtotal),
      taxAmount: toMoneyString(lineTaxAmount),
      total: toMoneyString(lineTotal),
    });
  });

  const taxSummaries: TaxSummary[] = Array.from(taxMap.entries()).map(
    ([taxRate, values]) => ({
      taxRate: toMoneyString(taxRate),
      taxBase: toMoneyString(values.taxBase),
      taxAmount: toMoneyString(values.taxAmount),
    })
  );

  return {
    lines: calculatedLines,
    taxSummaries,
    subtotal: toMoneyString(subtotal),
    taxTotal: toMoneyString(taxTotal),
    total: toMoneyString(total),
    amountDue: toMoneyString(total),
  };
}

async function assertClientBelongsToCompany(companyId: number, clientId: number) {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      companyId,
      active: true,
    },
  });

  if (!client) {
    throw new InvoiceServiceError("Client not found", 404);
  }

  return client;
}

async function assertInvoiceSeriesBelongsToCompany(
  companyId: number,
  invoiceSeriesId?: number | null
) {
  if (!invoiceSeriesId) {
    return null;
  }

  const invoiceSeries = await prisma.invoiceSeries.findFirst({
    where: {
      id: invoiceSeriesId,
      companyId,
      active: true,
    },
  });

  if (!invoiceSeries) {
    throw new InvoiceServiceError("Invoice series not found", 404);
  }

  return invoiceSeries;
}

async function assertProductsBelongToCompany(
  companyId: number,
  lines: InvoiceLineInput[]
) {
  const productIds = lines
    .map((line) => line.productId)
    .filter((id): id is number => typeof id === "number");

  if (productIds.length === 0) {
    return;
  }

  const uniqueProductIds = Array.from(new Set(productIds));

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: uniqueProductIds,
      },
      companyId,
      active: true,
    },
  });

  if (products.length !== uniqueProductIds.length) {
    throw new InvoiceServiceError(
      "One or more products do not belong to this company",
      400
    );
  }
}

async function getFullInvoice(invoiceId: number, companyId: number) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
    include: {
      client: true,
      invoiceSeries: true,
      lines: {
        orderBy: {
          lineNumber: "asc",
        },
      },
      taxSummaries: true,
      payments: true,
      journalEntries: {
        include:{
          lines: {
            include: {
              account: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    throw new InvoiceServiceError("Invoice not found", 404);
  }

  return invoice;
}

export async function listInvoices(context: ServiceContext) {
  const { companyId } = context;

  return prisma.invoice.findMany({
    where: {
      companyId,
    },
    include: {
      client: true,
      invoiceSeries: true,
      lines: {
        orderBy: {
          lineNumber: "asc",
        },
      },
      taxSummaries: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getInvoiceById(
  context: ServiceContext,
  input: InvoiceIdInput
) {
  const { companyId } = context;
  const { invoiceId } = input;

  return getFullInvoice(invoiceId, companyId);
}

export async function createDraftInvoice(
  context: ServiceContext,
  data: CreateInvoiceInput
) {
  const { companyId, userId } = context;

  await assertClientBelongsToCompany(companyId, data.clientId);
  await assertInvoiceSeriesBelongsToCompany(companyId, data.invoiceSeriesId);
  await assertProductsBelongToCompany(companyId, data.lines);

  const calculated = calculateInvoiceLines(data.lines);

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        type: data.type,
        status: "DRAFT",

        issueDate: null,
        dueDate: data.dueDate ?? null,
        notes: data.notes ?? null,

        subtotal: calculated.subtotal,
        taxTotal: calculated.taxTotal,
        total: calculated.total,
        amountPaid: "0.00",
        amountDue: calculated.amountDue,

        companyId,
        clientId: data.clientId,
        invoiceSeriesId: data.invoiceSeriesId ?? null,
      },
    });

    await tx.invoiceLine.createMany({
      data: calculated.lines.map((line) => ({
        ...line,
        invoiceId: invoice.id,
      })),
    });

    await tx.invoiceTaxSummary.createMany({
      data: calculated.taxSummaries.map((taxSummary) => ({
        ...taxSummary,
        invoiceId: invoice.id,
      })),
    });

    const fullInvoice = await tx.invoice.findFirst({
      where: {
        id: invoice.id,
        companyId,
      },
      include: {
        client: true,
        invoiceSeries: true,
        lines: {
          orderBy: {
            lineNumber: "asc",
          },
        },
        taxSummaries: true,
      },
    });

    if (!fullInvoice) {
      throw new InvoiceServiceError("Invoice could not be created", 500);
    }

    await tx.auditLog.create({
      data: {
        entityType: "Invoice",
        entityId: fullInvoice.id,
        action: "CREATE",
        newValue: toAuditJson(fullInvoice),
        companyId,
        userId,
      },
    });

    return fullInvoice;
  });
}

export async function updateDraftInvoice(
  context: ServiceContext,
  input: InvoiceIdInput,
  data: UpdateDraftInvoiceInput
) {
  const { companyId, userId } = context;
  const { invoiceId } = input;

  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
    include: {
      lines: {
        orderBy: {
          lineNumber: "asc",
        },
      },
      taxSummaries: true,
    },
  });

  if (!existingInvoice) {
    throw new InvoiceServiceError("Invoice not found", 404);
  }

  if (existingInvoice.status !== "DRAFT") {
    throw new InvoiceServiceError("Only draft invoices can be updated", 409);
  }

  const nextClientId = data.clientId ?? existingInvoice.clientId;

  const nextInvoiceSeriesId =
    data.invoiceSeriesId === undefined
      ? existingInvoice.invoiceSeriesId
      : data.invoiceSeriesId;

  await assertClientBelongsToCompany(companyId, nextClientId);
  await assertInvoiceSeriesBelongsToCompany(companyId, nextInvoiceSeriesId);

  if (data.lines) {
    await assertProductsBelongToCompany(companyId, data.lines);
  }

  const calculated = data.lines ? calculateInvoiceLines(data.lines) : null;

  return prisma.$transaction(async (tx) => {
    if (calculated) {
      await tx.invoiceLine.deleteMany({
        where: {
          invoiceId,
        },
      });

      await tx.invoiceTaxSummary.deleteMany({
        where: {
          invoiceId,
        },
      });
    }

    const updatedInvoice = await tx.invoice.update({
      where: {
        id: invoiceId,
      },
      data: {
        clientId: nextClientId,
        invoiceSeriesId: nextInvoiceSeriesId,
        dueDate:
          data.dueDate === undefined ? existingInvoice.dueDate : data.dueDate,
        notes: data.notes === undefined ? existingInvoice.notes : data.notes,

        ...(calculated
          ? {
              subtotal: calculated.subtotal,
              taxTotal: calculated.taxTotal,
              total: calculated.total,
              amountDue: calculated.amountDue,
            }
          : {}),
      },
    });

    if (calculated) {
      await tx.invoiceLine.createMany({
        data: calculated.lines.map((line) => ({
          ...line,
          invoiceId: updatedInvoice.id,
        })),
      });

      await tx.invoiceTaxSummary.createMany({
        data: calculated.taxSummaries.map((taxSummary) => ({
          ...taxSummary,
          invoiceId: updatedInvoice.id,
        })),
      });
    }

    const fullInvoice = await tx.invoice.findFirst({
      where: {
        id: updatedInvoice.id,
        companyId,
      },
      include: {
        client: true,
        invoiceSeries: true,
        lines: {
          orderBy: {
            lineNumber: "asc",
          },
        },
        taxSummaries: true,
      },
    });

    if (!fullInvoice) {
      throw new InvoiceServiceError("Invoice could not be updated", 500);
    }

    await tx.auditLog.create({
      data: {
        entityType: "Invoice",
        entityId: fullInvoice.id,
        action: "UPDATE",
        oldValue: toAuditJson(existingInvoice),
        newValue: toAuditJson(fullInvoice),
        companyId,
        userId,
      },
    });

    return fullInvoice;
  });
}

export async function cancelDraftInvoice(
  context: ServiceContext,
  input: InvoiceIdInput
) {
  const { companyId, userId } = context;
  const { invoiceId } = input;

  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
  });

  if (!existingInvoice) {
    throw new InvoiceServiceError("Invoice not found", 404);
  }

  if (existingInvoice.status !== "DRAFT") {
    throw new InvoiceServiceError(
      "Only draft invoices can be cancelled from this endpoint",
      409
    );
  }

  return prisma.$transaction(async (tx) => {
    const cancelledInvoice = await tx.invoice.update({
      where: {
        id: invoiceId,
      },
      data: {
        status: "CANCELLED",
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Invoice",
        entityId: cancelledInvoice.id,
        action: "CANCEL",
        oldValue: toAuditJson(existingInvoice),
        newValue: toAuditJson(cancelledInvoice),
        companyId,
        userId,
      },
    });

    return cancelledInvoice;
  });
}

function formatInvoiceNumber(prefix: string, number: number): string {
  return `${prefix}${String(number).padStart(6, "0")}`;
}

function buildAddress(parts: Array<string | null | undefined>): string | null {
  const address = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(", ");

  return address || null;
}

function assertCompanyFiscalData(company: {
  name: string;
  nif: string | null;
  address: string | null;
}) {
  if (!company.name || !company.nif || !company.address) {
    throw new InvoiceServiceError("Company fiscal data is incomplete", 400);
  }
}

function assertClientFiscalData(client: {
  legalName: string;
  taxId: string | null;
  address: string | null;
}) {
  if (!client.legalName || !client.taxId || !client.address) {
    throw new InvoiceServiceError("Client fiscal data is incomplete", 400);
  }
}

export async function issueInvoice(
  context: ServiceContext,
  input: InvoiceIdInput
) {
  const { companyId, userId } = context;
  const { invoiceId } = input;

  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
    include: {
      company: true,
      client: true,
      invoiceSeries: true,
      lines: true,
      taxSummaries: true,
    },
  });

  if (!existingInvoice) {
    throw new InvoiceServiceError("Invoice not found", 404);
  }

  if (existingInvoice.status !== "DRAFT") {
    throw new InvoiceServiceError("Only draft invoices can be issued", 409);
  }

  if (existingInvoice.type !== "STANDARD") {
    throw new InvoiceServiceError(
      "Only standard invoices can be issued as official invoices",
      409
    );
  }

  if (!existingInvoice.invoiceSeriesId || !existingInvoice.invoiceSeries) {
    throw new InvoiceServiceError(
      "Invoice series is required to issue an invoice",
      400
    );
  }

  const invoiceSeriesId = existingInvoice.invoiceSeriesId;

  if (!existingInvoice.client.active) {
    throw new InvoiceServiceError(
      "Cannot issue an invoice for an inactive client",
      409
    );
  }

  if (!existingInvoice.invoiceSeries.active) {
    throw new InvoiceServiceError(
      "Cannot issue an invoice with an inactive series",
      409
    );
  }

  if (existingInvoice.lines.length === 0) {
    throw new InvoiceServiceError(
      "Cannot issue an invoice without lines",
      400
    );
  }

  assertCompanyFiscalData(existingInvoice.company);
  assertClientFiscalData(existingInvoice.client);

  const customerAddress = buildAddress([
    existingInvoice.client.address,
    existingInvoice.client.postalCode,
    existingInvoice.client.city,
    existingInvoice.client.province,
    existingInvoice.client.countryCode,
  ]);

  return prisma.$transaction(async (tx) => {
    const updatedSeries = await tx.invoiceSeries.update({
      where: {
        id: invoiceSeriesId,
      },
      data: {
        currentNumber: {
          increment: 1,
        },
      },
    });

    const invoiceNumber = formatInvoiceNumber(
      updatedSeries.prefix,
      updatedSeries.currentNumber
    );

    const issuedInvoice = await tx.invoice.update({
      where: {
        id: invoiceId,
      },
      data: {
        status: "ISSUED",
        invoiceNumber,
        issueDate: new Date(),

        issuerName: existingInvoice.company.name,
        issuerNif: existingInvoice.company.nif,
        issuerAddress: existingInvoice.company.address,
        issuerEmail: existingInvoice.company.email,
        issuerPhone: existingInvoice.company.phone,

        customerName: existingInvoice.client.legalName,
        customerNif: existingInvoice.client.taxId,
        customerAddress,
        customerEmail:
          existingInvoice.client.invoicingEmail ?? existingInvoice.client.email,
        customerPhone: existingInvoice.client.phone,
      },
      include: {
        client: true,
        invoiceSeries: true,
        lines: {
          orderBy: {
            lineNumber: "asc",
          },
          include: {
            product: true,
          },
        },
        taxSummaries: true,
        payments: true,
      },
    });
    
    
    await createInvoiceIssuedJournalEntry(tx, {
  companyId,
  invoice: issuedInvoice,
});
    

    await tx.auditLog.create({
      data: {
        entityType: "Invoice",
        entityId: issuedInvoice.id,
        action: "ISSUE",
        oldValue: toAuditJson(existingInvoice),
        newValue: toAuditJson(issuedInvoice),
        companyId,
        userId,
      },
    });

    return issuedInvoice;
  });
  
}
function toNumber(value: unknown): number {
  return Number(value);
}

function getInvoiceStatusAfterPayment(amountDue: number) {
  return amountDue <= 0 ? "PAID" : "PARTIALLY_PAID";
}

export async function listInvoicePayments(
  context: ServiceContext,
  input: InvoiceIdInput
) {
  const { companyId } = context;
  const { invoiceId } = input;

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
  });

  if (!invoice) {
    throw new InvoiceServiceError("Invoice not found", 404);
  }

  return prisma.payment.findMany({
    where: {
      invoiceId,
    },
    orderBy: {
      paymentDate: "desc",
    },
  });
}

export async function registerInvoicePayment(
  context: ServiceContext,
  input: InvoiceIdInput,
  data: RegisterPaymentInput
) {
  const { companyId, userId } = context;
  const { invoiceId } = input;

  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
    include: {
      payments: true,
    },
  });

  if (!existingInvoice) {
    throw new InvoiceServiceError("Invoice not found", 404);
  }

  if (existingInvoice.status === "DRAFT") {
    throw new InvoiceServiceError(
      "Draft invoices cannot receive payments",
      409
    );
  }

  if (existingInvoice.status === "CANCELLED") {
    throw new InvoiceServiceError(
      "Cancelled invoices cannot receive payments",
      409
    );
  }

  if (existingInvoice.status === "PAID") {
    throw new InvoiceServiceError("Invoice is already paid", 409);
  }

  const currentAmountPaid = toNumber(existingInvoice.amountPaid);
  const currentAmountDue = toNumber(existingInvoice.amountDue);
  const invoiceTotal = toNumber(existingInvoice.total);
  const paymentAmount = roundMoney(data.amount);

  if (paymentAmount <= 0) {
    throw new InvoiceServiceError(
      "Payment amount must be greater than zero",
      400
    );
  }

  if (paymentAmount > currentAmountDue) {
    throw new InvoiceServiceError(
      "Payment amount cannot be greater than amount due",
      400
    );
  }

  const nextAmountPaid = roundMoney(currentAmountPaid + paymentAmount);
  const nextAmountDue = roundMoney(invoiceTotal - nextAmountPaid);
  const nextStatus = getInvoiceStatusAfterPayment(nextAmountDue);

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        amount: toMoneyString(paymentAmount),
        paymentDate: data.paymentDate ?? new Date(),
        method: data.method,
        reference: data.reference ?? null,
        notes: data.notes ?? null,
        invoiceId,
      },
    });
    

    const updatedInvoice = await tx.invoice.update({
      where: {
        id: invoiceId,
      },
      data: {
        amountPaid: toMoneyString(nextAmountPaid),
        amountDue: toMoneyString(nextAmountDue),
        status: nextStatus,
      },
      include: {
        client: true,
        invoiceSeries: true,
        lines: {
          orderBy: {
            lineNumber: "asc",
          },
        },
        taxSummaries: true,
        payments: {
          orderBy: {
            paymentDate: "desc",
          },
        },
      },
    });
    await createInvoicePaymentJournalEntry(tx, {
  companyId,
  invoiceId,
  paymentId: payment.id,
  amount: payment.amount,
  invoiceNumber: updatedInvoice.invoiceNumber,
});

    await tx.auditLog.create({
      data: {
        entityType: "Payment",
        entityId: payment.id,
        action: "PAY",
        oldValue: toAuditJson(existingInvoice),
        newValue: toAuditJson({
          payment,
          invoice: updatedInvoice,
        }),
        companyId,
        userId,
      },
    });

    return {
      payment,
      invoice: updatedInvoice,
    };
  });
}
 