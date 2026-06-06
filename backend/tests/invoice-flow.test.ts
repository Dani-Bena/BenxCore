import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

describe("Main invoice flow", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("registers a company, creates an invoice, issues it and registers a payment", async () => {
    const unique = Date.now();
    const email = `test-${unique}@benxcore.test`;
    const password = "12345678";

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        companyName: `Test Company ${unique}`,
        name: "Test Admin",
        email,
        password,
      })
      .expect(201);

    const token = registerResponse.body.token;

    expect(token).toBeTruthy();
    expect(registerResponse.body.user.email).toBe(email);

    await request(app)
      .put("/api/company")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: `Test Company ${unique}`,
        nif: "B12345678",
        email: "test@benxcore.test",
        phone: "600123456",
        address: "Calle Test 1, Madrid",
      })
      .expect(200);

    const clientResponse = await request(app)
      .post("/api/clients")
      .set("Authorization", `Bearer ${token}`)
      .send({
        legalName: `Cliente Test ${unique} S.L.`,
        tradeName: `Cliente Test ${unique}`,
        type: "COMPANY",
        taxId: `B${String(unique).slice(-8)}`,
        taxIdType: "CIF",
        email: `cliente-${unique}@test.com`,
        invoicingEmail: `facturas-${unique}@test.com`,
        phone: "611222333",
        address: "Calle Cliente Test 10",
        city: "Madrid",
        province: "Madrid",
        postalCode: "28001",
        countryCode: "ES",
        paymentTermsDays: 30,
        notes: "Cliente creado desde test",
      })
      .expect(201);

    const clientId = clientResponse.body.client.id;

    expect(clientId).toBeTruthy();

    const productResponse = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        code: `WEB-${unique}`,
        name: "Servicio Test",
        description: "Servicio para prueba de flujo",
        type: "SERVICE",
        unit: "project",
        price: "1200",
        costPrice: "300",
        taxRate: "21",
      })
      .expect(201);

    const productId = productResponse.body.product.id;

    expect(productId).toBeTruthy();

    const seriesResponse = await request(app)
      .post("/api/invoice-series")
      .set("Authorization", `Bearer ${token}`)
      .send({
        code: `FACT-${unique}`,
        prefix: `T${String(unique).slice(-4)}-`,
        currentNumber: 0,
        year: 2026,
      })
      .expect(201);

    const invoiceSeriesId = seriesResponse.body.invoiceSeries.id;

    expect(invoiceSeriesId).toBeTruthy();

    const invoiceResponse = await request(app)
      .post("/api/invoices")
      .set("Authorization", `Bearer ${token}`)
      .send({
        clientId,
        invoiceSeriesId,
        type: "STANDARD",
        dueDate: "2026-07-03",
        notes: "Factura creada desde test",
        lines: [
          {
            productId,
            description: "Servicio Test",
            unit: "project",
            quantity: "1",
            unitPrice: "1200",
            discountRate: "10",
            taxRate: "21",
          },
        ],
      })
      .expect(201);

    const invoiceId = invoiceResponse.body.invoice.id;

    expect(invoiceId).toBeTruthy();
    expect(invoiceResponse.body.invoice.status).toBe("DRAFT");
    expect(Number(invoiceResponse.body.invoice.total)).toBe(1306.8);

    const issuedResponse = await request(app)
      .post(`/api/invoices/${invoiceId}/issue`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(issuedResponse.body.invoice.status).toBe("ISSUED");
    expect(issuedResponse.body.invoice.invoiceNumber).toBeTruthy();

    await request(app)
      .put(`/api/invoices/${invoiceId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        notes: "Intento modificar factura emitida",
      })
      .expect(409);

    const paymentResponse = await request(app)
      .post(`/api/invoices/${invoiceId}/payments`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: "500",
        method: "BANK_TRANSFER",
        reference: "TEST-PAYMENT-001",
        notes: "Pago parcial de test",
      })
      .expect(201);

    const paymentId = paymentResponse.body.payment.id;

    expect(paymentId).toBeTruthy();
    expect(paymentResponse.body.invoice.status).toBe("PARTIALLY_PAID");
    expect(Number(paymentResponse.body.invoice.amountPaid)).toBe(500);
    expect(Number(paymentResponse.body.invoice.amountDue)).toBe(806.8);

    const accountingResponse = await request(app)
      .get("/api/accounting/journal-entries")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const journalEntries = accountingResponse.body.journalEntries;

    expect(journalEntries.length).toBeGreaterThanOrEqual(2);

    const invoiceEntry = journalEntries.find(
      (entry: any) =>
        entry.source === "INVOICE" && entry.invoice?.id === invoiceId
    );

    const paymentEntry = journalEntries.find(
      (entry: any) =>
        entry.source === "PAYMENT" && entry.payment?.id === paymentId
    );

    expect(invoiceEntry).toBeTruthy();
    expect(paymentEntry).toBeTruthy();

    const invoiceDebit = invoiceEntry.lines.reduce(
      (sum: number, line: any) => sum + Number(line.debit),
      0
    );

    const invoiceCredit = invoiceEntry.lines.reduce(
      (sum: number, line: any) => sum + Number(line.credit),
      0
    );

    expect(Number(invoiceDebit.toFixed(2))).toBe(
      Number(invoiceCredit.toFixed(2))
    );

    const paymentDebit = paymentEntry.lines.reduce(
      (sum: number, line: any) => sum + Number(line.debit),
      0
    );

    const paymentCredit = paymentEntry.lines.reduce(
      (sum: number, line: any) => sum + Number(line.credit),
      0
    );

    expect(Number(paymentDebit.toFixed(2))).toBe(
      Number(paymentCredit.toFixed(2))
    );
  });
});