import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./lib/prisma.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { companyRouter } from "./modules/company/company.routes.js";
import { clientsRouter } from "./modules/clients/clients.routes.js";
import { productsRouter } from "./modules/products/products.routes.js";
import { invoiceSeriesRouter } from "./modules/invoice-series/invoice-series.routes.js";
import { invoicesRouter } from "./modules/invoices/invoices.routes.js";
import { accountingRouter } from "./modules/accounting/accounting.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/company", companyRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/products", productsRouter);
app.use("/api/invoice-series", invoiceSeriesRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/accounting", accountingRouter);

app.get("/", (req, res) => {
  res.json({
    message: "BenxCore API is running",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

const PORT = process.env.PORT || 3000;

app.get("/api/companies", async (req, res) => {
  const companies = await prisma.company.findMany();

  res.json(companies);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});