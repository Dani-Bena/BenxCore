# Documentación del módulo de facturación — BenxCore

## 1. Objetivo del módulo

Este es el módulo central de BenxCore. La idea desde el principio fue no quedarme en un CRUD de facturas (crear, listar, editar, borrar) sino modelar el ciclo de vida real de una factura: nace como borrador, se puede tocar mientras es borrador, y en el momento en que se emite pasa a ser un documento oficial que ya no se puede modificar.

Para que esto funcione, la facturación se apoya en casi todos los módulos anteriores:

* **Empresa**: aporta los datos fiscales del emisor.
* **Clientes**: aportan los datos fiscales del destinatario.
* **Productos/servicios**: son los conceptos que se facturan.
* **Series de facturación**: dan la numeración correlativa al emitir.
* **Pagos**: registran los cobros, parciales o totales.
* **Auditoría**: deja constancia de qué se hizo y cuándo.

## 2. Entidades principales

### Invoice

Es la factura en sí. Los campos más relevantes son `id`, `type`, `status`, `invoiceNumber`, `issueDate`, `dueDate`, `subtotal`, `taxTotal`, `total`, `amountPaid`, `amountDue`, `notes`, `companyId`, `clientId` e `invoiceSeriesId`.

Lo que no es tan obvio a primera vista es que, en el momento en que la factura se emite, se hace una copia de los datos fiscales del emisor y del cliente directamente dentro de la factura:

* Emisor: `issuerName`, `issuerNif`, `issuerAddress`, `issuerEmail`, `issuerPhone`
* Cliente: `customerName`, `customerNif`, `customerAddress`, `customerEmail`, `customerPhone`

Esto es el "snapshot fiscal", y es una de las decisiones de diseño de las que estoy más contento: si dentro de seis meses cambio la dirección de mi empresa o un cliente actualiza su NIF, las facturas ya emitidas no deben cambiar. Una factura histórica tiene que reflejar la realidad del momento en que se emitió, no la actual.

### InvoiceLine

Cada línea de una factura. Guarda `lineNumber`, `description`, `unit`, `quantity`, `unitPrice`, `discountRate`, `discountAmount`, `taxRate`, `subtotal`, `taxAmount`, `total` y, opcionalmente, `productId`.

Aunque una línea venga de un producto del catálogo, no se limita a guardar una referencia: copia la descripción, el precio, el IVA, etc. en el momento de crearse. Por el mismo motivo que con el snapshot fiscal: si más adelante cambio el precio de un producto, las facturas ya hechas no deben verse afectadas.

### InvoiceTaxSummary

Agrupa el total de la factura por tipo de IVA. Por ejemplo, si una factura tiene líneas al 21% y al 10%, esta tabla guarda una fila por cada tipo con su base imponible y su cuota:

| IVA | Base imponible |    Cuota |
| --- | -------------: | -------: |
| 21% |      1080.00 € | 226.80 € |

Sin esto, mostrar el desglose de IVA en el PDF (o en cualquier informe) significaría recalcularlo cada vez recorriendo todas las líneas.

### InvoiceSeries

Controla la numeración de las facturas emitidas. Tiene `code`, `prefix`, `currentNumber` y `year`. Por ejemplo, con `code = "FACT-2026"`, `prefix = "F2026-"` y `currentNumber = 0`, la primera factura que se emita con esa serie quedará como `F2026-000001` y `currentNumber` pasará a `1`.

### Payment

Un pago asociado a una factura: `amount`, `paymentDate`, `method`, `reference`, `notes` e `invoiceId`. Cada vez que se registra un pago, se recalculan automáticamente `amountPaid` y `amountDue` de la factura, y se actualiza su estado si corresponde.

## 3. Estados de una factura

| Estado           | Descripción                                                |
| ---------------- | ----------------------------------------------------------- |
| `DRAFT`          | Borrador editable. Todavía no tiene número oficial.        |
| `ISSUED`         | Factura emitida. Tiene número oficial y queda bloqueada.   |
| `PARTIALLY_PAID` | Factura emitida con pagos parciales.                       |
| `PAID`           | Factura completamente pagada.                              |
| `OVERDUE`        | Factura vencida. Pendiente de implementar automáticamente. |
| `CANCELLED`      | Factura cancelada. No se elimina físicamente.              |

## 4. Ciclo de vida de una factura

### 4.1. Creación del borrador

Una factura nace siempre como `DRAFT`. En este estado no tiene número oficial ni fecha de emisión, y se puede editar libremente: cambiar el cliente, añadir o quitar líneas, modificar cantidades o descuentos... Cada cambio recalcula automáticamente subtotales, IVA y totales, así que nunca hay que actualizarlos "a mano".

### 4.2. Emisión de factura

Emitir una factura (`POST /api/invoices/:id/issue`) es el paso que la convierte en un documento oficial, y por eso tiene varias comprobaciones antes de dejarlo pasar:

* La factura tiene que estar en `DRAFT`.
* Tiene que ser de tipo `STANDARD` (las rectificativas todavía no tienen flujo propio, ver más abajo).
* Necesita una serie activa.
* El cliente tiene que estar activo.
* Tiene que tener al menos una línea.
* Tanto la empresa como el cliente deben tener los datos fiscales mínimos completos.

Si todo eso se cumple, en una misma operación: se incrementa el contador de la serie, se genera el número de factura, se asigna la fecha de emisión, se copian los datos fiscales (el snapshot del que hablaba antes), la factura pasa a `ISSUED` y queda registrada en auditoría. Además, esto dispara la generación del asiento contable correspondiente — ese detalle está en `contabilidad.md`.

### 4.3. Registro de pagos

Una vez emitida, la factura puede recibir pagos. Las reglas son bastante directas, pero importantes:

* No se puede pagar una factura en `DRAFT` (todavía no es un documento oficial).
* No se puede pagar una factura `CANCELLED`.
* No se puede pagar una factura que ya está `PAID`.
* No se puede pagar más del importe pendiente (`amountDue`).

Cada pago se guarda como un registro `Payment` independiente, y la factura actualiza `amountPaid` y `amountDue`. El estado se deriva automáticamente:

```txt
ISSUED + pago parcial         → PARTIALLY_PAID
PARTIALLY_PAID + pago final   → PAID
```

## 5. Cálculos

### 5.1. Por línea

```txt
grossAmount      = quantity × unitPrice
discountAmount   = grossAmount × discountRate / 100
subtotal         = grossAmount - discountAmount
taxAmount        = subtotal × taxRate / 100
total            = subtotal + taxAmount
```

Ejemplo con 1 unidad a 1200 €, 10% de descuento y 21% de IVA:

```txt
grossAmount    = 1200
discountAmount = 120
subtotal       = 1080
taxAmount      = 226.80
total          = 1306.80
```

### 5.2. Por factura

La factura simplemente suma sus líneas:

```txt
subtotal   = suma de subtotales de línea
taxTotal   = suma de cuotas de IVA
total      = subtotal + taxTotal
amountPaid = suma de pagos registrados
amountDue  = total - amountPaid
```

Todos estos importes son `Decimal` en la base de datos (no `float`), precisamente para que estos cálculos no acumulen errores de redondeo.

## 6. Reglas de negocio que me parecía importante dejar claras

**Una factura emitida no se edita.** `PUT /api/invoices/:id` solo funciona si la factura está en `DRAFT`. Si está `ISSUED`, `PARTIALLY_PAID` o `PAID`, la petición se rechaza. Es la consecuencia directa de que una factura emitida es un documento fiscal: no tiene sentido que cambie después de entregarse al cliente.

**Las facturas no se borran.** `DELETE /api/invoices/:id` no hace un `DELETE` real. Para un borrador, cambia su estado a `CANCELLED`. El registro sigue existiendo (por trazabilidad y porque podría tener referencias), simplemente deja de ser una factura "activa".

**Snapshot fiscal al emitir.** Ya lo comenté en la sección de entidades, pero merece la pena repetirlo aquí como regla: al emitir se copian los datos de empresa y cliente dentro de la factura, así que cambios posteriores en `Company` o `Client` no afectan a facturas ya emitidas.

**Numeración por series.** El número de factura no es un autoincremental genérico de la base de datos, sino que depende de la serie elegida (`FACT-2026` → `F2026-000001`, `F2026-000002`, ...). Cada serie lleva su propio contador (`currentNumber`).

**Todo lo importante queda auditado.** Crear una factura, actualizar un borrador, cancelarlo, emitir y registrar pagos generan entradas en `AuditLog`.

## 7. Endpoints

### Facturas

| Método   | Endpoint                  | Descripción                                    |
| -------- | ------------------------- | ------------------------------------------------ |
| `GET`    | `/api/invoices`           | Lista facturas de la empresa autenticada.      |
| `GET`    | `/api/invoices/:id`       | Obtiene una factura concreta.                  |
| `POST`   | `/api/invoices`           | Crea una factura en borrador.                  |
| `PUT`    | `/api/invoices/:id`       | Actualiza una factura solo si está en `DRAFT`. |
| `DELETE` | `/api/invoices/:id`       | Cancela una factura en borrador.               |
| `POST`   | `/api/invoices/:id/issue` | Emite oficialmente una factura.                |

### Pagos de factura

| Método | Endpoint                     | Descripción                                |
| ------ | ----------------------------- | ---------------------------------------------- |
| `GET`  | `/api/invoices/:id/payments` | Lista los pagos de una factura.            |
| `POST` | `/api/invoices/:id/payments` | Registra un pago para una factura emitida. |

### Series de facturación

| Método   | Endpoint                  | Descripción                 |
| -------- | --------------------------- | ------------------------------ |
| `GET`    | `/api/invoice-series`     | Lista series activas.       |
| `GET`    | `/api/invoice-series/:id` | Obtiene una serie concreta. |
| `POST`   | `/api/invoice-series`     | Crea una nueva serie.       |
| `PUT`    | `/api/invoice-series/:id` | Actualiza una serie.        |
| `DELETE` | `/api/invoice-series/:id` | Desactiva una serie.        |

## 8. Ejemplo de uso de principio a fin

Crear una factura en borrador:

```json
POST /api/invoices

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

El sistema responde con `status = DRAFT`, `subtotal = 1080.00`, `taxTotal = 226.80`, `total = 1306.80`, `amountPaid = 0.00` y `amountDue = 1306.80`.

Emitir la factura:

```txt
POST /api/invoices/1/issue
```

Resultado: `status = ISSUED`, `invoiceNumber = F2026-000001`, `issueDate` = fecha actual.

Registrar un pago parcial:

```json
POST /api/invoices/1/payments

{
  "amount": "500",
  "method": "BANK_TRANSFER",
  "reference": "TRANSFER-001",
  "notes": "Primer pago parcial"
}
```

Resultado: `status = PARTIALLY_PAID`, `amountPaid = 500.00`, `amountDue = total - 500.00`.

Y el pago final:

```json
POST /api/invoices/1/payments

{
  "amount": "806.80",
  "method": "BANK_TRANSFER",
  "reference": "TRANSFER-002",
  "notes": "Pago final"
}
```

Resultado: `status = PAID`, `amountPaid = total`, `amountDue = 0.00`.

En resumen, el recorrido completo es:

```txt
Crear borrador → Actualizar borrador → Emitir factura → Pago parcial → Pago final

DRAFT → ISSUED → PARTIALLY_PAID → PAID
```

## 9. Lo que falta por implementar

El modelo ya está preparado para algunas cosas que todavía no tienen flujo:

* **Facturas rectificativas**: el tipo `CORRECTIVE` y el campo `rectifiesInvoiceId` existen en el esquema, pero el endpoint para generarlas a partir de una factura emitida no está hecho.
* **Estado `OVERDUE`**: existe como valor del enum, pero nada lo cambia automáticamente cuando se pasa la fecha de vencimiento.
* **Envío de la factura por email** al cliente tras emitirla.

El resto de ideas de ampliación (asientos manuales, libro diario/mayor, etc.) están recogidas con más contexto en `tfg-status-and-roadmap.md`, para no duplicar la lista aquí.
