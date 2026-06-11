import { useEffect, useMemo, useState } from "react";
import { apiRequest, downloadPdf, formatDate, money } from "../api";
import { Modal } from "../components/Modal";
import type {
  Client,
  Invoice,
  InvoiceSeries,
  JournalEntry,
  Payment,
  Product,
} from "../types";

type Props = {
  token: string;
  notify: (message: string) => void;
};

type AccountingEntry = JournalEntry & {
  invoice?: {
    id: number;
    invoiceNumber: string | null;
    status: string;
    total: string;
  } | null;
  payment?: {
    id: number;
  } | null;
};

type InvoiceForm = {
  clientId: string;
  invoiceSeriesId: string;
  productId: string;
  dueDate: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRate: string;
  notes: string;
};

const emptyForm: InvoiceForm = {
  clientId: "",
  invoiceSeriesId: "",
  productId: "",
  dueDate: "2026-07-30",
  description: "",
  unit: "unit",
  quantity: "1",
  unitPrice: "100",
  discountRate: "0",
  taxRate: "21",
  notes: "Factura creada desde BenxCore",
};

function clientName(client?: Client) {
  return client?.legalName ?? client?.name ?? "-";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Borrador",
    ISSUED: "Emitida",
    PARTIALLY_PAID: "Pago parcial",
    PAID: "Pagada",
    OVERDUE: "Vencida",
    CANCELLED: "Cancelada",
  };
  return labels[status] ?? status;
}

function canIssue(invoice: Invoice) {
  return invoice.status === "DRAFT";
}

function canDownloadInvoicePdf(invoice: Invoice) {
  return invoice.status !== "DRAFT" && invoice.status !== "CANCELLED";
}

function canPay(invoice: Invoice) {
  return (
    invoice.status !== "DRAFT" &&
    invoice.status !== "CANCELLED" &&
    invoice.status !== "PAID"
  );
}

function entryBalance(entry: JournalEntry) {
  const debit = entry.lines.reduce((sum, line) => sum + Number(line.debit), 0);
  const credit = entry.lines.reduce(
    (sum, line) => sum + Number(line.credit),
    0
  );
  return { debit, credit, balanced: debit.toFixed(2) === credit.toFixed(2) };
}

function draftTotals(form: InvoiceForm) {
  const quantity = Number(form.quantity || 0);
  const unitPrice = Number(form.unitPrice || 0);
  const discountRate = Number(form.discountRate || 0);
  const taxRate = Number(form.taxRate || 0);
  const gross = quantity * unitPrice;
  const discount = gross * (discountRate / 100);
  const subtotal = gross - discount;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

export function InvoicesPage({ token, notify }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [series, setSeries] = useState<InvoiceSeries[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [journalEntries, setJournalEntries] = useState<AccountingEntry[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState<InvoiceForm>(emptyForm);
  const [paymentAmount, setPaymentAmount] = useState("500");
  const [paymentReference, setPaymentReference] = useState("PAY-001");
  const [paymentNotes, setPaymentNotes] = useState(
    "Cobro registrado desde frontend"
  );

  const estimated = useMemo(() => draftTotals(form), [form]);

  const selectedInvoiceJournalEntries = useMemo(() => {
    if (!selectedInvoice) return [];
    if (
      selectedInvoice.journalEntries &&
      selectedInvoice.journalEntries.length > 0
    ) {
      return selectedInvoice.journalEntries;
    }
    return journalEntries.filter(
      (entry) => entry.invoice?.id === selectedInvoice.id
    );
  }, [journalEntries, selectedInvoice]);

  async function loadAll() {
    const [
      clientsData,
      productsData,
      seriesData,
      invoicesData,
      journalEntriesData,
    ] = await Promise.all([
      apiRequest<{ clients: Client[] }>("/api/clients", token),
      apiRequest<{ products: Product[] }>("/api/products", token),
      apiRequest<{ invoiceSeries: InvoiceSeries[] }>(
        "/api/invoice-series",
        token
      ),
      apiRequest<{ invoices: Invoice[] }>("/api/invoices", token),
      apiRequest<{ journalEntries: AccountingEntry[] }>(
        "/api/accounting/journal-entries",
        token
      ),
    ]);
    setClients(clientsData.clients);
    setProducts(productsData.products);
    setSeries(seriesData.invoiceSeries);
    setInvoices(invoicesData.invoices);
    setJournalEntries(journalEntriesData.journalEntries);
  }

  async function loadInvoice(invoiceId: number) {
    const data = await apiRequest<{ invoice: Invoice }>(
      `/api/invoices/${invoiceId}`,
      token
    );
    setSelectedInvoice(data.invoice);
  }

  useEffect(() => {
    loadAll().catch((error) =>
      notify(
        error instanceof Error ? error.message : "Error cargando facturas"
      )
    );
  }, []);

  function update(field: keyof InvoiceForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectProduct(productId: string) {
    const product = products.find((item) => String(item.id) === productId);
    setForm((current) => ({
      ...current,
      productId,
      description: product?.description ?? product?.name ?? current.description,
      unit: product?.unit ?? current.unit,
      unitPrice: product?.price ?? current.unitPrice,
      taxRate: product?.taxRate ?? current.taxRate,
    }));
  }

  async function createInvoice() {
    try {
      if (!form.clientId) { notify("Selecciona un cliente"); return; }
      if (!form.invoiceSeriesId) { notify("Selecciona una serie"); return; }
      if (!form.description.trim()) { notify("Introduce una descripción"); return; }

      const line: Record<string, unknown> = {
        description: form.description,
        unit: form.unit,
        quantity: form.quantity,
        unitPrice: form.unitPrice,
        discountRate: form.discountRate,
        taxRate: form.taxRate,
      };
      if (form.productId) line.productId = Number(form.productId);

      const data = await apiRequest<{ invoice: Invoice }>(
        "/api/invoices",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            clientId: Number(form.clientId),
            invoiceSeriesId: Number(form.invoiceSeriesId),
            type: "STANDARD",
            dueDate: form.dueDate,
            notes: form.notes,
            lines: [line],
          }),
        }
      );
      setForm(emptyForm);
      notify(`Factura creada en borrador. ID ${data.invoice.id}`);
      await loadAll();
      await loadInvoice(data.invoice.id);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Error creando factura");
    }
  }

  async function issueInvoice(invoice: Invoice) {
    try {
      const data = await apiRequest<{ invoice: Invoice }>(
        `/api/invoices/${invoice.id}/issue`,
        token,
        { method: "POST" }
      );
      notify(`Factura emitida: ${data.invoice.invoiceNumber}`);
      await loadAll();
      await loadInvoice(invoice.id);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Error emitiendo factura"
      );
    }
  }

  async function downloadInvoice(invoice: Invoice) {
    try {
      if (!canDownloadInvoicePdf(invoice)) {
        notify("Solo puedes descargar PDF de facturas emitidas");
        return;
      }
      await downloadPdf(
        `/api/invoices/${invoice.id}/pdf`,
        token,
        `${invoice.invoiceNumber ?? `factura-${invoice.id}`}.pdf`
      );
      notify("PDF de factura descargado");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Error descargando PDF");
    }
  }

  async function registerPayment() {
    try {
      if (!selectedInvoice) return;
      await apiRequest(`/api/invoices/${selectedInvoice.id}/payments`, token, {
        method: "POST",
        body: JSON.stringify({
          amount: paymentAmount,
          method: "BANK_TRANSFER",
          reference: paymentReference,
          notes: paymentNotes,
        }),
      });
      notify("Cobro registrado correctamente");
      await loadAll();
      await loadInvoice(selectedInvoice.id);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Error registrando cobro"
      );
    }
  }

  async function downloadPaymentReceipt(payment: Payment) {
    try {
      if (!selectedInvoice) return;
      await downloadPdf(
        `/api/invoices/${selectedInvoice.id}/payments/${payment.id}/receipt`,
        token,
        `comprobante-pago-${payment.id}.pdf`
      );
      notify("Comprobante descargado");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Error descargando comprobante"
      );
    }
  }

  return (
    <section className="page-stack">
      <article className="card">
        <div className="section-header">
          <div>
            <h2>Nueva factura</h2>
            <p className="muted">
              Crea un borrador seleccionando cliente, serie y línea facturable.
            </p>
          </div>
        </div>
        <div className="invoice-builder">
          <div className="form-grid">
            <label>
              Cliente
              <select
                value={form.clientId}
                onChange={(e) => update("clientId", e.target.value)}
              >
                <option value="">Selecciona cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {clientName(client)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Serie
              <select
                value={form.invoiceSeriesId}
                onChange={(e) => update("invoiceSeriesId", e.target.value)}
              >
                <option value="">Selecciona serie</option>
                {series.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} · {item.prefix}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Vencimiento
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => update("dueDate", e.target.value)}
              />
            </label>
            <label>
              Producto/servicio
              <select
                value={form.productId}
                onChange={(e) => selectProduct(e.target.value)}
              >
                <option value="">Sin producto asociado</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.code ? `${product.code} · ` : ""}
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="wide">
              Descripción
              <input
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </label>
            <label>
              Unidad
              <input
                value={form.unit}
                onChange={(e) => update("unit", e.target.value)}
              />
            </label>
            <label>
              Cantidad
              <input
                value={form.quantity}
                onChange={(e) => update("quantity", e.target.value)}
              />
            </label>
            <label>
              Precio
              <input
                value={form.unitPrice}
                onChange={(e) => update("unitPrice", e.target.value)}
              />
            </label>
            <label>
              Descuento %
              <input
                value={form.discountRate}
                onChange={(e) => update("discountRate", e.target.value)}
              />
            </label>
            <label>
              IVA %
              <input
                value={form.taxRate}
                onChange={(e) => update("taxRate", e.target.value)}
              />
            </label>
            <label className="wide">
              Notas
              <input
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </label>
          </div>
          <aside className="invoice-estimate">
            <span>Resumen estimado</span>
            <div>
              <small>Base imponible</small>
              <strong>{money(estimated.subtotal)}</strong>
            </div>
            <div>
              <small>IVA</small>
              <strong>{money(estimated.tax)}</strong>
            </div>
            <div className="estimate-total">
              <small>Total</small>
              <strong>{money(estimated.total)}</strong>
            </div>
            <button onClick={createInvoice}>Crear factura</button>
          </aside>
        </div>
      </article>

      <article className="card">
        <div className="section-header">
          <div>
            <h2>Facturas</h2>
            <p className="muted">Emite, consulta, cobra y descarga documentos.</p>
          </div>
          <button onClick={loadAll}>Refrescar</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Número</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Pendiente</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.id}</td>
                <td>{invoice.invoiceNumber ?? "-"}</td>
                <td>{clientName(invoice.client)}</td>
                <td>
                  <span className={`status ${invoice.status}`}>
                    {statusLabel(invoice.status)}
                  </span>
                </td>
                <td>{money(invoice.total)}</td>
                <td>{money(invoice.amountPaid)}</td>
                <td>{money(invoice.amountDue)}</td>
                <td>
                  <div className="row-actions">
                    <button onClick={() => loadInvoice(invoice.id)}>
                      Ver detalle
                    </button>
                    <button
                      disabled={!canIssue(invoice)}
                      onClick={() => issueInvoice(invoice)}
                    >
                      Emitir
                    </button>
                    <button
                      disabled={!canDownloadInvoicePdf(invoice)}
                      onClick={() => downloadInvoice(invoice)}
                    >
                      PDF factura
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  No hay facturas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>

      {selectedInvoice && (
        <Modal onClose={() => setSelectedInvoice(null)}>
        <article className="invoice-detail-card">
          <div className="invoice-detail-header">
            <div>
              <span className={`status ${selectedInvoice.status}`}>
                {statusLabel(selectedInvoice.status)}
              </span>
              <h2>
                {selectedInvoice.invoiceNumber ??
                  `Factura borrador #${selectedInvoice.id}`}
              </h2>
              <p>
                Cliente:{" "}
                <strong>{clientName(selectedInvoice.client)}</strong>
              </p>
            </div>
            <div className="invoice-detail-actions">
              <button
                disabled={!canIssue(selectedInvoice)}
                onClick={() => issueInvoice(selectedInvoice)}
              >
                Emitir factura
              </button>
              <button
                disabled={!canDownloadInvoicePdf(selectedInvoice)}
                onClick={() => downloadInvoice(selectedInvoice)}
              >
                Descargar factura PDF
              </button>
            </div>
          </div>

          <div className="invoice-metrics">
            <div>
              <span>Total</span>
              <strong>{money(selectedInvoice.total)}</strong>
            </div>
            <div>
              <span>Cobrado</span>
              <strong>{money(selectedInvoice.amountPaid)}</strong>
            </div>
            <div>
              <span>Pendiente</span>
              <strong>{money(selectedInvoice.amountDue)}</strong>
            </div>
            <div>
              <span>Vencimiento</span>
              <strong>{formatDate(selectedInvoice.dueDate ?? null)}</strong>
            </div>
          </div>

          <section className="detail-block">
            <h3>Líneas de factura</h3>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Dto.</th>
                  <th>IVA</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedInvoice.lines ?? []).map((line) => (
                  <tr key={line.id}>
                    <td>{line.lineNumber}</td>
                    <td>{line.description}</td>
                    <td>{line.quantity}</td>
                    <td>{money(line.unitPrice)}</td>
                    <td>{Number(line.discountRate).toFixed(2)}%</td>
                    <td>{Number(line.taxRate).toFixed(2)}%</td>
                    <td>{money(line.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="detail-block">
            <div className="section-header compact">
              <div>
                <h3>Cobros</h3>
                <p className="muted">Registra pagos parciales o completos.</p>
              </div>
            </div>
            <div className="payment-form">
              <input
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Importe"
              />
              <input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Referencia"
              />
              <input
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Notas"
              />
              <button
                disabled={!canPay(selectedInvoice)}
                onClick={registerPayment}
              >
                Registrar cobro
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th>Importe</th>
                  <th>Documento</th>
                </tr>
              </thead>
              <tbody>
                {(selectedInvoice.payments ?? []).map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.id}</td>
                    <td>{formatDate(payment.paymentDate)}</td>
                    <td>{payment.method}</td>
                    <td>{payment.reference ?? "-"}</td>
                    <td>{money(payment.amount)}</td>
                    <td>
                      <button onClick={() => downloadPaymentReceipt(payment)}>
                        Comprobante PDF
                      </button>
                    </td>
                  </tr>
                ))}
                {(selectedInvoice.payments ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty">
                      No hay cobros registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="detail-block">
            <h3>Asientos contables</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fuente</th>
                  <th>Descripción</th>
                  <th>Debe</th>
                  <th>Haber</th>
                  <th>Validación</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoiceJournalEntries.map((entry) => {
                  const balance = entryBalance(entry);
                  return (
                    <tr key={entry.id}>
                      <td>{entry.id}</td>
                      <td>{entry.source}</td>
                      <td>{entry.description ?? "-"}</td>
                      <td>{money(balance.debit)}</td>
                      <td>{money(balance.credit)}</td>
                      <td>
                        <span className={balance.balanced ? "ok" : "bad"}>
                          {balance.balanced ? "CUADRADO" : "NO CUADRADO"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {selectedInvoiceJournalEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty">
                      No hay asientos asociados todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </article>
        </Modal>
      )}
    </section>
  );
}