# Documentación del módulo de contabilidad — BenxCore

## 1. Objetivo del módulo

La idea de este módulo no es construir un programa de contabilidad completo — eso sería un proyecto en sí mismo — sino que las operaciones comerciales del ERP (emitir una factura, cobrar un pago) dejen también su huella contable, de forma automática y coherente. Es decir: que facturación y contabilidad no sean dos mundos separados.

Con lo que hay ahora se puede:

* Crear cuentas contables por empresa.
* Generar asientos automáticos al emitir facturas.
* Generar asientos automáticos al registrar pagos.
* Consultar cuentas y asientos, con sus líneas de debe y haber.

## 2. Enfoque: partida doble

BenxCore usa contabilidad por partida doble de toda la vida: cada operación genera un asiento (`JournalEntry`) compuesto por varias líneas (`JournalLine`), y cada línea apunta a una cuenta (`AccountingAccount`). La regla de oro, como en cualquier contabilidad, es:

```txt
Total Debe = Total Haber
```

Cada asiento que genera el sistema debe cumplir esto. De momento se cumple porque los asientos se construyen "a mano" en el código siguiendo fórmulas conocidas (ver más abajo), pero todavía no hay una comprobación explícita que lo verifique antes de guardar — lo dejo anotado en la sección de pendientes.

## 3. Entidades

### AccountingAccount

Una cuenta contable: `id`, `code`, `name`, `type` (`ASSET`, `LIABILITY`, `EQUITY`, `INCOME`, `EXPENSE`), `active`, `companyId`. Algunos ejemplos que usa el sistema:

| Código | Nombre                            | Tipo        |
| ------ | ----------------------------------- | ----------- |
| `430`  | Clientes                          | `ASSET`     |
| `572`  | Bancos                            | `ASSET`     |
| `477`  | Hacienda Pública, IVA repercutido | `LIABILITY` |
| `700`  | Ventas de productos               | `INCOME`    |
| `705`  | Prestaciones de servicios         | `INCOME`    |

### JournalEntry

La cabecera de un asiento: `id`, `entryNumber`, `entryDate`, `description`, `source`, `companyId`, y opcionalmente `invoiceId` / `paymentId` según de dónde venga.

`source` puede ser `INVOICE`, `PAYMENT` o `MANUAL`. Hoy en día el sistema solo genera `INVOICE` (al emitir) y `PAYMENT` (al cobrar) — `MANUAL` está en el modelo pensando en que en algún momento se pueda dar de alta un asiento a mano, pero no hay endpoint para ello todavía.

### JournalLine

Una línea del asiento: `id`, `description`, `debit`, `credit`, `journalEntryId`, `accountId`. Ejemplo de cómo quedan las líneas de un asiento de emisión:

| Cuenta | Descripción                  |    Debe |   Haber |
| ------ | -------------------------------- | ------: | ------: |
| `430`  | Cliente por factura emitida  | 1306.80 |    0.00 |
| `705`  | Ingresos por factura emitida |    0.00 | 1080.00 |
| `477`  | IVA repercutido              |    0.00 |  226.80 |

## 4. Cuentas que se crean solas

La primera vez que el sistema necesita generar un asiento para una empresa, comprueba que existan las cuentas básicas (`430`, `572`, `477`, `700`, `705`) y, si no existen, las crea (`upsert`, así que si ya existían simplemente se actualizan). De esta forma una empresa nueva puede empezar a facturar sin que nadie tenga que configurar un plan contable mínimo a mano.

## 5. Asiento al emitir una factura

Cuando una factura pasa de `DRAFT` a `ISSUED`, se genera automáticamente:

```txt
Debe:
430 Clientes ......................... total factura

Haber:
700 / 705 Ingresos ................... base imponible
477 IVA repercutido .................. cuota IVA
```

Por ejemplo, para una factura con subtotal 1080.00 € e IVA al 21% (226.80 €), total 1306.80 €:

| Cuenta | Descripción                  |    Debe |   Haber |
| ------ | -------------------------------- | ------: | ------: |
| `430`  | Cliente por factura emitida  | 1306.80 |    0.00 |
| `705`  | Ingresos por factura emitida |    0.00 | 1080.00 |
| `477`  | IVA repercutido              |    0.00 |  226.80 |

El asiento queda enlazado a la factura mediante `invoiceId`.

## 6. Qué cuenta de ingresos se usa

```txt
Producto físico → 700 Ventas de productos
Servicio        → 705 Prestaciones de servicios
```

Esa es la regla por defecto, pero un producto puede tener su propia cuenta de ingresos (`revenueAccountId`). Si la tiene, se usa esa; si no, se aplica la regla anterior según `type`.

Esto importa sobre todo cuando una misma factura mezcla productos y servicios: las líneas se agrupan por cuenta de ingresos, así que el asiento puede tener varias líneas de "Haber" en vez de una sola. Por ejemplo:

| Línea      | Tipo     | Cuenta |   Base |
| ---------- | -------- | ------ | -----: |
| Producto A | Producto | `700`  | 500.00 |
| Servicio B | Servicio | `705`  | 800.00 |

genera:

| Cuenta                          |    Debe |  Haber |
| ---------------------------------- | ------: | -----: |
| `430` Clientes                  | 1573.00 |   0.00 |
| `700` Ventas de productos       |    0.00 | 500.00 |
| `705` Prestaciones de servicios |    0.00 | 800.00 |
| `477` IVA repercutido           |    0.00 | 273.00 |

## 7. Asiento al cobrar una factura

Cada vez que se registra un pago sobre una factura emitida:

```txt
Debe:
572 Bancos ........................... importe cobrado

Haber:
430 Clientes ......................... importe cobrado
```

Por ejemplo, un pago parcial de 500 €:

| Cuenta | Descripción                           |   Debe |  Haber |
| ------ | ----------------------------------------- | -----: | -----: |
| `572`  | Entrada en banco por cobro de factura | 500.00 |   0.00 |
| `430`  | Cancelación de deuda de cliente       |   0.00 | 500.00 |

Este asiento queda enlazado tanto a la factura (`invoiceId`) como al pago concreto (`paymentId`). Si una factura recibe dos pagos (uno parcial y otro final), se generan dos asientos `PAYMENT` independientes, uno por cada cobro — tiene sentido, porque son dos movimientos bancarios distintos y cada uno debe poder rastrearse por separado.

## 8. Cómo se engancha todo con el estado de la factura

```txt
DRAFT → ISSUED                  → genera JournalEntry source = INVOICE
ISSUED → PARTIALLY_PAID          → genera JournalEntry source = PAYMENT
PARTIALLY_PAID → PAID            → genera otro JournalEntry source = PAYMENT
```

## 9. Un par de decisiones que merece la pena explicar

**Los asientos se crean en la misma transacción que la operación que los origina.** Emitir una factura y crear su asiento de emisión ocurre como una sola operación atómica; lo mismo con registrar un pago y su asiento de cobro. La alternativa (crear primero la factura y el asiento después, por separado) abriría la puerta a que algo falle a medias y queden facturas emitidas sin asiento, o pagos sin su contrapartida contable. Con la transacción, o se hace todo o no se hace nada.

**Los asientos son de solo lectura desde la API.** Se pueden consultar (cabecera, líneas, cuenta de cada línea, factura/pago relacionado) pero no editar ni borrar. Tiene sentido: si se pudiera editar un asiento ya generado, perdería bastante el sentido tener trazabilidad automática.

## 10. Endpoints

```txt
GET /api/accounting/accounts
GET /api/accounting/accounts?includeInactive=true
```

Cuentas contables de la empresa autenticada.

```txt
GET /api/accounting/journal-entries
GET /api/accounting/journal-entries?source=INVOICE
GET /api/accounting/journal-entries?source=PAYMENT
GET /api/accounting/journal-entries?source=MANUAL
GET /api/accounting/journal-entries?dateFrom=2026-06-01&dateTo=2026-06-30
```

Asientos de la empresa autenticada, con filtros opcionales por origen y rango de fechas.

```txt
GET /api/accounting/journal-entries/:id
```

Un asiento concreto con sus líneas y las cuentas asociadas.

## 11. Ejemplo de respuesta

```json
{
  "journalEntry": {
    "id": 1,
    "entryNumber": "JE-INV-F2026-000002",
    "source": "INVOICE",
    "description": "Asiento de emisión de factura F2026-000002",
    "invoice": {
      "id": 2,
      "invoiceNumber": "F2026-000002",
      "status": "ISSUED",
      "total": "1306.80"
    },
    "lines": [
      {
        "description": "Cliente por factura emitida",
        "debit": "1306.80",
        "credit": "0.00",
        "account": { "code": "430", "name": "Clientes" }
      },
      {
        "description": "Ingresos por factura emitida",
        "debit": "0.00",
        "credit": "1080.00",
        "account": { "code": "705", "name": "Prestaciones de servicios" }
      },
      {
        "description": "IVA repercutido",
        "debit": "0.00",
        "credit": "226.80",
        "account": { "code": "477", "name": "Hacienda Pública, IVA repercutido" }
      }
    ]
  }
}
```

## 12. Ejemplo de flujo completo

Para una factura F2026-000002 con total 1306.80 (subtotal 1080.00 + IVA 226.80):

```txt
Emisión:
  Debe 430 Clientes = 1306.80
  Haber 705 Prestaciones de servicios = 1080.00
  Haber 477 IVA repercutido = 226.80

Pago parcial de 500:
  Debe 572 Bancos = 500.00
  Haber 430 Clientes = 500.00

Pago final de 806.80:
  Debe 572 Bancos = 806.80
  Haber 430 Clientes = 806.80
```

## 13. Lo que falta

Lo más importante que tengo pendiente aquí es añadir una **validación explícita de que `totalDebe = totalHaber`** antes de persistir cualquier asiento. Ahora mismo se cumple porque las fórmulas que generan los asientos están bien, pero no hay nada que lo compruebe — y conceptualmente es la pieza que le da sentido a "partida doble".

El resto de cosas que faltan (asientos manuales, libro diario, libro mayor, balance de sumas y saldos, periodos contables, exportación...) están descritas con más detalle en `tfg-status-and-roadmap.md`. La idea es presentar este módulo como una base de integración contable sólida, no como un programa de contabilidad certificado — eso queda fuera del alcance de un TFG y conviene decirlo así de claro en la memoria.
