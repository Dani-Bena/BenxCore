import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/errors.js";
import type {
  CreateInvoiceSeriesInput,
  UpdateInvoiceSeriesInput,
} from "./invoice-series.schemas.js";

type ServiceContext = {
  companyId: number;
  userId: number | null;
};

type InvoiceSeriesIdInput = {
  invoiceSeriesId: number;
};

export class InvoiceSeriesServiceError extends AppError {}

function toAuditJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

export async function listInvoiceSeries(
  context: ServiceContext,
  options: {
    includeInactive?: boolean;
  } = {}
) {
  const { companyId } = context;
  const { includeInactive = false } = options;

  return prisma.invoiceSeries.findMany({
    where: {
      companyId,
      ...(includeInactive ? {} : { active: true }),
    },
    orderBy: [
      {
        year: "desc",
      },
      {
        code: "asc",
      },
    ],
  });
}

export async function getInvoiceSeriesById(
  context: ServiceContext,
  input: InvoiceSeriesIdInput
) {
  const { companyId } = context;
  const { invoiceSeriesId } = input;

  const invoiceSeries = await prisma.invoiceSeries.findFirst({
    where: {
      id: invoiceSeriesId,
      companyId,
    },
  });

  if (!invoiceSeries) {
    throw new InvoiceSeriesServiceError("Invoice series not found", 404);
  }

  return invoiceSeries;
}

export async function createInvoiceSeries(
  context: ServiceContext,
  data: CreateInvoiceSeriesInput
) {
  const { companyId, userId } = context;

  const existingSeries = await prisma.invoiceSeries.findFirst({
    where: {
      companyId,
      code: data.code,
    },
  });

  if (existingSeries) {
    throw new InvoiceSeriesServiceError(
      "An invoice series with this code already exists",
      409
    );
  }

  return prisma.$transaction(async (tx) => {
    const createdSeries = await tx.invoiceSeries.create({
      data: {
        ...data,
        companyId,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "InvoiceSeries",
        entityId: createdSeries.id,
        action: "CREATE",
        newValue: toAuditJson(createdSeries),
        companyId,
        userId,
      },
    });

    return createdSeries;
  });
}

export async function updateInvoiceSeries(
  context: ServiceContext,
  input: InvoiceSeriesIdInput,
  data: UpdateInvoiceSeriesInput
) {
  const { companyId, userId } = context;
  const { invoiceSeriesId } = input;

  const existingSeries = await prisma.invoiceSeries.findFirst({
    where: {
      id: invoiceSeriesId,
      companyId,
    },
  });

  if (!existingSeries) {
    throw new InvoiceSeriesServiceError("Invoice series not found", 404);
  }

  if (data.code) {
    const duplicatedSeries = await prisma.invoiceSeries.findFirst({
      where: {
        companyId,
        code: data.code,
        id: {
          not: invoiceSeriesId,
        },
      },
    });

    if (duplicatedSeries) {
      throw new InvoiceSeriesServiceError(
        "Another invoice series with this code already exists",
        409
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const updatedSeries = await tx.invoiceSeries.update({
      where: {
        id: invoiceSeriesId,
      },
      data,
    });

    await tx.auditLog.create({
      data: {
        entityType: "InvoiceSeries",
        entityId: updatedSeries.id,
        action: "UPDATE",
        oldValue: toAuditJson(existingSeries),
        newValue: toAuditJson(updatedSeries),
        companyId,
        userId,
      },
    });

    return updatedSeries;
  });
}

export async function deactivateInvoiceSeries(
  context: ServiceContext,
  input: InvoiceSeriesIdInput
) {
  const { companyId, userId } = context;
  const { invoiceSeriesId } = input;

  const existingSeries = await prisma.invoiceSeries.findFirst({
    where: {
      id: invoiceSeriesId,
      companyId,
    },
  });

  if (!existingSeries) {
    throw new InvoiceSeriesServiceError("Invoice series not found", 404);
  }

  if (!existingSeries.active) {
    throw new InvoiceSeriesServiceError(
      "Invoice series is already inactive",
      409
    );
  }

  return prisma.$transaction(async (tx) => {
    const deactivatedSeries = await tx.invoiceSeries.update({
      where: {
        id: invoiceSeriesId,
      },
      data: {
        active: false,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "InvoiceSeries",
        entityId: deactivatedSeries.id,
        action: "DELETE",
        oldValue: toAuditJson(existingSeries),
        newValue: toAuditJson(deactivatedSeries),
        companyId,
        userId,
      },
    });

    return deactivatedSeries;
  });
}