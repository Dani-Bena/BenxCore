import { useEffect, useMemo, useState } from "react";
import { apiRequest, money } from "../api";
import type {
  Client,
  Invoice,
  InvoiceSeries,
  InvoiceStatusFilter,
  Product,
} from "../types";

type Props = {
  token: string;
  notify: (message: string) => void;
  onNavigateToInvoices: (filter: InvoiceStatusFilter) => void;
};

function clientName(invoice: Invoice) {
  return invoice.client?.legalName ?? invoice.client?.name ?? "-";
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

export function DashboardPage({ token, notify, onNavigateToInvoices }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [series, setSeries] = useState<InvoiceSeries[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  async function loadDashboard() {
    const [clientsData, productsData, seriesData, invoicesData] =
      await Promise.all([
        apiRequest<{ clients: Client[] }>(
          "/api/clients?includeInactive=true",
          token
        ),
        apiRequest<{ products: Product[] }>(
          "/api/products?includeInactive=true",
          token
        ),
        apiRequest<{ invoiceSeries: InvoiceSeries[] }>(
          "/api/invoice-series?includeInactive=true",
          token
        ),
        apiRequest<{ invoices: Invoice[] }>("/api/invoices", token),
      ]);

    setClients(clientsData.clients);
    setProducts(productsData.products);
    setSeries(seriesData.invoiceSeries);
    setInvoices(invoicesData.invoices);
  }

  useEffect(() => {
    loadDashboard().catch((error) =>
      notify(error instanceof Error ? error.message : "Error cargando dashboard")
    );
  }, []);

  const stats = useMemo(() => {
    const totalInvoiced = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.total),
      0
    );

    const totalPaid = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.amountPaid),
      0
    );

    const totalDue = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.amountDue),
      0
    );

    const pendingInvoices = invoices.filter(
      (invoice) =>
        invoice.status === "ISSUED" ||
        invoice.status === "PARTIALLY_PAID" ||
        invoice.status === "OVERDUE"
    ).length;

    return {
      totalInvoiced,
      totalPaid,
      totalDue,
      pendingInvoices,
      draftCount: invoices.filter((invoice) => invoice.status === "DRAFT")
        .length,
      paidCount: invoices.filter((invoice) => invoice.status === "PAID").length,
      activeClients: clients.filter((client) => client.active).length,
      activeProducts: products.filter((product) => product.active).length,
      activeSeries: series.filter((item) => item.active).length,
    };
  }, [clients, products, series, invoices]);

  const latestInvoices = invoices.slice(0, 5);

  return (
    <section className="page-stack">
      <article className="card">
        <div className="section-header">
          <div>
            <h2>Dashboard</h2>
            <p className="muted">
              Resumen operativo de facturación, cobros y datos maestros.
            </p>
          </div>

          <button onClick={loadDashboard}>Refrescar</button>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <span>Total facturado</span>
            <strong>{money(stats.totalInvoiced)}</strong>
          </div>

          <div className="dashboard-card success">
            <span>Total cobrado</span>
            <strong>{money(stats.totalPaid)}</strong>
          </div>

          <div className="dashboard-card warning">
            <span>Pendiente de cobro</span>
            <strong>{money(stats.totalDue)}</strong>
          </div>

          <div
            className="dashboard-card clickable"
            role="button"
            tabIndex={0}
            onClick={() =>
              onNavigateToInvoices({
                label: "Facturas pendientes de cobro",
                statuses: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"],
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onNavigateToInvoices({
                  label: "Facturas pendientes de cobro",
                  statuses: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"],
                });
              }
            }}
          >
            <span>Facturas pendientes</span>
            <strong>{stats.pendingInvoices}</strong>
          </div>

          <div
            className="dashboard-card clickable"
            role="button"
            tabIndex={0}
            onClick={() =>
              onNavigateToInvoices({
                label: "Borradores",
                statuses: ["DRAFT"],
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onNavigateToInvoices({
                  label: "Borradores",
                  statuses: ["DRAFT"],
                });
              }
            }}
          >
            <span>Borradores</span>
            <strong>{stats.draftCount}</strong>
          </div>

          <div className="dashboard-card success">
            <span>Facturas pagadas</span>
            <strong>{stats.paidCount}</strong>
          </div>

          <div className="dashboard-card">
            <span>Clientes activos</span>
            <strong>{stats.activeClients}</strong>
          </div>

          <div className="dashboard-card">
            <span>Productos activos</span>
            <strong>{stats.activeProducts}</strong>
          </div>

          <div className="dashboard-card">
            <span>Series activas</span>
            <strong>{stats.activeSeries}</strong>
          </div>
        </div>
      </article>

      <article className="card">
        <h2>Últimas facturas</h2>
        <p className="muted">Últimos documentos generados en el sistema.</p>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Número</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Pendiente</th>
            </tr>
          </thead>

          <tbody>
            {latestInvoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.id}</td>
                <td>{invoice.invoiceNumber ?? "-"}</td>
                <td>{clientName(invoice)}</td>
                <td>
                  <span className={`status ${invoice.status}`}>
                    {statusLabel(invoice.status)}
                  </span>
                </td>
                <td>{money(invoice.total)}</td>
                <td>{money(invoice.amountDue)}</td>
              </tr>
            ))}

            {latestInvoices.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  Todavía no hay facturas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </section>
  );
}