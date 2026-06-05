import { createRequire } from "node:module";
import { prisma } from "../../lib/prisma.js";
import { InvoiceServiceError } from "./invoices.service.js";

const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit");

type ServiceContext = {
  companyId: number;
  userId: number | null;
};

type InvoicePdfInput = {
  invoiceId: number;
};

function formatMoney(value: unknown): string {
  return `${Number(value).toFixed(2)} EUR`;
}

function formatDate(value: Date | string | null): string {
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
  doc.font("Helvetica-Bold").fontSize(11).text(title, 40, y);

  doc
    .moveTo(40, y + 16)
    .lineTo(555, y + 16)
    .stroke();

  return y + 28;
}

function drawLabelValue(
  doc: any,
  label: string,
  value: string | number | null | undefined,
  x: number,
  y: number,
  labelWidth = 85
): number {
  doc.font("Helvetica-Bold").fontSize(9).text(label, x, y);

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      value == null || value === "" ? "-" : String(value),
      x + labelWidth,
      y
    );

  return y + 14;
}

function ensurePageSpace(doc: any, y: number, needed = 40): number {
  if (y + needed > 760) {
    doc.addPage();
    return 40;
  }

  return y;
}

async function findInvoiceForPdf(companyId: number, invoiceId: number) {
  const invoice = await prisma.invoice.findFirst({
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

  if (!invoice) {
    throw new InvoiceServiceError("Invoice not found", 404);
  }

  if (invoice.status === "DRAFT") {
    throw new InvoiceServiceError(
      "Draft invoices cannot be exported as official PDF",
      409
    );
  }

  if (invoice.status === "CANCELLED") {
    throw new InvoiceServiceError(
      "Cancelled invoices cannot be exported as official PDF",
      409
    );
  }

  if (!invoice.invoiceNumber || !invoice.issueDate) {
    throw new InvoiceServiceError("Invoice is not officially issued", 409);
  }

  return invoice;
}

export async function generateInvoicePdf(
  context: ServiceContext,
  input: InvoicePdfInput
) {
  const { companyId } = context;
  const { invoiceId } = input;

  const invoice = await findInvoiceForPdf(companyId, invoiceId);

  const invoiceNumber = invoice.invoiceNumber;

  if (!invoiceNumber) {
    throw new InvoiceServiceError("Invoice is not officially issued", 409);
  }

  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: `Factura ${invoiceNumber}`,
      Author: invoice.issuerName ?? "BenxCore",
      Subject: "Factura emitida",
    },
  });

  const pdfPromise = collectPdfBuffer(doc);

  // Header
  doc.font("Helvetica-Bold").fontSize(22).text("FACTURA", 40, 40);

  doc.font("Helvetica").fontSize(10);
  doc.text(`Numero: ${invoiceNumber}`, 380, 45);
  doc.text(`Fecha: ${formatDate(invoice.issueDate)}`, 380, 60);
  doc.text(`Vencimiento: ${formatDate(invoice.dueDate)}`, 380, 75);
  doc.text(`Estado: ${invoice.status}`, 380, 90);

  let y = 125;

  // Fiscal data
  y = drawSectionTitle(doc, "Datos fiscales", y);

  const leftX = 40;
  const rightX = 310;

  let leftY = y;
  let rightY = y;

  doc.font("Helvetica-Bold").fontSize(10).text("Emisor", leftX, leftY);
  leftY += 18;
  leftY = drawLabelValue(doc, "Nombre", invoice.issuerName, leftX, leftY);
  leftY = drawLabelValue(doc, "NIF", invoice.issuerNif, leftX, leftY);
  leftY = drawLabelValue(doc, "Direccion", invoice.issuerAddress, leftX, leftY);
  leftY = drawLabelValue(doc, "Email", invoice.issuerEmail, leftX, leftY);
  leftY = drawLabelValue(doc, "Telefono", invoice.issuerPhone, leftX, leftY);

  doc.font("Helvetica-Bold").fontSize(10).text("Cliente", rightX, rightY);
  rightY += 18;
  rightY = drawLabelValue(doc, "Nombre", invoice.customerName, rightX, rightY);
  rightY = drawLabelValue(doc, "NIF", invoice.customerNif, rightX, rightY);
  rightY = drawLabelValue(
    doc,
    "Direccion",
    invoice.customerAddress,
    rightX,
    rightY
  );
  rightY = drawLabelValue(doc, "Email", invoice.customerEmail, rightX, rightY);
  rightY = drawLabelValue(
    doc,
    "Telefono",
    invoice.customerPhone,
    rightX,
    rightY
  );

  y = Math.max(leftY, rightY) + 20;

  // Lines table
  y = drawSectionTitle(doc, "Lineas de factura", y);

  const columns = {
    line: 40,
    description: 70,
    qty: 265,
    unitPrice: 315,
    discount: 380,
    tax: 435,
    total: 485,
  };

  doc.font("Helvetica-Bold").fontSize(8);
  doc.text("#", columns.line, y);
  doc.text("Descripcion", columns.description, y);
  doc.text("Cant.", columns.qty, y, { width: 40, align: "right" });
  doc.text("Precio", columns.unitPrice, y, { width: 55, align: "right" });
  doc.text("Dto.", columns.discount, y, { width: 45, align: "right" });
  doc.text("IVA", columns.tax, y, { width: 35, align: "right" });
  doc.text("Total", columns.total, y, { width: 70, align: "right" });

  y += 14;
  doc.moveTo(40, y).lineTo(555, y).stroke();
  y += 8;

  doc.font("Helvetica").fontSize(8);

  for (const line of invoice.lines) {
    y = ensurePageSpace(doc, y, 30);

    doc.text(String(line.lineNumber), columns.line, y);
    doc.text(line.description, columns.description, y, { width: 185 });

    doc.text(String(line.quantity), columns.qty, y, {
      width: 40,
      align: "right",
    });

    doc.text(formatMoney(line.unitPrice), columns.unitPrice, y, {
      width: 55,
      align: "right",
    });

    doc.text(`${Number(line.discountRate).toFixed(2)}%`, columns.discount, y, {
      width: 45,
      align: "right",
    });

    doc.text(`${Number(line.taxRate).toFixed(2)}%`, columns.tax, y, {
      width: 35,
      align: "right",
    });

    doc.text(formatMoney(line.total), columns.total, y, {
      width: 70,
      align: "right",
    });

    y += 24;
  }

  y += 10;

  // Tax summary
  y = drawSectionTitle(doc, "Resumen de impuestos", y);

  doc.font("Helvetica-Bold").fontSize(8);
  doc.text("IVA", 350, y, { width: 50, align: "right" });
  doc.text("Base", 410, y, { width: 60, align: "right" });
  doc.text("Cuota", 485, y, { width: 70, align: "right" });

  y += 14;
  doc.moveTo(350, y).lineTo(555, y).stroke();
  y += 8;

  doc.font("Helvetica").fontSize(8);

  for (const taxSummary of invoice.taxSummaries) {
    y = ensurePageSpace(doc, y, 22);

    doc.text(`${Number(taxSummary.taxRate).toFixed(2)}%`, 350, y, {
      width: 50,
      align: "right",
    });

    doc.text(formatMoney(taxSummary.taxBase), 410, y, {
      width: 60,
      align: "right",
    });

    doc.text(formatMoney(taxSummary.taxAmount), 485, y, {
      width: 70,
      align: "right",
    });

    y += 18;
  }

  y += 10;

  // Totals
  y = ensurePageSpace(doc, y, 70);

  const totalsX = 370;

  doc.font("Helvetica-Bold").fontSize(10);
  y = drawLabelValue(
    doc,
    "Subtotal",
    formatMoney(invoice.subtotal),
    totalsX,
    y,
    90
  );
  y = drawLabelValue(doc, "IVA", formatMoney(invoice.taxTotal), totalsX, y, 90);
  y = drawLabelValue(doc, "Total", formatMoney(invoice.total), totalsX, y, 90);

  // Notes
  if (invoice.notes) {
    y += 20;
    y = ensurePageSpace(doc, y, 50);
    y = drawSectionTitle(doc, "Notas", y);

    doc.font("Helvetica").fontSize(9).text(invoice.notes, 40, y, {
      width: 515,
    });
  }

  // Footer
  doc
    .font("Helvetica")
    .fontSize(8)
    .text("Documento generado por BenxCore", 40, 790, {
      align: "center",
      width: 515,
    });

  doc.end();

  const buffer = await pdfPromise;

  return {
    buffer,
    filename: `${sanitizeFilename(invoiceNumber)}.pdf`,
  };
}