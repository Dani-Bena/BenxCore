# API endpoints — BenxCore

## 1. Base

### `GET /`

Comprueba que el backend responde.

### `GET /health`

Endpoint de salud del servidor.

---

## 2. Autenticación

### `POST /api/auth/register`

Registra una empresa y crea el primer usuario administrador.

Body:

```json
{
  "companyName": "BenxCore Demo Company",
  "name": "Daniel",
  "email": "daniel@test.com",
  "password": "12345678"
}
```

Respuesta:

```json
{
  "token": "...",
  "user": {
    "id": 1,
    "name": "Daniel",
    "email": "daniel@test.com",
    "role": "ADMIN",
    "companyId": 1
  }
}
```

---

### `POST /api/auth/login`

Inicia sesión.

Body:

```json
{
  "email": "daniel@test.com",
  "password": "12345678"
}
```

Respuesta:

```json
{
  "token": "...",
  "user": {
    "id": 1,
    "name": "Daniel",
    "email": "daniel@test.com",
    "role": "ADMIN",
    "companyId": 1
  }
}
```

---

### `GET /api/auth/me`

Devuelve el usuario autenticado y su empresa.

Requiere:

```txt
Authorization: Bearer <token>
```

---

## 3. Empresa

### `GET /api/company`

Devuelve la empresa asociada al usuario autenticado.

---

### `PUT /api/company`

Actualiza datos de empresa.

Body:

```json
{
  "name": "BenxCore Demo Company",
  "nif": "B12345678",
  "email": "info@benxcore.com",
  "phone": "600123456",
  "address": "Calle Demo 1, Madrid"
}
```

---

## 4. Clientes

### `GET /api/clients`

Lista clientes activos.

Query opcional:

```txt
?includeInactive=true
```

---

### `GET /api/clients/:id`

Obtiene un cliente concreto.

---

### `POST /api/clients`

Crea un cliente.

Body:

```json
{
  "legalName": "Cliente Profesional S.L.",
  "tradeName": "Cliente Pro",
  "type": "COMPANY",
  "taxId": "B87654321",
  "taxIdType": "CIF",
  "email": "cliente@demo.com",
  "invoicingEmail": "facturas@demo.com",
  "phone": "611222333",
  "contactName": "Juan Pérez",
  "address": "Calle Cliente 10",
  "city": "Madrid",
  "province": "Madrid",
  "postalCode": "28001",
  "countryCode": "ES",
  "paymentTermsDays": 30,
  "notes": "Cliente de prueba"
}
```

---

### `PUT /api/clients/:id`

Actualiza un cliente.

Solo modifica los campos enviados.

---

### `DELETE /api/clients/:id`

Desactiva un cliente mediante soft delete.

No elimina físicamente el registro.

---

## 5. Productos y servicios

### `GET /api/products`

Lista productos/servicios activos.

Query opcional:

```txt
?includeInactive=true
?type=PRODUCT
?type=SERVICE
```

---

### `GET /api/products/:id`

Obtiene un producto o servicio concreto.

---

### `POST /api/products`

Crea un producto o servicio.

Body:

```json
{
  "code": "WEB-001",
  "name": "Desarrollo web corporativo",
  "description": "Servicio de diseño y desarrollo web",
  "type": "SERVICE",
  "unit": "project",
  "price": "1200",
  "costPrice": "300",
  "taxRate": "21"
}
```

---

### `PUT /api/products/:id`

Actualiza producto o servicio.

---

### `DELETE /api/products/:id`

Desactiva producto o servicio.

---

## 6. Series de facturación

### `GET /api/invoice-series`

Lista series activas.

Query opcional:

```txt
?includeInactive=true
```

---

### `GET /api/invoice-series/:id`

Obtiene una serie concreta.

---

### `POST /api/invoice-series`

Crea una serie de facturación.

Body:

```json
{
  "code": "FACT-2026",
  "prefix": "F2026-",
  "currentNumber": 0,
  "year": 2026
}
```

---

### `PUT /api/invoice-series/:id`

Actualiza una serie.

---

### `DELETE /api/invoice-series/:id`

Desactiva una serie.

---

## 7. Facturas

### `GET /api/invoices`

Lista facturas de la empresa autenticada.

---

### `GET /api/invoices/:id`

Obtiene el detalle completo de una factura.

Incluye:

* Cliente.
* Serie.
* Líneas.
* Resumen de impuestos.
* Pagos.
* Asientos contables, si están incluidos en el servicio.

---

### `POST /api/invoices`

Crea una factura en borrador.

Body:

```json
{
  "clientId": 2,
  "invoiceSeriesId": 1,
  "type": "STANDARD",
  "dueDate": "2026-07-03",
  "notes": "Factura de prueba en borrador",
  "lines": [
    {
      "productId": 1,
      "description": "Desarrollo web corporativo",
      "unit": "project",
      "quantity": "1",
      "unitPrice": "1200",
      "discountRate": "10",
      "taxRate": "21"
    }
  ]
}
```

Resultado esperado:

```txt
status = DRAFT
subtotal = 1080.00
taxTotal = 226.80
total = 1306.80
amountPaid = 0.00
amountDue = 1306.80
```

---

### `PUT /api/invoices/:id`

Actualiza una factura solo si está en estado `DRAFT`.

No permite modificar facturas emitidas, parcialmente pagadas o pagadas.

---

### `DELETE /api/invoices/:id`

Cancela una factura en borrador.

No elimina físicamente la factura.

---

### `POST /api/invoices/:id/issue`

Emite oficialmente una factura.

Reglas:

* La factura debe estar en `DRAFT`.
* Debe tener serie.
* Debe tener cliente activo.
* Debe tener líneas.
* Empresa y cliente deben tener datos fiscales suficientes.

Efectos:

* Asigna número correlativo.
* Cambia estado a `ISSUED`.
* Guarda fecha de emisión.
* Copia snapshot fiscal.
* Genera asiento contable de emisión.
* Audita la operación.

---

### `GET /api/invoices/:id/pdf`

Genera el PDF oficial de factura.

Reglas:

* No permite facturas `DRAFT`.
* No permite facturas `CANCELLED`.
* Requiere `invoiceNumber` e `issueDate`.
* Usa datos fiscales congelados.

Respuesta:

```txt
Content-Type: application/pdf
Content-Disposition: inline; filename="F2026-000001.pdf"
```

---

## 8. Pagos

### `GET /api/invoices/:id/payments`

Lista pagos asociados a una factura.

---

### `POST /api/invoices/:id/payments`

Registra un pago.

Body:

```json
{
  "amount": "500",
  "method": "BANK_TRANSFER",
  "reference": "TRANSFER-001",
  "notes": "Primer pago parcial"
}
```

Reglas:

* No se pueden pagar facturas `DRAFT`.
* No se pueden pagar facturas `CANCELLED`.
* No se pueden pagar facturas `PAID`.
* No se puede pagar más del importe pendiente.

Efectos:

* Crea `Payment`.
* Actualiza `amountPaid`.
* Actualiza `amountDue`.
* Cambia estado a `PARTIALLY_PAID` o `PAID`.
* Genera asiento contable de cobro.
* Audita la operación.

---

### `GET /api/invoices/:id/payments/:paymentId/receipt`

Genera PDF de comprobante de pago.

Respuesta:

```txt
Content-Type: application/pdf
Content-Disposition: inline; filename="REC-3-F2026-000002.pdf"
```

---

## 9. Contabilidad

### `GET /api/accounting/accounts`

Lista cuentas contables activas.

Query opcional:

```txt
?includeInactive=true
```

---

### `GET /api/accounting/journal-entries`

Lista asientos contables.

Filtros opcionales:

```txt
?source=INVOICE
?source=PAYMENT
?source=MANUAL
?dateFrom=2026-06-01
?dateTo=2026-06-30
```

---

### `GET /api/accounting/journal-entries/:id`

Obtiene un asiento concreto con sus líneas y cuentas asociadas.

---

## 10. Usuarios

Gestión de usuarios de la empresa autenticada. Todos los endpoints requieren que el usuario que hace la petición tenga rol `ADMIN` (ver `usuarios.md` para el detalle de roles y reglas).

### `GET /api/users`

Lista los usuarios de la empresa.

Query opcional:

```txt
?includeInactive=true
```

---

### `GET /api/users/:id`

Obtiene un usuario concreto de la empresa.

---

### `POST /api/users`

Crea un usuario nuevo dentro de la empresa autenticada.

Body:

```json
{
  "name": "Ana Contable",
  "email": "ana@demo.com",
  "password": "12345678",
  "role": "ACCOUNTANT"
}
```

`role` es opcional (`ADMIN`, `ACCOUNTANT` o `USER`); por defecto es `USER`.

---

### `PUT /api/users/:id`

Actualiza un usuario. Solo modifica los campos enviados (`name`, `email`, `password`, `role`, `active`).

Reglas:

* No se puede quitar el rol `ADMIN` ni desactivar al último `ADMIN` activo de la empresa (`409`).
* Si se cambia el `email`, debe ser único en toda la aplicación.

---

### `DELETE /api/users/:id`

Desactiva un usuario (soft delete). No elimina físicamente el registro.

---

## 11. Autorización

Todos los endpoints privados requieren:

```txt
Authorization: Bearer <token>
```

El backend filtra los recursos por `companyId`.

Esto aplica a:

* Clientes.
* Productos.
* Series.
* Facturas.
* Pagos.
* Asientos contables.
* PDFs.
* Usuarios.

Además, las rutas de `/api/users` comprueban que el usuario autenticado tenga rol `ADMIN`.

---

## 12. Estados principales

### Factura

```txt
DRAFT
ISSUED
PARTIALLY_PAID
PAID
OVERDUE
CANCELLED
```

### Producto

```txt
PRODUCT
SERVICE
```

### Fuente de asiento

```txt
INVOICE
PAYMENT
MANUAL
```

### Rol de usuario

```txt
ADMIN
ACCOUNTANT
USER
```

---

## 13. Flujo completo de ejemplo

```txt
POST /api/auth/login
PUT /api/company
POST /api/clients
POST /api/products
POST /api/invoice-series
POST /api/invoices
POST /api/invoices/:id/issue
GET  /api/invoices/:id/pdf
POST /api/invoices/:id/payments
GET  /api/invoices/:id/payments/:paymentId/receipt
GET  /api/accounting/journal-entries
```
