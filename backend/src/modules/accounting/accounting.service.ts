import { prisma } from "../../lib/prisma.js";

const DEFAULT_ACCOUNTS = [
  {
    code: "430",
    name: "Clientes",
    type: "ASSET",
  },
  {
    code: "572",
    name: "Bancos",
    type: "ASSET",
  },
  {
    code: "477",
    name: "Hacienda Pública, IVA repercutido",
    type: "LIABILITY",
  },
  {
    code: "700",
    name: "Ventas de productos",
    type: "INCOME",
  },
  {
    code: "705",
    name: "Prestaciones de servicios",
    type: "INCOME",
  },
] as const;

type AccountingTx = any;

type ServiceContext = {
  companyId: number;
  userId: number | null;
};

type JournalEntryIdInput = {
  journalEntryId: number;
};

type JournalLineInput = {
  accountId: number;
  description: string;
  debit: string;
  credit: string;
};

type InvoiceLineForAccounting = {
  description: string;
  subtotal: unknown;
  productId: number | null;
  product?: {
    type: "PRODUCT" | "SERVICE";
    revenueAccountId: number | null;
  } | null;
};

type InvoiceForIssueAccounting = {
  id: number;
  invoiceNumber: string | null;
  total: unknown;
  taxTotal: unknown;
  lines: InvoiceLineForAccounting[];
};

export class AccountingServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toMoneyString(value: number): string {
  return roundMoney(value).toFixed(2);
}

function toNumber(value: unknown): number {
  return Number(value);
}

function assertBalancedJournalLines(lines: JournalLineInput[]) {
  const totalDebit = roundMoney(
    lines.reduce((sum, line) => sum + toNumber(line.debit), 0)
  );

  const totalCredit = roundMoney(
    lines.reduce((sum, line) => sum + toNumber(line.credit), 0)
  );

  if (totalDebit !== totalCredit) {
    throw new AccountingServiceError(
      `Journal entry is not balanced. Debit=${toMoneyString(
        totalDebit
      )}, Credit=${toMoneyString(totalCredit)}`,
      400
    );
  }
}

async function ensureDefaultAccountingAccounts(
  tx: AccountingTx,
  companyId: number
) {
  const accounts: Record<string, { id: number; code: string; name: string }> =
    {};

  for (const account of DEFAULT_ACCOUNTS) {
    const createdOrUpdatedAccount = await tx.accountingAccount.upsert({
      where: {
        companyId_code: {
          companyId,
          code: account.code,
        },
      },
      update: {
        name: account.name,
        type: account.type,
        active: true,
      },
      create: {
        companyId,
        code: account.code,
        name: account.name,
        type: account.type,
        active: true,
      },
    });

    accounts[account.code] = createdOrUpdatedAccount;
  }

  return accounts;
}

export async function createInvoiceIssuedJournalEntry(
  tx: AccountingTx,
  params: {
    companyId: number;
    invoice: InvoiceForIssueAccounting;
  }
) {
  const { companyId, invoice } = params;

  const accounts = await ensureDefaultAccountingAccounts(tx, companyId);

  const clientAccount = accounts["430"];
  const vatAccount = accounts["477"];
  const productRevenueAccount = accounts["700"];
  const serviceRevenueAccount = accounts["705"];

  if (
    !clientAccount ||
    !vatAccount ||
    !productRevenueAccount ||
    !serviceRevenueAccount
  ) {
    throw new AccountingServiceError(
      "Default accounting accounts could not be created",
      500
    );
  }

  const revenueGroups = new Map<
    number,
    {
      accountId: number;
      amount: number;
      description: string;
    }
  >();

  for (const line of invoice.lines) {
    const lineSubtotal = toNumber(line.subtotal);

    const defaultRevenueAccount =
      line.product?.type === "PRODUCT"
        ? productRevenueAccount
        : serviceRevenueAccount;

    const revenueAccountId =
      line.product?.revenueAccountId ?? defaultRevenueAccount.id;

    const current = revenueGroups.get(revenueAccountId);

    revenueGroups.set(revenueAccountId, {
      accountId: revenueAccountId,
      amount: roundMoney((current?.amount ?? 0) + lineSubtotal),
      description: current?.description ?? "Ingresos por factura emitida",
    });
  }

  const total = toNumber(invoice.total);
  const taxTotal = toNumber(invoice.taxTotal);

  const journalLines: JournalLineInput[] = [
    {
      accountId: clientAccount.id,
      description: "Cliente por factura emitida",
      debit: toMoneyString(total),
      credit: "0.00",
    },
    ...Array.from(revenueGroups.values()).map((group) => ({
      accountId: group.accountId,
      description: group.description,
      debit: "0.00",
      credit: toMoneyString(group.amount),
    })),
    ...(taxTotal > 0
      ? [
          {
            accountId: vatAccount.id,
            description: "IVA repercutido",
            debit: "0.00",
            credit: toMoneyString(taxTotal),
          },
        ]
      : []),
  ];

  assertBalancedJournalLines(journalLines);

  return tx.journalEntry.create({
    data: {
      companyId,
      invoiceId: invoice.id,
      source: "INVOICE",
      entryNumber: invoice.invoiceNumber
        ? `JE-INV-${invoice.invoiceNumber}`
        : null,
      description: invoice.invoiceNumber
        ? `Asiento de emisión de factura ${invoice.invoiceNumber}`
        : `Asiento de emisión de factura ${invoice.id}`,
      lines: {
        create: journalLines,
      },
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });
}

export async function createInvoicePaymentJournalEntry(
  tx: AccountingTx,
  params: {
    companyId: number;
    invoiceId: number;
    paymentId: number;
    amount: unknown;
    invoiceNumber: string | null;
  }
) {
  const { companyId, invoiceId, paymentId, amount, invoiceNumber } = params;

  const accounts = await ensureDefaultAccountingAccounts(tx, companyId);

  const bankAccount = accounts["572"];
  const clientAccount = accounts["430"];

  if (!bankAccount || !clientAccount) {
    throw new AccountingServiceError(
      "Default accounting accounts could not be created",
      500
    );
  }

  const paymentAmount = toNumber(amount);

  const journalLines: JournalLineInput[] = [
    {
      accountId: bankAccount.id,
      description: "Entrada en banco por cobro de factura",
      debit: toMoneyString(paymentAmount),
      credit: "0.00",
    },
    {
      accountId: clientAccount.id,
      description: "Cancelación de deuda de cliente",
      debit: "0.00",
      credit: toMoneyString(paymentAmount),
    },
  ];

  assertBalancedJournalLines(journalLines);

  return tx.journalEntry.create({
    data: {
      companyId,
      invoiceId,
      paymentId,
      source: "PAYMENT",
      entryNumber: `JE-PAY-${paymentId}`,
      description: invoiceNumber
        ? `Asiento de cobro de factura ${invoiceNumber}`
        : `Asiento de cobro de factura ${invoiceId}`,
      lines: {
        create: journalLines,
      },
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });
}

export async function listAccountingAccounts(
  context: ServiceContext,
  options: {
    includeInactive?: boolean;
  } = {}
) {
  const { companyId } = context;
  const { includeInactive = false } = options;

  return prisma.accountingAccount.findMany({
    where: {
      companyId,
      ...(includeInactive ? {} : { active: true }),
    },
    orderBy: {
      code: "asc",
    },
  });
}

export async function listJournalEntries(
  context: ServiceContext,
  filters: {
    source?: "INVOICE" | "PAYMENT" | "MANUAL";
    dateFrom?: Date;
    dateTo?: Date;
  } = {}
) {
  const { companyId } = context;

  const dateFilter =
    filters.dateFrom || filters.dateTo
      ? {
          ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
          ...(filters.dateTo ? { lte: filters.dateTo } : {}),
        }
      : undefined;

  return prisma.journalEntry.findMany({
    where: {
      companyId,
      ...(filters.source ? { source: filters.source } : {}),
      ...(dateFilter ? { entryDate: dateFilter } : {}),
    },
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
        },
      },
      payment: true,
      lines: {
        orderBy: {
          id: "asc",
        },
        include: {
          account: true,
        },
      },
    },
    orderBy: {
      entryDate: "desc",
    },
  });
}

export async function getJournalEntryById(
  context: ServiceContext,
  input: JournalEntryIdInput
) {
  const { companyId } = context;
  const { journalEntryId } = input;

  const journalEntry = await prisma.journalEntry.findFirst({
    where: {
      id: journalEntryId,
      companyId,
    },
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
        },
      },
      payment: true,
      lines: {
        orderBy: {
          id: "asc",
        },
        include: {
          account: true,
        },
      },
    },
  });

  if (!journalEntry) {
    throw new AccountingServiceError("Journal entry not found", 404);
  }

  return journalEntry;
}