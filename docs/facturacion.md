# Documentación del módulo de facturación — BenxCore

## 1. Objetivo del módulo

El módulo de facturación de BenxCore permite gestionar el ciclo de vida completo de una factura desde su creación como borrador hasta su emisión oficial y posterior registro de pagos.

El objetivo no es implementar un CRUD simple de facturas, sino un flujo de negocio controlado, trazable y preparado para escenarios reales de empresa.

La facturación se apoya en los siguientes módulos previos:

* Empresa: datos fiscales del emisor.
* Clientes: datos fiscales del destinatario.
* Productos/servicios: conceptos facturables.
* Series de facturación: numeración correlativa.
* Pagos: registro de cobros parciales o totales.
* Auditoría: registro de acciones relevantes.

---

## 2. Entidades principales

### Invoice

Representa la factura principal.

Campos importantes:

* `id`
* `type`
* `status`
* `invoiceNumber`
* `issueDate`
* `dueDate`
* `subtotal`
* `taxTotal`
* `total`
* `amountPaid`
* `amountDue`
* `notes`
* `companyId`
* `clientId`
* `invoiceSeriesId`

Además, cuando la factura se emite, guarda una copia de los datos fiscales del emisor y del cliente:

* `issuerName`
* `issuerNif`
* `issuerAddress`
* `issuerEmail`
* `issuerPhone`
* `customerName`
* `customerNif`
* `customerAddress`
* `customerEmail`
* `customerPhone`

Esto evita que una factura histórica cambie si más adelante se modifica la empresa o el cliente.

---

### InvoiceLine

Representa una línea de factura.

Campos principales:

* `lineNumber`
* `description`
* `unit`
* `quantity`
* `unitPrice`
* `discountRate`
* `discountAmount`
* `taxRate`
* `subtotal`
* `taxAmount`
* `total`
* `productId`

La línea puede estar vinculada a un producto o servicio, pero guarda sus propios datos para conservar el histórico.

---

### InvoiceTaxSummary

Agrupa los impuestos de la factura por tipo impositivo.

Ejemplo:

| IVA | Base imponible |    Cuota |
| --- | -------------: | -------: |
| 21% |      1080.00 € | 226.80 € |

Esto permite representar correctamente facturas con varios tipos de IVA.

---

### InvoiceSeries

Controla la numeración de facturas.

Ejemplo:

* `code`: `FACT-2026`
* `prefix`: `F2026-`
* `currentNumber`: `1`

Una factura emitida podría quedar como:

```txt
F2026-000001
```

---

### Payment

Representa un pago asociado a una factura.

Campos principales:

* `amount`
* `paymentDate`
* `method`
* `reference`
* `notes`
* `invoiceId`

Los pagos actualizan automáticamente los importes de la factura.

---

## 3. Estados de factura

La factura puede tener los siguientes estados:

| Estado           | Descripción                                                |
| ---------------- | ---------------------------------------------------------- |
| `DRAFT`          | Borrador editable. Todavía no tiene número oficial.        |
| `ISSUED`         | Factura emitida. Tiene número oficial y queda bloqueada.   |
| `PARTIALLY_PAID` | Factura emitida con pagos parciales.                       |
| `PAID`           | Factura completamente pagada.                              |
| `OVERDUE`        | Factura vencida. Pendiente de implementar automáticamente. |
| `CANCELLED`      | Factura cancelada. No se elimina físicamente.              |

---

## 4. Ciclo de vida de una factura

### 4.1. Creación del borrador

Una factura se crea inicialmente como `DRAFT`.

En este estado:

* No tiene número oficial.
* No tiene fecha de emisión.
* Puede editarse.
* Puede modificarse el cliente.
* Pueden modificarse las líneas.
* Se recalculan importes automáticamente.

---

### 4.2. Emisión de factura

Al emitir una factura:

* Debe estar en estado `DRAFT`.
* Debe ser de tipo `STANDARD`.
* Debe tener una serie activa.
* Debe tener un cliente activo.
* Debe tener al menos una línea.
* La empresa debe tener datos fiscales completos.
* El cliente debe tener datos fiscales completos.

Durante la emisión:

1. Se incrementa el contador de la serie.
2. Se genera el número de factura.
3. Se asigna fecha de emisión.
4. Se copian los datos fiscales de empresa y cliente.
5. La factura pasa a estado `ISSUED`.
6. Se registra la acción en auditoría.

---

### 4.3. Registro de pagos

Una factura emitida puede recibir pagos.

Reglas:

* No se pueden pagar facturas `DRAFT`.
* No se pueden pagar facturas `CANCELLED`.
* No se pueden pagar facturas ya `PAID`.
* No se permite pagar más del importe pendiente.
* Cada pago se guarda como entidad `Payment`.
* La factura actualiza `amountPaid` y `amountDue`.

Estados derivados:

```txt
ISSUED + pago parcial → PARTIALLY_PAID
PARTIALLY_PAID + pago final → PAID
```

---

## 5. Cálculos

### 5.1. Cálculo de línea

Para cada línea:

```txt
grossAmount = quantity × unitPrice
discountAmount = grossAmount × discountRate / 100
subtotal = grossAmount - discountAmount
taxAmount = subtotal × taxRate / 100
total = subtotal + taxAmount
```

Ejemplo:

```txt
quantity = 1
unitPrice = 1200
discountRate = 10%
taxRate = 21%

grossAmount = 1200
discountAmount = 120
subtotal = 1080
taxAmount = 226.80
total = 1306.80
```

---

### 5.2. Cálculo de factura

La factura suma todas sus líneas:

```txt
subtotal = suma de subtotales de línea
taxTotal = suma de cuotas de IVA
total = subtotal + taxTotal
amountPaid = suma de pagos registrados
amountDue = total - amountPaid
```

---

## 6. Reglas profesionales implementadas

### 6.1. No se editan facturas emitidas

Solo las facturas en estado `DRAFT` pueden actualizarse desde el endpoint normal de edición.

Si una factura está `ISSUED`, `PARTIALLY_PAID` o `PAID`, no se permite modificarla con `PUT /api/invoices/:id`.

---

### 6.2. No se borran facturas

El endpoint `DELETE /api/invoices/:id` no elimina físicamente la factura.

Para borradores, la operación cambia el estado a:

```txt
CANCELLED
```

---

### 6.3. Snapshot fiscal

Al emitir una factura, se copian los datos fiscales de empresa y cliente.

Esto garantiza que una factura histórica conserva los datos originales aunque después se modifique el cliente o la empresa.

---

### 6.4. Numeración mediante series

Las facturas oficiales se numeran con una serie.

Ejemplo:

```txt
Serie: FACT-2026
Prefijo: F2026-
currentNumber: 0

Factura emitida:
F2026-000001
```

Después de emitir:

```txt
currentNumber = 1
```

---

### 6.5. Auditoría

Las acciones importantes generan registros en `AuditLog`.

Acciones auditadas:

* Creación de factura.
* Actualización de borrador.
* Cancelación de borrador.
* Emisión de factura.
* Registro de pagos.

---

## 7. Endpoints de facturación

### Facturas

| Método   | Endpoint                  | Descripción                                    |
| -------- | ------------------------- | ---------------------------------------------- |
| `GET`    | `/api/invoices`           | Lista facturas de la empresa autenticada.      |
| `GET`    | `/api/invoices/:id`       | Obtiene una factura concreta.                  |
| `POST`   | `/api/invoices`           | Crea una factura en borrador.                  |
| `PUT`    | `/api/invoices/:id`       | Actualiza una factura solo si está en `DRAFT`. |
| `DELETE` | `/api/invoices/:id`       | Cancela una factura en borrador.               |
| `POST`   | `/api/invoices/:id/issue` | Emite oficialmente una factura.                |

---

### Pagos de factura

| Método | Endpoint                     | Descripción                                |
| ------ | ---------------------------- | ------------------------------------------ |
| `GET`  | `/api/invoices/:id/payments` | Lista los pagos de una factura.            |
| `POST` | `/api/invoices/:id/payments` | Registra un pago para una factura emitida. |

---

### Series de facturación

| Método   | Endpoint                  | Descripción                 |
| -------- | ------------------------- | --------------------------- |
| `GET`    | `/api/invoice-series`     | Lista series activas.       |
| `GET`    | `/api/invoice-series/:id` | Obtiene una serie concreta. |
| `POST`   | `/api/invoice-series`     | Crea una nueva serie.       |
| `PUT`    | `/api/invoice-series/:id` | Actualiza una serie.        |
| `DELETE` | `/api/invoice-series/:id` | Desactiva una serie.        |

---

## 8. Ejemplos de uso

### Crear factura en borrador

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

### Emitir factura

```txt
POST /api/invoices/1/issue
```

Resultado esperado:

```txt
status = ISSUED
invoiceNumber = F2026-000001
issueDate = fecha actual
```

---

### Registrar pago parcial

```json
{
  "amount": "500",
  "method": "BANK_TRANSFER",
  "reference": "TRANSFER-001",
  "notes": "Primer pago parcial"
}
```

Resultado esperado:

```txt
status = PARTIALLY_PAID
amountPaid = 500.00
amountDue = total - 500.00
```

---

### Registrar pago final

```json
{
  "amount": "806.80",
  "method": "BANK_TRANSFER",
  "reference": "TRANSFER-002",
  "notes": "Pago final"
}
```

Resultado esperado:

```txt
status = PAID
amountPaid = total
amountDue = 0.00
```

---

## 9. Flujo completo implementado

```txt
Crear borrador
    ↓
Actualizar borrador
    ↓
Emitir factura
    ↓
Registrar pago parcial
    ↓
Registrar pago final
```

Estados:

```txt
DRAFT → ISSUED → PARTIALLY_PAID → PAID
```

---

## 10. Mejoras futuras

El módulo queda preparado para ampliar con:

* Generación de PDF.
* Envío de factura por email.
* Facturas rectificativas.
* Asientos contables automáticos.
* Exportación contable.
* Control automático de facturas vencidas.
* Factura electrónica.
* Adjuntos documentales.
