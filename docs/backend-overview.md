# Backend overview — BenxCore

## 1. Descripción general

BenxCore es un backend modular para la gestión empresarial básica, orientado a cubrir funcionalidades propias de un ERP ligero: autenticación, gestión de empresa, clientes, productos/servicios, facturación, pagos, contabilidad automática y generación documental en PDF.

El sistema está diseñado con una arquitectura por módulos, separando la capa HTTP, la validación de datos, la lógica de negocio y la persistencia.

---

## 2. Stack tecnológico

El backend utiliza:

* Node.js
* Express
* TypeScript
* Prisma ORM
* PostgreSQL
* Zod
* JWT
* bcrypt
* PDFKit
* Docker / Docker Compose para base de datos

---

## 3. Arquitectura por capas

La estructura seguida en los módulos principales es:

```txt
routes      → capa HTTP
schemas     → validación y normalización de datos
services    → lógica de negocio
Prisma      → acceso a base de datos
PostgreSQL  → persistencia
```

Ejemplo de módulo:

```txt
src/modules/clients/
├── clients.routes.ts
├── clients.schemas.ts
└── clients.service.ts
```

Esta separación permite que la lógica de negocio no dependa directamente de Express y pueda reutilizarse en otros contextos futuros, como importaciones CSV, tareas programadas o integraciones externas.

---

## 4. Módulos implementados

### 4.1. Autenticación

Permite registrar una empresa con su usuario administrador, iniciar sesión y obtener información del usuario autenticado.

Incluye:

* Registro de empresa y usuario administrador.
* Login con email y contraseña.
* Hash de contraseña mediante bcrypt.
* Generación de JWT.
* Middleware de autenticación.
* Endpoint `/me`.

---

### 4.2. Empresa

Permite gestionar los datos principales de la empresa autenticada.

Incluye:

* Nombre fiscal.
* NIF.
* Email.
* Teléfono.
* Dirección.

Estos datos se usan posteriormente en la emisión de facturas para guardar una copia fiscal congelada.

---

### 4.3. Clientes

Permite gestionar clientes de la empresa.

Incluye:

* Razón social.
* Nombre comercial.
* Tipo de cliente.
* Identificador fiscal.
* Email general.
* Email de facturación.
* Teléfono.
* Persona de contacto.
* Dirección.
* Condiciones de pago.
* Notas.
* Estado activo/inactivo.

Reglas principales:

* Cada cliente pertenece a una empresa.
* Se controla duplicidad de identificador fiscal por empresa.
* Se aplica soft delete mediante `active = false`.
* Se auditan operaciones relevantes.

---

### 4.4. Productos y servicios

Permite gestionar productos o servicios facturables.

Incluye:

* Código interno.
* Nombre.
* Descripción.
* Tipo: producto o servicio.
* Unidad.
* Precio.
* Coste interno.
* IVA por defecto.
* Cuenta contable de ingresos opcional.
* Estado activo/inactivo.

Reglas principales:

* Código único por empresa.
* Soporte para productos físicos y servicios.
* Soft delete.
* Auditoría.
* Preparado para facturación y contabilidad.

---

### 4.5. Series de facturación

Permite gestionar series para numeración correlativa de facturas.

Incluye:

* Código de serie.
* Prefijo.
* Número actual.
* Año.
* Estado activo/inactivo.

Ejemplo:

```txt
Serie: FACT-2026
Prefijo: F2026-
Número actual: 0

Primera factura emitida:
F2026-000001
```

---

### 4.6. Facturación

Permite crear, editar, emitir y consultar facturas.

Estados principales:

```txt
DRAFT → ISSUED → PARTIALLY_PAID → PAID
```

También existe estado:

```txt
CANCELLED
```

Reglas principales:

* Una factura nace como borrador.
* Los borradores son editables.
* Una factura emitida queda bloqueada.
* La emisión asigna número correlativo.
* La emisión guarda snapshot fiscal de empresa y cliente.
* La emisión genera asiento contable automático.
* Las facturas no se eliminan físicamente.

---

### 4.7. Pagos

Permite registrar pagos sobre facturas emitidas.

Reglas principales:

* No se pueden pagar facturas en borrador.
* No se pueden pagar facturas canceladas.
* No se pueden pagar facturas ya pagadas.
* No se puede pagar más del importe pendiente.
* Un pago parcial cambia la factura a `PARTIALLY_PAID`.
* Un pago final cambia la factura a `PAID`.
* Cada pago genera asiento contable automático.

---

### 4.8. Contabilidad automática

El sistema genera asientos contables automáticamente al emitir facturas y registrar pagos.

Al emitir factura:

```txt
Debe:
430 Clientes

Haber:
700 / 705 Ingresos
477 IVA repercutido
```

Al registrar pago:

```txt
Debe:
572 Bancos

Haber:
430 Clientes
```

También existen endpoints para consultar cuentas y asientos contables.

---

### 4.9. PDFs

El sistema genera dos tipos de documentos:

* PDF de factura.
* PDF de comprobante de pago.

El PDF de factura no incluye historial de pagos. La factura se mantiene como documento comercial/fiscal estable.

El comprobante de pago documenta un pago concreto asociado a una factura.

Ambos PDFs incluyen el logo de la empresa si existe un archivo `company-logo.png/jpg/jpeg` en la carpeta `assets/` del backend (`utils/pdf-logo.ts`). Si no hay logo, el PDF se genera igualmente sin él. El estilo (fuentes y tamaños) está centralizado en `utils/pdf-style.ts` para que ambos documentos tengan un aspecto consistente.

---

### 4.10. Usuarios y roles

Permite que el usuario `ADMIN` de una empresa gestione el resto de usuarios de su organización.

Incluye:

* Roles: `ADMIN`, `ACCOUNTANT`, `USER` (más `MANAGER` y `VIEWER` reservados en el modelo de datos para una futura gestión de permisos más fina).
* Listado, alta, edición y baja (soft delete) de usuarios.
* Restricción: solo un `ADMIN` puede gestionar usuarios.
* Garantía de que siempre queda al menos un `ADMIN` activo por empresa.
* Email único a nivel global de la aplicación.
* Auditoría de creación, edición y baja de usuarios.

Detalle completo en `usuarios.md`.

---

## 5. Seguridad

El backend protege las rutas privadas mediante JWT.

Cada petición autenticada contiene:

```txt
userId
companyId
role
```

La mayoría de consultas filtran por `companyId`, evitando acceso cruzado entre empresas.

La gestión de usuarios (`/api/users`) añade una segunda comprobación: además de estar autenticado, el usuario debe tener `role = "ADMIN"`. El resto de módulos (clientes, productos, facturas, contabilidad...) no diferencian todavía por rol: cualquier usuario autenticado de la empresa puede usarlos.

Las excepciones y errores no controlados se centralizan en un middleware global (`middleware/error.middleware.ts`): los errores de negocio (`AppError`) se devuelven con su código HTTP y mensaje, y cualquier otro error se registra en consola y responde como `500` genérico.

---

## 6. Auditoría

Las operaciones relevantes generan registros en `AuditLog`.

Ejemplos:

* Creación de cliente.
* Actualización de cliente.
* Creación de producto.
* Emisión de factura.
* Registro de pago.
* Creación de asiento contable indirectamente ligada a factura o pago.
* Alta, edición o baja de usuarios.

La auditoría permite reconstruir cambios importantes del sistema.

---

## 7. Decisiones de diseño destacables

### Separación de factura y pago

La factura representa el documento comercial/fiscal.

El pago representa un evento financiero.

El comprobante de pago representa el justificante documental del cobro.

---

### Snapshot fiscal

Al emitir una factura, se copian los datos fiscales del emisor y cliente dentro de la propia factura.

Esto evita que cambios posteriores en empresa o cliente modifiquen facturas históricas.

---

### Soft delete

Clientes, productos y series no se eliminan físicamente.

Se desactivan mediante `active = false`, conservando histórico y relaciones.

---

### Service layer

La lógica de negocio se concentra en servicios, no en rutas Express.

Esto mejora mantenibilidad, testabilidad y claridad arquitectónica.

---

## 8. Estado actual

El backend ya implementa un flujo completo básico:

```txt
Registro/login
    ↓
Configuración de empresa
    ↓
Creación de clientes
    ↓
Creación de productos/servicios
    ↓
Creación de serie de facturación
    ↓
Creación de factura en borrador
    ↓
Emisión de factura
    ↓
Generación de asiento contable
    ↓
Generación de PDF de factura
    ↓
Registro de pago
    ↓
Generación de asiento contable de cobro
    ↓
Generación de comprobante de pago
```

---

## 9. Limitaciones actuales

La versión actual ya cuenta con un frontend funcional (ver `frontend.md`), gestión de usuarios por empresa (`usuarios.md`), manejo global de errores y un primer conjunto de tests automáticos (`backend/tests/`) sobre los flujos de facturación y gestión de usuarios.

Todavía no incluye:

* Roles `MANAGER`/`VIEWER` con permisos diferenciados (existen en el modelo, pero sin lógica asociada).
* Facturas rectificativas (el modelo ya tiene `CORRECTIVE` y `rectifiesInvoiceId`, pero falta el flujo).
* Asientos manuales (`source = MANUAL`).
* Validación formal de que cada asiento esté cuadrado antes de guardarlo.
* Control automático de facturas vencidas (`OVERDUE`).
* Libro diario y libro mayor.
* Factura electrónica.
* Envío de emails.
* Firma digital.
* QR de verificación.
* Inventario.
* Proveedores y compras.

---

## 10. Conclusión

El backend de BenxCore constituye una base sólida para un ERP ligero orientado a facturación y contabilidad básica.

La implementación actual prioriza modularidad, trazabilidad, reglas de negocio realistas y separación de responsabilidades, lo que permite justificar técnicamente el proyecto como una plataforma escalable y extensible.
