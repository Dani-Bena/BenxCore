# Diseño de base de datos

> Nota: este documento empezó como el diseño inicial (la versión con `User`, `Company`, `Client`, `Product` e `Invoice` a nivel muy básico). Se mantiene aquí actualizado a medida que el modelo en `schema.prisma` ha ido creciendo, para tener siempre una vista rápida de las entidades sin tener que abrir el esquema completo.

## Visión general

BenxCore es multiempresa: prácticamente todas las tablas cuelgan de `Company` mediante `companyId`, y casi todas las consultas del backend filtran por ese campo para que una empresa nunca pueda ver datos de otra.

Los módulos de facturación y contabilidad tienen su propia documentación más detallada en `facturacion.md` y `contabilidad.md`. Aquí me interesa más tener el mapa completo de tablas, tipos y relaciones de un vistazo.

## Empresa y usuarios

### Company

- `id`
- `name`
- `nif`
- `email`
- `phone`
- `address`
- `createdAt`, `updatedAt`

Es la entidad raíz. Todo lo demás (clientes, productos, facturas, series, cuentas contables, asientos, auditoría, usuarios) tiene una relación con `Company`.

### User

- `id`
- `name`
- `email` (único en toda la base, no solo por empresa)
- `passwordHash`
- `role`: `ADMIN | ACCOUNTANT | MANAGER | VIEWER | USER`
- `active`
- `companyId`
- `createdAt`, `updatedAt`

El registro inicial (`POST /api/auth/register`) crea la empresa y un primer usuario con rol `ADMIN`. A partir de ahí, los usuarios `ADMIN` pueden invertir en el módulo de usuarios para crear cuentas adicionales para su empresa (ver `usuarios.md`).

Sobre los roles: el enum de Prisma define cinco valores, pero a día de hoy la API solo permite crear/editar usuarios con `ADMIN`, `ACCOUNTANT` o `USER` (es lo que valida el esquema de Zod del módulo de usuarios). `MANAGER` y `VIEWER` están en el modelo pensando en una futura gestión de permisos más fina, pero todavía no tienen lógica asociada. `USER` es el rol "genérico" que se usaba antes de introducir roles específicos y se mantiene por compatibilidad con datos ya creados.

## Clientes

### Client

- `id`
- `legalName` (columna `name` en la base de datos, por temas de migración)
- `tradeName`
- `type`: `COMPANY | FREELANCER | INDIVIDUAL | PUBLIC_ENTITY | OTHER`
- `taxId` (columna `nif`)
- `taxIdType`: `NIF | CIF | NIE | VAT | PASSPORT | OTHER`
- `email`, `invoicingEmail`, `phone`, `contactName`
- `address`, `city`, `province`, `postalCode`, `countryCode` (por defecto `ES`)
- `paymentTermsDays`
- `notes`
- `active`
- `companyId`
- `createdAt`, `updatedAt`

El diseño inicial tenía un único campo `name` y `nif`. Se amplió bastante porque para emitir facturas reales hace falta más información fiscal (tipo de cliente, tipo de identificador fiscal, dirección completa, email de facturación distinto del email de contacto, condiciones de pago, etc.).

`active = false` implementa el soft delete: un cliente "eliminado" sigue existiendo en la base de datos (porque puede tener facturas asociadas) pero deja de aparecer en los listados por defecto.

Hay un índice compuesto `(companyId, taxId)` pensado para poder comprobar duplicados de identificador fiscal dentro de una misma empresa.

## Productos y servicios

### Product

- `id`
- `code` (único por empresa)
- `name`
- `description`
- `type`: `PRODUCT | SERVICE`
- `unit` (por defecto `"unit"`)
- `price`
- `costPrice`
- `taxRate` (por defecto `21`)
- `revenueAccountId` → referencia opcional a `AccountingAccount`
- `active`
- `companyId`
- `createdAt`, `updatedAt`

`revenueAccountId` es el enlace con contabilidad: si un producto tiene asignada una cuenta de ingresos específica, esa cuenta es la que se usa al generar el asiento contable de una factura que incluya ese producto. Si no se indica, el sistema usa por defecto la cuenta `700` (productos) o `705` (servicios) según el `type`.

## Facturación

Aquí solo dejo el resumen de tablas; el detalle de reglas de negocio, estados y cálculos está en `facturacion.md`.

### InvoiceSeries

- `id`, `code`, `prefix`, `currentNumber`, `year`, `active`, `companyId`

Controla la numeración correlativa de las facturas emitidas (`code` único por empresa).

### Invoice

- `id`, `type` (`STANDARD | CORRECTIVE | PROFORMA`), `status`
- `invoiceNumber`, `issueDate`, `dueDate`
- `subtotal`, `taxTotal`, `total`, `amountPaid`, `amountDue`
- `notes`
- Snapshot fiscal del emisor: `issuerName`, `issuerNif`, `issuerAddress`, `issuerEmail`, `issuerPhone`
- Snapshot fiscal del cliente: `customerName`, `customerNif`, `customerAddress`, `customerEmail`, `customerPhone`
- `companyId`, `clientId`, `invoiceSeriesId`
- `rectifiesInvoiceId` → autorrelación para facturas rectificativas (`CORRECTIVE`)

`(companyId, invoiceNumber)` es único, así que el número de factura nunca se repite dentro de una empresa.

El campo `rectifiesInvoiceId` ya existe en el modelo y el tipo `CORRECTIVE` también, pero el flujo de facturas rectificativas todavía no está implementado en los servicios; de momento solo se usa `STANDARD`.

### InvoiceLine

- `id`, `lineNumber` (único junto con `invoiceId`)
- `description`, `unit`
- `quantity`, `unitPrice`, `discountRate`, `discountAmount`
- `taxRate`, `subtotal`, `taxAmount`, `total`
- `invoiceId`, `productId` (opcional)

Cada línea guarda sus propios datos (descripción, precio, IVA...) aunque venga de un producto, precisamente para no depender de cómo esté el producto en el futuro.

### InvoiceTaxSummary

- `id`, `taxRate`, `taxBase`, `taxAmount`, `invoiceId`

Agrupa el total de base imponible y cuota por cada tipo de IVA distinto presente en la factura (`(invoiceId, taxRate)` único).

### Payment

- `id`, `amount`, `paymentDate`, `method` (`BANK_TRANSFER | CARD | CASH | DIRECT_DEBIT | OTHER`), `reference`, `notes`
- `invoiceId`

Cada pago pertenece a una factura. Un pago genera, además, su propio asiento contable (`JournalEntry` con `source = PAYMENT`).

## Contabilidad

Detalle completo en `contabilidad.md`. Resumen de tablas:

### AccountingAccount

- `id`, `code`, `name`, `type` (`ASSET | LIABILITY | EQUITY | INCOME | EXPENSE`), `active`, `companyId`

`(companyId, code)` único. Las cuentas básicas (`430`, `572`, `477`, `700`, `705`) se crean automáticamente la primera vez que hace falta generar un asiento.

### JournalEntry

- `id`, `entryNumber`, `entryDate`, `description`, `source` (`INVOICE | PAYMENT | MANUAL`), `companyId`, `invoiceId`, `paymentId`

### JournalLine

- `id`, `description`, `debit`, `credit`, `journalEntryId`, `accountId`

## Auditoría

### AuditLog

- `id`, `entityType`, `entityId`, `action` (`CREATE | UPDATE | DELETE | ISSUE | CANCEL | PAY`), `oldValue`, `newValue` (JSON), `createdAt`, `companyId`, `userId`

Se usa de forma transversal: cuando se crea/actualiza/desactiva un cliente, un producto, una factura, un usuario, etc., se guarda un registro con el estado anterior y el nuevo (cuando aplica). `entityId` y `companyId`/`userId` son opcionales porque algunas acciones del sistema podrían no estar ligadas a un usuario concreto.

## Tipos numéricos

Todos los importes (`price`, `costPrice`, `quantity`, `unitPrice`, `subtotal`, `total`, `debit`, `credit`, etc.) son `Decimal`, no `Float`. Es una decisión deliberada para evitar errores de redondeo en cálculos de IVA y totales, que en un sistema de facturación son justo el tipo de error que no se puede permitir.

## Migraciones

El historial de migraciones (`backend/prisma/migrations/`) refleja bastante bien cómo fue evolucionando el modelo:

1. `init` — esquema inicial.
2. `billing_accounting_foundation` — se añaden facturación y contabilidad.
3. `add_client_active_field` — soft delete en clientes.
4. `mejoria` (x2) — ajustes varios sobre clientes/productos/facturación.
5. `improve_invoice_line_model` — mejora del modelo de líneas de factura.
6. `add_user_management_roles` — se añaden los roles de usuario y el módulo de gestión de usuarios.

Para aplicar las migraciones en un entorno nuevo:

```bash
npx prisma migrate deploy
```

Y para entornos de desarrollo, tras cambiar el `schema.prisma`:

```bash
npx prisma migrate dev
```
