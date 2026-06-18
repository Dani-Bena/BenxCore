import { useState } from "react";
import "./App.css";
import logo from "./assets/logo.png";
import { ClientsPage } from "./pages/ClientsPage";
import { CompanyPage } from "./pages/CompanyPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { LoginPage } from "./pages/LoginPage";
import { ProductsPage } from "./pages/ProductsPage";
import { SeriesPage } from "./pages/SeriesPage";
import { UsersPage } from "./pages/UsersPage";
import type { InvoiceStatusFilter, User } from "./types";

type Page =
  | "dashboard"
  | "clients"
  | "products"
  | "series"
  | "invoices"
  | "users"
  | "company";

function loadStoredUser(): User | null {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") ?? "");
  const [user, setUser] = useState<User | null>(loadStoredUser);
  const [page, setPage] = useState<Page>("dashboard");
  const [message, setMessage] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] =
    useState<InvoiceStatusFilter>(null);

  function goToInvoices(filter: InvoiceStatusFilter = null) {
    setInvoiceStatusFilter(filter);
    setPage("invoices");
  }

  function handleLogin(nextToken: string, nextUser: User) {
    localStorage.setItem("token", nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    setPage("dashboard");
    setMessage(`Sesión iniciada como ${nextUser.email}`);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
          <img className="brand-logo" src={logo} alt="BenxCore" />
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
            onClick={() => goToInvoices(null)}
          >
            Facturas
          </button>

          {user.role === "ADMIN" && (
            <>
              <button
                className={page === "users" ? "active" : ""}
                onClick={() => setPage("users")}
              >
                Usuarios
              </button>

              <button
                className={page === "company" ? "active" : ""}
                onClick={() => setPage("company")}
              >
                Empresa
              </button>
            </>
          )}
        </nav>

        {message && <div className="message">{message}</div>}

        <button className="logout-button" onClick={logout}>
          Cerrar sesión
        </button>
      </aside>

      <section className="content">
        {page === "dashboard" && (
          <DashboardPage
            token={token}
            notify={setMessage}
            onNavigateToInvoices={goToInvoices}
          />
        )}

        {page === "clients" && (
          <ClientsPage token={token} notify={setMessage} />
        )}

        {page === "products" && (
          <ProductsPage token={token} notify={setMessage} />
        )}

        {page === "series" && (
          <SeriesPage token={token} notify={setMessage} />
        )}

        {page === "invoices" && (
          <InvoicesPage
            token={token}
            notify={setMessage}
            statusFilter={invoiceStatusFilter}
          />
        )}

        {page === "users" && user.role === "ADMIN" && (
          <UsersPage token={token} notify={setMessage} />
        )}

        {page === "company" && user.role === "ADMIN" && (
          <CompanyPage token={token} notify={setMessage} />
        )}

        {(page === "users" || page === "company") && user.role !== "ADMIN" && (
          <DashboardPage
            token={token}
            notify={setMessage}
            onNavigateToInvoices={goToInvoices}
          />
        )}
      </section>
    </main>
  );
}