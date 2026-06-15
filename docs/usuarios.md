# Gestión de usuarios y roles

## Por qué existe este módulo

Al principio, cada empresa registrada en BenxCore tenía un único usuario: el `ADMIN` creado durante el registro. Eso es suficiente para probar el sistema, pero no para una empresa real, donde normalmente hay más de una persona usando la herramienta (el gestor, el contable, alguien que solo necesita consultar facturas...).

Este módulo añade esa capa: permite que el usuario `ADMIN` de una empresa cree, edite y desactive otros usuarios dentro de su propia empresa, asignándoles un rol.

## Roles

El modelo de Prisma define cinco roles posibles:

```
ADMIN
ACCOUNTANT
MANAGER
VIEWER
USER
```

De estos, hoy en día la API solo permite **crear o asignar** `ADMIN`, `ACCOUNTANT` o `USER` (es lo que valida `userRoleSchema` en `users.schemas.ts`). `MANAGER` y `VIEWER` están reservados para cuando se implemente un control de permisos más granular por pantalla/acción; de momento no tienen ningún comportamiento especial aunque existan en la base de datos. `USER` es el rol heredado de antes de que existiera este módulo, y se mantiene para no romper usuarios ya creados.

En la práctica, el rol que más se usa además de `ADMIN` es `ACCOUNTANT`, pensado para alguien que gestiona clientes, facturas y cobros pero no la configuración de usuarios de la empresa.

### Qué puede hacer cada rol hoy

- **ADMIN**: todo. Es el único rol que puede acceder a `/api/users` (listar, crear, editar, desactivar usuarios). En el frontend es también el único que ve la pantalla "Usuarios" en el menú.
- **ACCOUNTANT / USER**: pueden usar el resto de la aplicación (clientes, productos, series, facturas, pagos, PDFs, contabilidad) igual que un `ADMIN`, porque esas rutas solo comprueban que el usuario esté autenticado y pertenezca a la empresa — todavía no filtran por rol.

Dicho de otra forma: el control de roles está implementado de forma estricta solo para la gestión de usuarios. El resto de módulos son multiusuario pero no tienen permisos diferenciados por rol todavía. Es una limitación conocida y queda anotada como trabajo futuro.

## Reglas de negocio

### Solo un ADMIN puede gestionar usuarios

Todos los endpoints de `/api/users` empiezan comprobando, vía `assertAdmin()`, que quien hace la petición es un usuario `ADMIN` activo de esa empresa. Si no lo es, la API responde `403`.

### Siempre tiene que quedar al menos un ADMIN activo

Antes de:

- cambiar el rol de un `ADMIN` a otro rol, o
- desactivar (`active = false`) a un `ADMIN`,

el sistema cuenta cuántos `ADMIN` activos quedarían en la empresa. Si la operación dejaría la empresa sin ningún `ADMIN` activo, se rechaza con `409 Conflict` ("Cannot remove or deactivate the last active ADMIN user"). Esto evita que una empresa se quede sin nadie que pueda gestionar usuarios.

### El email es único en toda la aplicación

`email` es único a nivel global en la tabla `User`, no solo dentro de la empresa. Si se intenta crear un usuario con un email ya existente (en cualquier empresa), la API devuelve `409`.

### Las contraseñas nunca salen de la API

`sanitizeUser()` se asegura de que las respuestas nunca incluyan `passwordHash`. Solo se devuelven `id`, `name`, `email`, `role`, `active`, `companyId`, `createdAt` y `updatedAt`.

### Auditoría

Crear, actualizar y desactivar usuarios genera entradas en `AuditLog` (acciones `CREATE`, `UPDATE`, `DELETE`), igual que el resto de entidades principales. En el caso de `UPDATE` y `DELETE` se guarda tanto el valor anterior como el nuevo.

### Soft delete

`DELETE /api/users/:id` no borra el usuario, lo desactiva (`active = false`). Si el usuario ya estaba desactivado, la operación no hace nada y simplemente devuelve el usuario tal cual.

## Endpoints

Todos requieren `Authorization: Bearer <token>` y que el usuario autenticado sea `ADMIN` de la empresa.

### `GET /api/users`

Lista los usuarios de la empresa, ordenados primero por activos y luego por nombre.

Query opcional:

```
?includeInactive=true
```

### `GET /api/users/:id`

Devuelve un usuario concreto de la empresa.

### `POST /api/users`

Crea un nuevo usuario para la empresa autenticada.

```json
{
  "name": "Ana Contable",
  "email": "ana@demo.com",
  "password": "12345678",
  "role": "ACCOUNTANT"
}
```

Si no se indica `role`, por defecto es `USER`.

### `PUT /api/users/:id`

Actualiza un usuario existente. Todos los campos son opcionales y solo se modifican los que se envían.

```json
{
  "name": "Ana Contable García",
  "role": "ADMIN",
  "active": true
}
```

Si se envía `password`, se vuelve a hashear con bcrypt. Si se envía `email`, se comprueba que no esté en uso por otro usuario.

### `DELETE /api/users/:id`

Desactiva el usuario (soft delete). Devuelve el usuario actualizado.

## Frontend

La pantalla "Usuarios" (`UsersPage.tsx`) solo aparece en el menú lateral cuando el usuario autenticado tiene `role === "ADMIN"`. Si un usuario sin permisos intentara acceder a esa vista igualmente, la propia API rechazaría las peticiones con `403`, así que el filtrado en el frontend es solo una cuestión de experiencia de usuario, no la barrera de seguridad real (esa está en el backend).

Desde esta pantalla se puede:

- Ver el listado de usuarios de la empresa (incluyendo los desactivados).
- Crear un usuario nuevo con nombre, email, contraseña inicial y rol.
- Editar nombre, email, rol y estado (`active`) de un usuario existente.
- Desactivar un usuario.

## Mejoras futuras

- Implementar permisos reales para `MANAGER` y `VIEWER` (por ejemplo, que `VIEWER` solo pueda leer y `MANAGER` no pueda tocar la configuración de empresa ni usuarios).
- Aplicar restricciones por rol también en el resto de módulos (clientes, facturas, contabilidad...), no solo en la gestión de usuarios.
- Permitir que un usuario cambie su propia contraseña sin pasar por `ADMIN`.
- Invitaciones por email en lugar de crear el usuario con una contraseña provisional.
