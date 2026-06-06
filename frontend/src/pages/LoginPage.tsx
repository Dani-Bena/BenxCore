import { useState } from "react";
import { API_URL, getErrorMessage } from "../api";
import type { User } from "../types";

type Props = {
  onLogin: (token: string, user: User) => void;
};

export function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState("daniel@test.com");
  const [password, setPassword] = useState("12345678");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = await response.json();
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-left">
        <div className="login-brand">
          <div className="login-logo">B</div>
          <div>
            <h1>BenxCore</h1>
            <p>ERP MVP</p>
          </div>
        </div>

        <div className="login-hero">
          <h2>Gestión empresarial simple y profesional.</h2>
          <p>
            Facturación, cobros, clientes, productos, series y contabilidad
            automática en una única plataforma.
          </p>
        </div>

        <div className="login-features">
          <span>Facturas PDF</span>
          <span>Comprobantes de pago</span>
          <span>Asientos cuadrados</span>
        </div>
      </section>

      <section className="login-right">
        <div className="login-card">
          <div className="login-card-header">
            <h2>Iniciar sesión</h2>
            <p>Accede al panel de administración de BenxCore.</p>
          </div>

          <div className="login-form">
            <label>
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="daniel@test.com"
              />
            </label>

            <label>
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </label>

            {error && <div className="login-error">{error}</div>}

            <button onClick={login} disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </div>

          <div className="login-demo">
            <strong>Usuario demo</strong>
            <span>daniel@test.com · 12345678</span>
          </div>
        </div>
      </section>
    </main>
  );
}