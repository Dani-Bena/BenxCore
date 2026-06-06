import { useEffect, useState } from "react";
import { apiRequest } from "../api";
import type { InvoiceSeries } from "../types";

type Props = {
  token: string;
  notify: (message: string) => void;
};

type SeriesForm = {
  code: string;
  prefix: string;
  currentNumber: string;
  year: string;
};

const emptyForm: SeriesForm = {
  code: "FACT-2026",
  prefix: "F2026-",
  currentNumber: "0",
  year: "2026",
};

export function SeriesPage({ token, notify }: Props) {
  const [series, setSeries] = useState<InvoiceSeries[]>([]);
  const [form, setForm] = useState<SeriesForm>(emptyForm);

  async function loadSeries() {
    const data = await apiRequest<{ invoiceSeries: InvoiceSeries[] }>(
      "/api/invoice-series?includeInactive=true",
      token
    );

    setSeries(data.invoiceSeries);
  }

  useEffect(() => {
    loadSeries().catch((error) =>
      notify(error instanceof Error ? error.message : "Error cargando series")
    );
  }, []);

  function update(field: keyof SeriesForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function createSeries() {
    try {
      if (!form.code.trim() || !form.prefix.trim()) {
        notify("Introduce código y prefijo");
        return;
      }

      await apiRequest(
        "/api/invoice-series",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            code: form.code,
            prefix: form.prefix,
            currentNumber: Number(form.currentNumber),
            year: Number(form.year),
          }),
        }
      );

      notify("Serie creada correctamente");
      await loadSeries();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Error creando serie");
    }
  }

  return (
    <section className="page-grid">
      <article className="card">
        <h2>Nueva serie</h2>
        <p className="muted">Crea series para numeración de facturas.</p>

        <div className="form-grid">
          <label>
            Código
            <input
              value={form.code}
              onChange={(e) => update("code", e.target.value)}
            />
          </label>

          <label>
            Prefijo
            <input
              value={form.prefix}
              onChange={(e) => update("prefix", e.target.value)}
            />
          </label>

          <label>
            Número actual
            <input
              value={form.currentNumber}
              onChange={(e) => update("currentNumber", e.target.value)}
            />
          </label>

          <label>
            Año
            <input
              value={form.year}
              onChange={(e) => update("year", e.target.value)}
            />
          </label>
        </div>

        <div className="actions-right">
          <button onClick={createSeries}>Crear serie</button>
        </div>
      </article>

      <article className="card">
        <h2>Series de facturación</h2>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Código</th>
              <th>Prefijo</th>
              <th>Número actual</th>
              <th>Año</th>
              <th>Activo</th>
            </tr>
          </thead>

          <tbody>
            {series.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.code}</td>
                <td>{item.prefix}</td>
                <td>{item.currentNumber}</td>
                <td>{item.year ?? "-"}</td>
                <td>{item.active ? "Sí" : "No"}</td>
              </tr>
            ))}

            {series.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No hay series.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </section>
  );
}