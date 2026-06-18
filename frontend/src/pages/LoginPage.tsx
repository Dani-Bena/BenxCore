import { useState } from "react";
import { API_URL, getErrorMessage } from "../api";
import logo from "../assets/logo.png";
import type { User } from "../types";

type Props = {
  onLogin: (token: string, user: User) => void;
};

function validateRegister(fields: {
  companyName: string;
  companyNif: string;
  companyAddress: string;
  name: string;
  email: string;
  password: string;
}): string | null {
  if (fields.companyName.trim().length < 2)
    return "El nombre de la empresa debe tener al menos 2 caracteres.";
  if (fields.companyNif.trim().length < 5)
    return "El NIF/CIF de la empresa debe tener al menos 5 caracteres.";
  if (fields.companyAddress.trim().length < 2)
    return "La dirección fiscal de la empresa es obligatoria.";
  if (fields.name.trim().length < 2)
    return "Tu nombre debe tener al menos 2 caracteres.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
    return "Introduce un email válido (ej. usuario@empresa.com).";
  if (fields.password.length < 8)
    return "La contraseña debe tener al menos 8 caracteres.";
  return null;
}

export function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("daniel@test.com");
  const [password, setPassword] = useState("12345678");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyNif, setCompanyNif] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError("");
    if (next === "register") {
      setEmail("");
      setPassword("");
    } else {
      setEmail("daniel@test.com");
      setPassword("12345678");
    }
  }

  async function login() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  async function register() {
    const validationError = validateRegister({ companyName, companyNif, companyAddress, name, email, password });
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, companyNif, companyAddress, name, email, password }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = await response.json();
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    if (mode === "login") {
      login();
    } else {
      register();
    }
  }

  return (
    <main className="login-page">
      <section className="login-left">
        <div className="login-brand">
          <img className="login-logo" src={logo} alt="BenxCore" />
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
            <h2>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h2>
            <p>
              {mode === "login"
                ? "Accede al panel de administración de BenxCore."
                : "Registra tu empresa y empieza a facturar."}
            </p>
          </div>

          <div className="login-form">
            {mode === "register" && (
              <>
                <label>
                  Nombre de la empresa
                  <input
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="Mi Empresa S.L."
                  />
                  <small className="field-hint">Mínimo 2 caracteres</small>
                </label>

                <label>
                  NIF/CIF de la empresa
                  <input
                    value={companyNif}
                    onChange={(event) => setCompanyNif(event.target.value)}
                    placeholder="B12345678"
                  />
                  <small className="field-hint">Obligatorio. Necesario para emitir facturas</small>
                </label>

                <label>
                  Dirección fiscal
                  <input
                    value={companyAddress}
                    onChange={(event) => setCompanyAddress(event.target.value)}
                    placeholder="Calle Ejemplo 1, Madrid"
                  />
                  <small className="field-hint">Obligatorio. Aparecerá en las facturas</small>
                </label>

                <label>
                  Tu nombre
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Daniel García"
                  />
                  <small className="field-hint">Mínimo 2 caracteres</small>
                </label>
              </>
            )}

            <label>
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="daniel@test.com"
              />
              {mode === "register" && (
                <small className="field-hint">Introduce un email válido (ej. usuario@empresa.com)</small>
              )}
            </label>

            <label>
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
              {mode === "register" && (
                <small className="field-hint">Mínimo 8 caracteres</small>
              )}
            </label>

            {error && <div className="login-error">{error}</div>}

            <button onClick={handleSubmit} disabled={loading}>
              {loading
                ? mode === "login"
                  ? "Entrando..."
                  : "Registrando..."
                : mode === "login"
                  ? "Entrar"
                  : "Crear cuenta"}
            </button>
          </div>

          <div className="login-toggle">
            {mode === "login" ? (
              <span>
                ¿No tienes cuenta?{" "}
                <button onClick={() => switchMode("register")}>
                  Crear empresa
                </button>
              </span>
            ) : (
              <span>
                ¿Ya tienes cuenta?{" "}
                <button onClick={() => switchMode("login")}>
                  Iniciar sesión
                </button>
              </span>
            )}
          </div>

          {mode === "login" && (
            <div className="login-demo">
              <strong>Usuario demo</strong>
              <span>daniel@test.com · 12345678</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}