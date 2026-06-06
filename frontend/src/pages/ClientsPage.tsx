import { useEffect, useState } from "react";
import { apiRequest } from "../api";
import type { Client } from "../types";

type Props = {
  token: string;
  notify: (message: string) => void;
};

type ClientForm = {
  legalName: string;
  tradeName: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
};

const emptyForm: ClientForm = {
  legalName: "",
  tradeName: "",
  taxId: "",
  email: "",
  phone: "",
  address: "",
};

function displayClientName(client: Client) {
  return client.legalName ?? client.name ?? "-";
}

export function ClientsPage({ token, notify }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<ClientForm>(emptyForm);

  async function loadClients() {
    const data = await apiRequest<{ clients: Client[] }>(
      "/api/clients?includeInactive=true",
      token
    );

    setClients(data.clients);
  }

  useEffect(() => {
    loadClients().catch((error) =>
      notify(error instanceof Error ? error.message : "Error cargando clientes")
    );
  }, []);

  function update(field: keyof ClientForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function createClient() {
    try {
      if (!form.legalName.trim()) {
        notify("Introduce la razón social del cliente");
        return;
      }

      await apiRequest(
        "/api/clients",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            legalName: form.legalName,
            tradeName: form.tradeName || null,
            type: "COMPANY",
            taxId: form.taxId || null,
            taxIdType: "CIF",
            email: form.email || null,
            invoicingEmail: form.email || null,
            phone: form.phone || null,
            contactName: null,
            address: form.address || null,
            city: null,
            province: null,
            postalCode: null,
            countryCode: "ES",
            paymentTermsDays: 30,
            notes: null,
          }),
        }
      );

      setForm(emptyForm);
      notify("Cliente creado correctamente");
      await loadClients();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Error creando cliente");
    }
  }

  return (
    <section className="page-grid">
      <article className="card">
        <h2>Nuevo cliente</h2>
        <p className="muted">Crea un cliente para poder facturarlo.</p>

        <div className="form-grid">
          <label>
            Razón social
            <input
              value={form.legalName}
              onChange={(e) => update("legalName", e.target.value)}
            />
          </label>

          <label>
            Nombre comercial
            <input
              value={form.tradeName}
              onChange={(e) => update("tradeName", e.target.value)}
            />
          </label>

          <label>
            CIF/NIF
            <input
              value={form.taxId}
              onChange={(e) => update("taxId", e.target.value)}
            />
          </label>

          <label>
            Email
            <input
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </label>

          <label>
            Teléfono
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </label>

          <label>
            Dirección
            <input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </label>
        </div>

        <div className="actions-right">
          <button onClick={createClient}>Crear cliente</button>
        </div>
      </article>

      <article className="card">
        <h2>Clientes</h2>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>CIF/NIF</th>
              <th>Email</th>
              <th>Activo</th>
            </tr>
          </thead>

          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.id}</td>
                <td>{displayClientName(client)}</td>
                <td>{client.taxId ?? client.nif ?? "-"}</td>
                <td>{client.email ?? "-"}</td>
                <td>{client.active ? "Sí" : "No"}</td>
              </tr>
            ))}

            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  No hay clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </section>
  );
}