import { useState } from "react";
import "./App.css";
import { ClientsPage } from "./pages/ClientsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { LoginPage } from "./pages/LoginPage";
import { ProductsPage } from "./pages/ProductsPage";
import { SeriesPage } from "./pages/SeriesPage";
import type { User } from "./types";

type Page = "dashboard" | "clients" | "products" | "series" | "invoices";

export default function App() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>("dashboard");
  const [message, setMessage] = useState("");

  function handleLogin(nextToken: string, nextUser: User) {
    setToken(nextToken);
    setUser(nextUser);
    setPage("dashboard");
    setMessage(`Sesión iniciada como ${nextUser.email}`);
  }

  function logout() {
    setToken("");
    setUser(null);
    setPage("dashboard");
    setMessage("");
  }

  if (!token || !user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">B</div>
          <div>
            <h1>BenxCore</h1>
            <p>ERP MVP</p>
          </div>
        </div>

        <div className="user-box">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
          <span>{user.role}</span>
        </div>

        <nav className="nav">
          <button
            className={page === "dashboard" ? "active" : ""}
            onClick={() => setPage("dashboard")}
          >
            Dashboard
          </button>

          <button
            className={page === "clients" ? "active" : ""}
            onClick={() => setPage("clients")}
          >
            Clientes
          </button>

          <button
            className={page === "products" ? "active" : ""}
            onClick={() => setPage("products")}
          >
            Productos
          </button>

          <button
            className={page === "series" ? "active" : ""}
            onClick={() => setPage("series")}
          >
            Series
          </button>

          <button
            className={page === "invoices" ? "active" : ""}
            onClick={() => setPage("invoices")}
          >
            Facturas
          </button>
        </nav>

        {message && <div className="message">{message}</div>}

        <button className="logout-button" onClick={logout}>
          Cerrar sesión
        </button>
      </aside>

      <section className="content">
        {page === "dashboard" && (
          <DashboardPage token={token} notify={setMessage} />
        )}

        {page === "clients" && <ClientsPage token={token} notify={setMessage} />}

        {page === "products" && (
          <ProductsPage token={token} notify={setMessage} />
        )}

        {page === "series" && <SeriesPage token={token} notify={setMessage} />}

        {page === "invoices" && (
          <InvoicesPage token={token} notify={setMessage} />
        )}
      </section>
    </main>
  );
}