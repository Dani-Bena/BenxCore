import { useEffect, useState } from "react";
import { apiRequest, money } from "../api";
import type { Product } from "../types";

type Props = {
  token: string;
  notify: (message: string) => void;
};

type ProductForm = {
  code: string;
  name: string;
  description: string;
  type: "PRODUCT" | "SERVICE";
  unit: string;
  price: string;
  costPrice: string;
  taxRate: string;
};

const emptyForm: ProductForm = {
  code: "",
  name: "",
  description: "",
  type: "SERVICE",
  unit: "unit",
  price: "100",
  costPrice: "",
  taxRate: "21",
};

export function ProductsPage({ token, notify }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  async function loadProducts() {
    const data = await apiRequest<{ products: Product[] }>(
      "/api/products?includeInactive=true",
      token
    );

    setProducts(data.products);
  }

  useEffect(() => {
    loadProducts().catch((error) =>
      notify(error instanceof Error ? error.message : "Error cargando productos")
    );
  }, []);

  function update(field: keyof ProductForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function createProduct() {
    try {
      if (!form.name.trim()) {
        notify("Introduce el nombre del producto o servicio");
        return;
      }

      await apiRequest(
        "/api/products",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            code: form.code || null,
            name: form.name,
            description: form.description || null,
            type: form.type,
            unit: form.unit,
            price: form.price,
            costPrice: form.costPrice || null,
            taxRate: form.taxRate,
            revenueAccountId: null,
          }),
        }
      );

      setForm(emptyForm);
      notify("Producto creado correctamente");
      await loadProducts();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Error creando producto");
    }
  }

  return (
    <section className="page-grid">
      <article className="card">
        <h2>Nuevo producto/servicio</h2>
        <p className="muted">Crea productos o servicios facturables.</p>

        <div className="form-grid">
          <label>
            Código
            <input
              value={form.code}
              onChange={(e) => update("code", e.target.value)}
            />
            <small className="field-hint">Opcional. Máximo 50 caracteres, único por empresa</small>
          </label>

          <label>
            Nombre
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
            <small className="field-hint">Obligatorio. Entre 2 y 150 caracteres</small>
          </label>

          <label>
            Tipo
            <select
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
            >
              <option value="SERVICE">Servicio</option>
              <option value="PRODUCT">Producto</option>
            </select>
          </label>

          <label>
            Unidad
            <input
              value={form.unit}
              onChange={(e) => update("unit", e.target.value)}
            />
            <small className="field-hint">Obligatorio. Máximo 30 caracteres</small>
          </label>

          <label>
            Precio
            <input
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
            />
            <small className="field-hint">Obligatorio. Número positivo o cero</small>
          </label>

          <label>
            IVA %
            <input
              value={form.taxRate}
              onChange={(e) => update("taxRate", e.target.value)}
            />
            <small className="field-hint">Entre 0 y 100</small>
          </label>

          <label className="wide">
            Descripción
            <input
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
            <small className="field-hint">Opcional. Máximo 1000 caracteres</small>
          </label>
        </div>

        <div className="actions-right">
          <button onClick={createProduct}>Crear producto</button>
        </div>
      </article>

      <article className="card">
        <h2>Productos y servicios</h2>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Código</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Precio</th>
              <th>IVA</th>
              <th>Activo</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.id}</td>
                <td>{product.code ?? "-"}</td>
                <td>{product.name}</td>
                <td>{product.type}</td>
                <td>{money(product.price)}</td>
                <td>{Number(product.taxRate).toFixed(2)}%</td>
                <td>{product.active ? "Sí" : "No"}</td>
              </tr>
            ))}

            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  No hay productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </section>
  );
}