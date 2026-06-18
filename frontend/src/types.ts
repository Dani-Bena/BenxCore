export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  active?: boolean;
  companyId: number;
};

export type Client = {
  id: number;
  number: number;
  legalName?: string;
  name?: string;
  tradeName?: string | null;
  type: string;
  taxId?: string | null;
  nif?: string | null;
  taxIdType?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  active: boolean;
};

export type Product = {
  id: number;
  number: number;
  code: string | null;
  name: string;
  description: string | null;
  type: "PRODUCT" | "SERVICE";
  unit: string;
  price: string;
  costPrice?: string | null;
  taxRate: string;
  active: boolean;
};

export type InvoiceSeries = {
  id: number;
  number: number;
  code: string;
  prefix: string;
  currentNumber: number;
  year: number | null;
  active: boolean;
};

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export type InvoiceStatusFilter = {
  label: string;
  statuses: InvoiceStatus[];
} | null;

export type InvoiceLine = {
  id: number;
  lineNumber: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRate: string;
  subtotal: string;
  taxAmount: string;
  total: string;
};

export type Payment = {
  id: number;
  amount: string;
  paymentDate: string;
  method: string;
  reference: string | null;
  notes: string | null;
};

export type JournalLine = {
  id: number;
  description: string | null;
  debit: string;
  credit: string;
  account: {
    code: string;
    name: string;
  };
};

export type JournalEntry = {
  id: number;
  source: "INVOICE" | "PAYMENT" | "MANUAL";
  entryNumber: string | null;
  entryDate: string;
  description: string | null;
  lines: JournalLine[];
};

export type Invoice = {
  id: number;
  number: number;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  total: string;
  amountPaid: string;
  amountDue: string;
  subtotal?: string;
  taxTotal?: string;
  dueDate?: string | null;
  issueDate?: string | null;
  notes?: string | null;
  client?: Client;
  lines?: InvoiceLine[];
  payments?: Payment[];
  journalEntries?: JournalEntry[];
};