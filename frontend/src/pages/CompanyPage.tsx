import { useEffect, useState } from "react";
import { apiRequest } from "../api";

type Props = {
  token: string;
  notify: (message: string) => void;
};

type Company = {
  id: number;
  name: string;
  nif: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type CompanyForm = {
  name: string;
  nif: string;
  email: string;
  phone: string;
  address: string;
};

const emptyForm: CompanyForm = {
  name: "",
  nif: "",
  email: "",
  phone: "",
  address: "",
};

export function CompanyPage({ token, notify }: Props) {
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [loaded, setLoaded] = useState(false);

  async function loadCompany() {
    const data = await apiRequest<{ company: Company }>("/api/company", token);
    setForm({
      name: data.company.name,
      nif: data.company.nif ?? "",
      email: data.company.email ?? "",
      phone: data.company.phone ?? "",
      address: data.company.address ?? "",
    });
    setLoaded(true);
  }

  useEffect(() => {
    loadCompany().catch((error) =>
      notify(error instanceof Error ? error.message : "Error cargando empresa")
    );
  }, []);

  function update(field: keyof CompanyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveCompany() {
    try {
      if (form.name.trim().length < 2) {
        notify("El nombre de la empresa debe tener al menos 2 caracteres");
        return;
      }

      await apiRequest("/api/company", token, {
        method: "PUT",
        body: JSON.stringify({
          name: form.name,
          nif: form.nif || null,
          email: form.email || null,
          phone: form.phone || null,
          address: form.address || null,
        }),
      });

      notify("Datos de empresa actualizados correctamente");
      await loadCompany();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Error guardando empresa");
    }
  }

  if (!loaded) return null;

  return (
    <section className="page-grid">
      <article className="card">
        <div className="section-header">
          <div>
            <h2>Configuración de empresa</h2>
            <p className="muted">
              Datos fiscales que aparecerán en las facturas emitidas.
            </p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Nombre fiscal
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
            <small className="field-hint">Obligatorio. Mínimo 2 caracteres</small>
          </label>

          <label>
            NIF/CIF
            <input
              value={form.nif}
              onChange={(e) => update("nif", e.target.value)}
            />
            <small className="field-hint">Necesario para emitir facturas. Máximo 20 caracteres</small>
          </label>

          <label>
            Dirección fiscal
            <input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
            <small className="field-hint">Necesaria para emitir facturas. Máximo 255 caracteres</small>
          </label>

          <label>
            Email de empresa
            <input
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
            <small className="field-hint">Opcional. Aparecerá en las facturas</small>
          </label>

          <label>
            Teléfono
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
            <small className="field-hint">Opcional. Aparecerá en las facturas</small>
          </label>
        </div>

        <div className="actions-right">
          <button onClick={saveCompany}>Guardar cambios</button>
        </div>
      </article>
    </section>
  );
}
