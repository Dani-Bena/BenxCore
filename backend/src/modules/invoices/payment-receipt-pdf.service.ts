import { createRequire } from "node:module";
import { prisma } from "../../lib/prisma.js";
import { drawCompanyLogo } from "../../utils/pdf-logo.js";
import { PDF_FONT, PDF_SIZE } from "../../utils/pdf-style.js";
import { InvoiceServiceError } from "./invoices.service.js";

const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit");

type ServiceContext = {
  companyId: number;
  userId: number | null;
};

type PaymentReceiptPdfInput = {
  invoiceId: number;
  paymentId: number;
};

function formatMoney(value: unknown): string {
  return `${Number(value).toFixed(2)} EUR`;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, "_");
}

function collectPdfBuffer(doc: any): Promise<Buffer> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function drawSectionTitle(doc: any, title: string, y: number): number {
  doc.font(PDF_FONT.bold).fontSize(PDF_SIZE.sectionTitle).text(title, 40, y);

  doc.moveTo(40, y + 16).lineTo(555, y + 16).stroke();

  return y + 28;
}

function drawLabelValue(
  doc: any,
  label: string,
  value: string | number | null | undefined,
  x: number,
  y: number,
  labelWidth = 115
): number {
  doc.font(PDF_FONT.bold).fontSize(PDF_SIZE.label).text(label, x, y);

  doc
    .font(PDF_FONT.regular)
    .fontSize(PDF_SIZE.body)
    .text(value == null || value === "" ? "-" : String(value), x + labelWidth, y, {
      width: 360,
    });

  return y + 16;
}

async function findPaymentForReceipt(
  companyId: number,
  invoiceId: number,
  paymentId: number
) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      invoiceId,
      invoice: {
        companyId,
      },
    },
    include: {
      invoice: true,
    },
  });

  if (!payment) {
    throw new InvoiceServiceError("Payment not found", 404);
  }

  if (!payment.invoice.invoiceNumber || !payment.invoice.issueDate) {
    throw new InvoiceServiceError(
      "Payment receipt can only be generated for issued invoices",
      409
    );
  }

  return payment;
}

export async function generatePaymentReceiptPdf(
  context: ServiceContext,
  input: PaymentReceiptPdfInput
) {
  const { companyId } = context;
  const { invoiceId, paymentId } = input;

  const payment = await findPaymentForReceipt(companyId, invoiceId, paymentId);
  const invoice = payment.invoice;

  const invoiceNumber = invoice.invoiceNumber;

  if (!invoiceNumber) {
    throw new InvoiceServiceError(
      "Payment receipt can only be generated for issued invoices",
      409
    );
  }

  const receiptNumber = `REC-${payment.id}`;

  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: `Comprobante de pago ${receiptNumber}`,
      Author: invoice.issuerName ?? "BenxCore",
      Subject: "Comprobante de pago",
    },
  });

  const pdfPromise = collectPdfBuffer(doc);

  drawCompanyLogo(doc, {
    x: 40,
    y: 30,
    width: 115,
    height: 70,
  });

  doc
    .font(PDF_FONT.bold)
    .fontSize(PDF_SIZE.title)
    .text("COMPROBANTE DE PAGO", 220, 42, {
      width: 335,
      align: "right",
      lineBreak: false,
    });

  doc.font(PDF_FONT.regular).fontSize(PDF_SIZE.headerMeta);

  doc.text(`Comprobante: ${receiptNumber}`, 340, 72, {
    width: 215,
    align: "right",
  });

  doc.text(`Factura: ${invoiceNumber}`, 340, 88, {
    width: 215,
    align: "right",
  });

  doc.text(`Fecha pago: ${formatDate(payment.paymentDate)}`, 340, 104, {
    width: 215,
    align: "right",
  });

  let y = 145;

  y = drawSectionTitle(doc, "Datos del emisor", y);

  y = drawLabelValue(doc, "Nombre", invoice.issuerName, 40, y);
  y = drawLabelValue(doc, "NIF", invoice.issuerNif, 40, y);
  y = drawLabelValue(doc, "Direccion", invoice.issuerAddress, 40, y);
  y = drawLabelValue(doc, "Email", invoice.issuerEmail, 40, y);
  y = drawLabelValue(doc, "Telefono", invoice.issuerPhone, 40, y);

  y += 12;

  y = drawSectionTitle(doc, "Datos del cliente", y);

  y = drawLabelValue(doc, "Nombre", invoice.customerName, 40, y);
  y = drawLabelValue(doc, "NIF", invoice.customerNif, 40, y);
  y = drawLabelValue(doc, "Direccion", invoice.customerAddress, 40, y);
  y = drawLabelValue(doc, "Email", invoice.customerEmail, 40, y);
  y = drawLabelValue(doc, "Telefono", invoice.customerPhone, 40, y);

  y += 12;

  y = drawSectionTitle(doc, "Detalle del pago", y);

  y = drawLabelValue(doc, "Factura", invoiceNumber, 40, y);
  y = drawLabelValue(doc, "Fecha factura", formatDate(invoice.issueDate), 40, y);
  y = drawLabelValue(doc, "Total factura", formatMoney(invoice.total), 40, y);
  y = drawLabelValue(doc, "Importe pagado", formatMoney(payment.amount), 40, y);
  y = drawLabelValue(doc, "Metodo", payment.method, 40, y);
  y = drawLabelValue(doc, "Referencia", payment.reference, 40, y);

  if (payment.notes) {
    y = drawLabelValue(doc, "Notas", payment.notes, 40, y);
  }

  y += 20;

  y = drawSectionTitle(doc, "Estado de la factura tras el pago", y);

  y = drawLabelValue(doc, "Estado", invoice.status, 40, y);
  y = drawLabelValue(doc, "Total pagado", formatMoney(invoice.amountPaid), 40, y);
  y = drawLabelValue(doc, "Pendiente", formatMoney(invoice.amountDue), 40, y);

  doc
    .font(PDF_FONT.regular)
    .fontSize(PDF_SIZE.footer)
    .text("Comprobante generado por BenxCore", 40, 790, {
      align: "center",
      width: 515,
    });

  doc.end();

  const buffer = await pdfPromise;

  return {
    buffer,
    filename: `${sanitizeFilename(receiptNumber)}-${sanitizeFilename(
      invoiceNumber
    )}.pdf`,
  };
}