import { useState } from "react";
import { API_URL, getErrorMessage } from "../api";
import type { User } from "../types";

type Props = {
  onLogin: (token: string, user: User) => void;
};

export function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState("daniel@test.com");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState("");

  async function login() {
    try {
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
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand-large">
          <div className="brand-logo">B</div>
          <div>
            <h1>BenxCore</h1>
            <p>ERP MVP para facturación, cobros y contabilidad</p>
          </div>
        </div>

        <div className="form-stack">
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button onClick={login}>Iniciar sesión</button>

          {error && <p className="error">{error}</p>}
        </div>
      </section>
    </main>
  );
}