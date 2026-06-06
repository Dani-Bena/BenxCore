import { useState } from "react";
import "./App.css";

const API_URL = "http://localhost:3000";

type Client = {
  id: number;
  legalName?: string;
  name?: string;
};

type Product = {
  id: number;
  code: string | null;
  name: string;
  description: string | null;
  unit: string;
  price: string;
  taxRate: string;
};

type InvoiceSeries = {
  id: number;
  code: string;
  prefix: string;
};

type Invoice = {
  id: number;
  invoiceNumber: string | null;
  status: string;
  total: string;
  amountPaid: string;
  amountDue: string;
  client?: Client;
  lines?: InvoiceLine[];
  payments?: Payment[];
};

type InvoiceLine = {
  id: number;
  lineNumber: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRate: string;
  total: string;
};

type Payment = {
  id: number;
  amount: string;
  paymentDate: string;
  method: string;
  reference: string | null;
  notes: string | null;
};

type NewInvoiceForm = {
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

const emptyInvoiceForm: NewInvoiceForm = {
  clientId: "",
  invoiceSeriesId: "",
  productId: "",
  dueDate: "2026-07-30",
  description: "",
  unit: "unit",
  quantity: "1",
  unitPrice: "0",
  discountRate: "0",
  taxRate: "21",
  notes: "Factura creada desde BenxCore",
};

function money(value: string | number | null | undefined) {
  return `${Number(value ?? 0).toFixed(2)} €`;
}

function date(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-ES").format(new Date(value));
}

function clientName(client?: Client) {
  return client?.legalName ?? client?.name ?? "-";
}

async function getErrorMessage(response: Response) {
  try {
    const body = await response.json();
    return body.message ?? "Error inesperado";
  } catch {
    return "Error inesperado";
  }
}

function canDownloadInvoicePdf(invoice: Invoice) {
  return invoice.status !== "DRAFT" && invoice.status !== "CANCELLED";
}

function canIssue(invoice: Invoice) {
  return invoice.status === "DRAFT";
}

function canPay(invoice: Invoice) {
  return (
    invoice.status !== "DRAFT" &&
    invoice.status !== "CANCELLED" &&
    invoice.status !== "PAID"
  );
}

export default function App() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("daniel@test.com");
  const [password, setPassword] = useState("12345678");
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [series, setSeries] = useState<InvoiceSeries[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<NewInvoiceForm>(emptyInvoiceForm);
  const [paymentAmount, setPaymentAmount] = useState("500");
  const [paymentReference, setPaymentReference] = useState("PAY-001");
  const [paymentNotes, setPaymentNotes] = useState("Pago registrado desde frontend");

  async function api(path: string, options: RequestInit = {}, customToken = token) {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (customToken) {
      headers.set("Authorization", `Bearer ${customToken}`);
    }
    const response = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }
    return response;
  }

  async function login() {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const data = await response.json();
      setToken(data.token);
      setMessage(`Sesión iniciada como ${data.user.email}`);
      await loadBaseData(data.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al iniciar sesión");
    }
  }

  async function loadBaseData(authToken = token) {
    try {
      const [clientsRes, productsRes, seriesRes, invoicesRes] = await Promise.all([
        api("/api/clients", { method: "GET" }, authToken),
        api("/api/products", { method: "GET" }, authToken),
        api("/api/invoice-series", { method: "GET" }, authToken),
        api("/api/invoices", { method: "GET" }, authToken),
      ]);
      const clientsData = await clientsRes.json();
      const productsData = await productsRes.json();
      const seriesData = await seriesRes.json();
      const invoicesData = await invoicesRes.json();
      setClients(clientsData.clients ?? []);
      setProducts(productsData.products ?? []);
      setSeries(seriesData.invoiceSeries ?? []);
      setInvoices(invoicesData.invoices ?? []);
      setMessage("Datos cargados correctamente");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error cargando datos");
    }
  }

  async function loadInvoice(invoiceId: number) {
    try {
      const response = await api(`/api/invoices/${invoiceId}`);
      const data = await response.json();
      setSelectedInvoice(data.invoice);
      setMessage(`Factura ${invoiceId} cargada`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error cargando factura");
    }
  }

  function updateInvoiceForm(field: keyof NewInvoiceForm, value: string) {
    setInvoiceForm((current) => ({ ...current, [field]: value }));
  }

  function selectProduct(productId: string) {
    const product = products.find((item) => String(item.id) === productId);
    setInvoiceForm((current) => ({
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
      if (!invoiceForm.clientId) { setMessage("Selecciona un cliente"); return; }
      if (!invoiceForm.invoiceSeriesId) { setMessage("Selecciona una serie"); return; }
      if (!invoiceForm.description.trim()) { setMessage("Introduce una descripción"); return; }

      const line: Record<string, unknown> = {
        description: invoiceForm.description,
        unit: invoiceForm.unit,
        quantity: invoiceForm.quantity,
        unitPrice: invoiceForm.unitPrice,
        discountRate: invoiceForm.discountRate,
        taxRate: invoiceForm.taxRate,
      };
      if (invoiceForm.productId) {
        line.productId = Number(invoiceForm.productId);
      }

      const response = await api("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          clientId: Number(invoiceForm.clientId),
          invoiceSeriesId: Number(invoiceForm.invoiceSeriesId),
          type: "STANDARD",
          dueDate: invoiceForm.dueDate,
          notes: invoiceForm.notes,
          lines: [line],
        }),
      });
      const data = await response.json();
      setMessage(`Factura creada en borrador. ID ${data.invoice.id}`);
      setInvoiceForm(emptyInvoiceForm);
      await loadBaseData();
      await loadInvoice(data.invoice.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error creando factura");
    }
  }

  async function issueInvoice(invoice: Invoice) {
    try {
      const response = await api(`/api/invoices/${invoice.id}/issue`, { method: "POST" });
      const data = await response.json();
      setMessage(`Factura emitida: ${data.invoice.invoiceNumber}`);
      await loadBaseData();
      await loadInvoice(invoice.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error emitiendo factura");
    }
  }

  async function registerPayment() {
    if (!selectedInvoice) return;
    try {
      const response = await api(`/api/invoices/${selectedInvoice.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: paymentAmount,
          method: "BANK_TRANSFER",
          reference: paymentReference,
          notes: paymentNotes,
        }),
      });
      const data = await response.json();
      setMessage(`Pago registrado. Estado: ${data.invoice.status}`);
      await loadBaseData();
      await loadInvoice(selectedInvoice.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error registrando pago");
    }
  }

  async function downloadPdf(path: string, filename: string) {
    try {
      const response = await fetch(`${API_URL}${path}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage(`PDF descargado: ${filename}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error descargando PDF");
    }
  }

  async function downloadInvoicePdf(invoice: Invoice) {
    if (!canDownloadInvoicePdf(invoice)) {
      setMessage("Solo puedes descargar PDF de una factura emitida");
      return;
    }
    await downloadPdf(
      `/api/invoices/${invoice.id}/pdf`,
      `${invoice.invoiceNumber ?? `factura-${invoice.id}`}.pdf`
    );
  }

  async function downloadPaymentReceipt(payment: Payment) {
    if (!selectedInvoice) return;
    await downloadPdf(
      `/api/invoices/${selectedInvoice.id}/payments/${payment.id}/receipt`,
      `comprobante-pago-${payment.id}.pdf`
    );
  }

  return (
    <main className="layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">B</div>
          <div>
            <h1>BenxCore</h1>
            <p>ERP MVP</p>
          </div>
        </div>

        <section className="login-box">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={login}>Iniciar sesión</button>
          <button disabled={!token} onClick={() => loadBaseData()}>
            Refrescar datos
          </button>
        </section>

        {message && <div className="message">{message}</div>}
      </aside>

      <section className="content">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Nueva factura</h2>
              <p>Crea una factura en borrador.</p>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Cliente
              <select
                value={invoiceForm.clientId}
                onChange={(e) => updateInvoiceForm("clientId", e.target.value)}
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
                value={invoiceForm.invoiceSeriesId}
                onChange={(e) => updateInvoiceForm("invoiceSeriesId", e.target.value)}
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
                value={invoiceForm.dueDate}
                onChange={(e) => updateInvoiceForm("dueDate", e.target.value)}
              />
            </label>

            <label>
              Producto
              <select
                value={invoiceForm.productId}
                onChange={(e) => selectProduct(e.target.value)}
              >
                <option value="">Sin producto</option>
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
                value={invoiceForm.description}
                onChange={(e) => updateInvoiceForm("description", e.target.value)}
              />
            </label>

            <label>
              Unidad
              <input
                value={invoiceForm.unit}
                onChange={(e) => updateInvoiceForm("unit", e.target.value)}
              />
            </label>

            <label>
              Cantidad
              <input
                value={invoiceForm.quantity}
                onChange={(e) => updateInvoiceForm("quantity", e.target.value)}
              />
            </label>

            <label>
              Precio
              <input
                value={invoiceForm.unitPrice}
                onChange={(e) => updateInvoiceForm("unitPrice", e.target.value)}
              />
            </label>

            <label>
              Descuento %
              <input
                value={invoiceForm.discountRate}
                onChange={(e) => updateInvoiceForm("discountRate", e.target.value)}
              />
            </label>

            <label>
              IVA %
              <input
                value={invoiceForm.taxRate}
                onChange={(e) => updateInvoiceForm("taxRate", e.target.value)}
              />
            </label>

            <label className="wide">
              Notas
              <input
                value={invoiceForm.notes}
                onChange={(e) => updateInvoiceForm("notes", e.target.value)}
              />
            </label>
          </div>

          <div className="right">
            <button disabled={!token} onClick={createInvoice}>
              Crear factura
            </button>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2>Facturas</h2>
              <p>Emite, consulta, descarga PDF y registra cobros.</p>
            </div>
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
                    <span className={`status ${invoice.status}`}>{invoice.status}</span>
                  </td>
                  <td>{money(invoice.total)}</td>
                  <td>{money(invoice.amountPaid)}</td>
                  <td>{money(invoice.amountDue)}</td>
                  <td>
                    <div className="actions">
                      <button onClick={() => loadInvoice(invoice.id)}>Ver</button>
                      <button
                        disabled={!canIssue(invoice)}
                        onClick={() => issueInvoice(invoice)}
                      >
                        Emitir
                      </button>
                      <button
                        disabled={!canDownloadInvoicePdf(invoice)}
                        onClick={() => downloadInvoicePdf(invoice)}
                      >
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
                    No hay facturas cargadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {selectedInvoice && (
          <section className="card">
            <div className="card-header">
              <div>
                <h2>Detalle factura #{selectedInvoice.id}</h2>
                <p>
                  {selectedInvoice.invoiceNumber ?? "Sin número"} · {selectedInvoice.status}
                </p>
              </div>
              <div className="actions">
                <button
                  disabled={!canIssue(selectedInvoice)}
                  onClick={() => issueInvoice(selectedInvoice)}
                >
                  Emitir
                </button>
                <button
                  disabled={!canDownloadInvoicePdf(selectedInvoice)}
                  onClick={() => downloadInvoicePdf(selectedInvoice)}
                >
                  Factura PDF
                </button>
              </div>
            </div>

            <div className="summary">
              <div>
                <span>Cliente</span>
                <strong>{clientName(selectedInvoice.client)}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{money(selectedInvoice.total)}</strong>
              </div>
              <div>
                <span>Pagado</span>
                <strong>{money(selectedInvoice.amountPaid)}</strong>
              </div>
              <div>
                <span>Pendiente</span>
                <strong>{money(selectedInvoice.amountDue)}</strong>
              </div>
            </div>

            <h3>Líneas</h3>
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

            <h3>Registrar cobro</h3>
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
              <button disabled={!canPay(selectedInvoice)} onClick={registerPayment}>
                Registrar cobro
              </button>
            </div>

            <h3>Cobros</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th>Importe</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {(selectedInvoice.payments ?? []).map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.id}</td>
                    <td>{date(payment.paymentDate)}</td>
                    <td>{payment.method}</td>
                    <td>{payment.reference ?? "-"}</td>
                    <td>{money(payment.amount)}</td>
                    <td>
                      <button onClick={() => downloadPaymentReceipt(payment)}>
                        Comprobante
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
        )}
      </section>
    </main>
  );
}
