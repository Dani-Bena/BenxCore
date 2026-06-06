import { useEffect, useState } from "react";
import { apiRequest } from "../api";

type Props = {
  token: string;
  notify: (message: string) => void;
};

type UserRole = "ADMIN" | "ACCOUNTANT" | "USER";

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  companyId: number;
  createdAt: string;
  updatedAt: string;
};

type UserForm = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

const emptyForm: UserForm = {
  name: "",
  email: "",
  password: "12345678",
  role: "ACCOUNTANT",
};

export function UsersPage({ token, notify }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  async function loadUsers() {
    const data = await apiRequest<{ users: UserRow[] }>(
      "/api/users?includeInactive=true",
      token
    );

    setUsers(data.users);
  }

  useEffect(() => {
    loadUsers().catch((error) =>
      notify(error instanceof Error ? error.message : "Error cargando usuarios")
    );
  }, []);

  function update(field: keyof UserForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingUserId(null);
  }

  function startEdit(user: UserRow) {
    setEditingUserId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
  }

  async function saveUser() {
    try {
      if (!form.name.trim()) {
        notify("Introduce el nombre del usuario");
        return;
      }

      if (!form.email.trim()) {
        notify("Introduce el email del usuario");
        return;
      }

      if (!editingUserId && !form.password.trim()) {
        notify("Introduce una contraseña inicial");
        return;
      }

      if (editingUserId) {
        const body: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          role: form.role,
        };

        if (form.password.trim()) {
          body.password = form.password;
        }

        await apiRequest(`/api/users/${editingUserId}`, token, {
          method: "PUT",
          body: JSON.stringify(body),
        });

        notify("Usuario actualizado correctamente");
      } else {
        await apiRequest("/api/users", token, {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
          }),
        });

        notify("Usuario creado correctamente");
      }

      resetForm();
      await loadUsers();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Error guardando usuario");
    }
  }

  async function deactivateUser(user: UserRow) {
    try {
      await apiRequest(`/api/users/${user.id}`, token, {
        method: "DELETE",
      });

      notify("Usuario desactivado correctamente");
      await loadUsers();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Error desactivando usuario"
      );
    }
  }

  async function activateUser(user: UserRow) {
    try {
      await apiRequest(`/api/users/${user.id}`, token, {
        method: "PUT",
        body: JSON.stringify({
          active: true,
        }),
      });

      notify("Usuario reactivado correctamente");
      await loadUsers();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Error activando usuario");
    }
  }

  return (
    <section className="page-grid">
      <article className="card">
        <div className="section-header">
          <div>
            <h2>{editingUserId ? "Editar usuario" : "Nuevo usuario"}</h2>
            <p className="muted">
              Gestiona usuarios de la empresa y sus permisos básicos.
            </p>
          </div>

          {editingUserId && <button onClick={resetForm}>Cancelar edición</button>}
        </div>

        <div className="form-grid">
          <label>
            Nombre
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Nombre del usuario"
            />
          </label>

          <label>
            Email
            <input
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="usuario@empresa.com"
            />
          </label>

          <label>
            Rol
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
            >
              <option value="ADMIN">Administrador</option>
              <option value="ACCOUNTANT">Contable</option>
              <option value="USER">Usuario</option>
            </select>
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder={
                editingUserId
                  ? "Dejar vacío para no cambiar"
                  : "Contraseña inicial"
              }
            />
          </label>
        </div>

        <div className="actions-right">
          <button onClick={saveUser}>
            {editingUserId ? "Guardar cambios" : "Crear usuario"}
          </button>
        </div>
      </article>

      <article className="card">
        <div className="section-header">
          <div>
            <h2>Usuarios</h2>
            <p className="muted">
              Solo los administradores pueden crear, editar o desactivar usuarios.
            </p>
          </div>

          <button onClick={loadUsers}>Refrescar</button>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`status ${user.role}`}>{user.role}</span>
                </td>
                <td>
                  <span className={user.active ? "ok" : "bad"}>
                    {user.active ? "ACTIVO" : "INACTIVO"}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button onClick={() => startEdit(user)}>Editar</button>

                    {user.active ? (
                      <button onClick={() => deactivateUser(user)}>
                        Desactivar
                      </button>
                    ) : (
                      <button onClick={() => activateUser(user)}>Reactivar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No hay usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </section>
  );
}