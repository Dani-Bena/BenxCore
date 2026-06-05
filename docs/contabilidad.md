# Documentación del módulo de contabilidad — BenxCore

## 1. Objetivo del módulo

El módulo de contabilidad de BenxCore tiene como objetivo registrar automáticamente los efectos contables derivados de la facturación y los cobros.

No se plantea inicialmente como un sistema contable completo, sino como una base profesional para conectar las operaciones comerciales del ERP con una estructura contable coherente.

El módulo permite:

* Crear cuentas contables por empresa.
* Generar asientos automáticos al emitir facturas.
* Generar asientos automáticos al registrar pagos.
* Consultar cuentas contables.
* Consultar asientos contables.
* Consultar las líneas de debe y haber de cada asiento.

---

## 2. Enfoque general

BenxCore usa una contabilidad basada en asientos de partida doble.

Cada asiento contable se compone de:

* Una cabecera: `JournalEntry`.
* Varias líneas contables: `JournalLine`.
* Una cuenta asociada a cada línea: `AccountingAccount`.

La regla básica es:

```txt
Total Debe = Total Haber
```

Cada operación relevante debe generar un asiento equilibrado.

---

## 3. Entidades principales

### AccountingAccount

Representa una cuenta contable.

Campos principales:

* `id`
* `code`
* `name`
* `type`
* `active`
* `companyId`

Tipos posibles:

* `ASSET`
* `LIABILITY`
* `EQUITY`
* `INCOME`
* `EXPENSE`

Ejemplos:

| Código | Nombre                            | Tipo        |
| ------ | --------------------------------- | ----------- |
| `430`  | Clientes                          | `ASSET`     |
| `572`  | Bancos                            | `ASSET`     |
| `477`  | Hacienda Pública, IVA repercutido | `LIABILITY` |
| `700`  | Ventas de productos               | `INCOME`    |
| `705`  | Prestaciones de servicios         | `INCOME`    |

---

### JournalEntry

Representa la cabecera de un asiento contable.

Campos principales:

* `id`
* `entryNumber`
* `entryDate`
* `description`
* `source`
* `companyId`
* `invoiceId`
* `paymentId`

Fuentes posibles:

* `INVOICE`
* `PAYMENT`
* `MANUAL`

Actualmente BenxCore genera asientos automáticos con source:

* `INVOICE`, cuando se emite una factura.
* `PAYMENT`, cuando se registra un cobro.

Los asientos manuales quedan preparados para una fase futura.

---

### JournalLine

Representa una línea del asiento contable.

Campos principales:

* `id`
* `description`
* `debit`
* `credit`
* `journalEntryId`
* `accountId`

Cada línea pertenece a un asiento y referencia una cuenta contable.

Ejemplo:

| Cuenta | Descripción                  |    Debe |   Haber |
| ------ | ---------------------------- | ------: | ------: |
| `430`  | Cliente por factura emitida  | 1306.80 |    0.00 |
| `705`  | Ingresos por factura emitida |    0.00 | 1080.00 |
| `477`  | IVA repercutido              |    0.00 |  226.80 |

---

## 4. Cuentas contables creadas por defecto

Cuando BenxCore necesita generar un asiento automático, asegura primero que existen las cuentas contables básicas de la empresa.

Cuentas iniciales:

| Código | Nombre                            | Uso                             |
| ------ | --------------------------------- | ------------------------------- |
| `430`  | Clientes                          | Deuda pendiente del cliente.    |
| `572`  | Bancos                            | Entrada de dinero por cobro.    |
| `477`  | Hacienda Pública, IVA repercutido | IVA de facturas emitidas.       |
| `700`  | Ventas de productos               | Ingresos por productos físicos. |
| `705`  | Prestaciones de servicios         | Ingresos por servicios.         |

Estas cuentas se crean mediante `upsert`, por lo que si ya existen se actualizan y si no existen se crean.

---

## 5. Asiento automático por emisión de factura

Cuando una factura pasa de `DRAFT` a `ISSUED`, BenxCore genera automáticamente un asiento contable de emisión.

### Regla contable

Al emitir una factura:

```txt
Debe:
430 Clientes ......................... total factura

Haber:
700 / 705 Ingresos ................... base imponible
477 IVA repercutido .................. cuota IVA
```

### Ejemplo

Factura emitida:

```txt
Subtotal: 1080.00
IVA 21%: 226.80
Total: 1306.80
```

Asiento generado:

| Cuenta | Descripción                  |    Debe |   Haber |
| ------ | ---------------------------- | ------: | ------: |
| `430`  | Cliente por factura emitida  | 1306.80 |    0.00 |
| `705`  | Ingresos por factura emitida |    0.00 | 1080.00 |
| `477`  | IVA repercutido              |    0.00 |  226.80 |

El asiento queda vinculado a la factura mediante `invoiceId`.

---

## 6. Selección de cuenta de ingresos

BenxCore selecciona automáticamente la cuenta de ingresos según el tipo de producto o servicio.

Regla:

```txt
Producto físico → 700 Ventas de productos
Servicio        → 705 Prestaciones de servicios
```

Además, el modelo permite que un producto tenga una cuenta de ingresos específica mediante:

```txt
revenueAccountId
```

Si el producto tiene `revenueAccountId`, se usa esa cuenta.

Si no la tiene, se usa la cuenta por defecto:

* `700` para productos.
* `705` para servicios.

---

## 7. Agrupación de ingresos

Las líneas de factura se agrupan por cuenta contable de ingresos.

Esto permite que una misma factura tenga varias líneas asociadas a distintas cuentas.

Ejemplo:

| Línea      | Tipo     | Cuenta |   Base |
| ---------- | -------- | ------ | -----: |
| Producto A | Producto | `700`  | 500.00 |
| Servicio B | Servicio | `705`  | 800.00 |

Asiento:

| Cuenta                          |    Debe |  Haber |
| ------------------------------- | ------: | -----: |
| `430` Clientes                  | 1573.00 |   0.00 |
| `700` Ventas de productos       |    0.00 | 500.00 |
| `705` Prestaciones de servicios |    0.00 | 800.00 |
| `477` IVA repercutido           |    0.00 | 273.00 |

---

## 8. Asiento automático por cobro de factura

Cuando se registra un pago sobre una factura emitida, BenxCore genera automáticamente un asiento de cobro.

### Regla contable

Al cobrar una factura:

```txt
Debe:
572 Bancos ........................... importe cobrado

Haber:
430 Clientes ......................... importe cobrado
```

### Ejemplo

Pago parcial:

```txt
Importe cobrado: 500.00
```

Asiento generado:

| Cuenta | Descripción                           |   Debe |  Haber |
| ------ | ------------------------------------- | -----: | -----: |
| `572`  | Entrada en banco por cobro de factura | 500.00 |   0.00 |
| `430`  | Cancelación de deuda de cliente       |   0.00 | 500.00 |

El asiento queda vinculado a:

* La factura mediante `invoiceId`.
* El pago mediante `paymentId`.

---

## 9. Relación con estados de factura

Los asientos contables están integrados con el ciclo de vida de facturación.

### Emisión

```txt
DRAFT → ISSUED
```

Genera:

```txt
JournalEntry source = INVOICE
```

### Pago parcial

```txt
ISSUED → PARTIALLY_PAID
```

Genera:

```txt
JournalEntry source = PAYMENT
```

### Pago final

```txt
PARTIALLY_PAID → PAID
```

Genera otro asiento:

```txt
JournalEntry source = PAYMENT
```

Cada cobro genera su propio asiento independiente.

---

## 10. Reglas implementadas

### 10.1. Los asientos se generan dentro de transacciones

Los asientos se crean dentro de la misma transacción que la operación principal.

Ejemplos:

* Emitir factura y crear asiento de emisión.
* Registrar pago y crear asiento de cobro.

Esto evita inconsistencias como:

```txt
Factura emitida sin asiento
Pago registrado sin asiento
```

---

### 10.2. Las cuentas se crean automáticamente

Antes de generar un asiento, el sistema asegura que existen las cuentas contables básicas de la empresa.

Esto permite que una empresa nueva pueda emitir facturas sin configurar manualmente el plan contable mínimo.

---

### 10.3. Los asientos son consultables

Los asientos quedan almacenados y pueden consultarse desde la API.

Incluyen:

* Cabecera del asiento.
* Factura relacionada.
* Pago relacionado, si existe.
* Líneas del asiento.
* Cuenta contable de cada línea.

---

### 10.4. No se crean asientos manuales todavía

La versión actual permite consultar asientos y generar asientos automáticos.

La creación de asientos manuales se deja para una fase futura.

---

## 11. Endpoints de contabilidad

### Consultar cuentas contables

```txt
GET /api/accounting/accounts
```

Devuelve las cuentas activas de la empresa autenticada.

Filtro opcional:

```txt
GET /api/accounting/accounts?includeInactive=true
```

---

### Consultar asientos contables

```txt
GET /api/accounting/journal-entries
```

Devuelve los asientos de la empresa autenticada.

Filtros opcionales:

```txt
GET /api/accounting/journal-entries?source=INVOICE
GET /api/accounting/journal-entries?source=PAYMENT
GET /api/accounting/journal-entries?source=MANUAL
GET /api/accounting/journal-entries?dateFrom=2026-06-01&dateTo=2026-06-30
```

---

### Consultar asiento concreto

```txt
GET /api/accounting/journal-entries/:id
```

Devuelve un asiento concreto con sus líneas y cuentas asociadas.

---

## 12. Ejemplo de respuesta de asiento

Ejemplo simplificado:

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
        "account": {
          "code": "430",
          "name": "Clientes"
        }
      },
      {
        "description": "Ingresos por factura emitida",
        "debit": "0.00",
        "credit": "1080.00",
        "account": {
          "code": "705",
          "name": "Prestaciones de servicios"
        }
      },
      {
        "description": "IVA repercutido",
        "debit": "0.00",
        "credit": "226.80",
        "account": {
          "code": "477",
          "name": "Hacienda Pública, IVA repercutido"
        }
      }
    ]
  }
}
```

---

## 13. Flujo contable implementado

```txt
Emitir factura
    ↓
Crear asiento INVOICE
    ↓
Registrar pago parcial
    ↓
Crear asiento PAYMENT
    ↓
Registrar pago final
    ↓
Crear asiento PAYMENT
```

Ejemplo:

```txt
Factura F2026-000002 total 1306.80

Asiento de emisión:
Debe 430 = 1306.80
Haber 705 = 1080.00
Haber 477 = 226.80

Pago parcial 500:
Debe 572 = 500.00
Haber 430 = 500.00

Pago final 806.80:
Debe 572 = 806.80
Haber 430 = 806.80
```

---

## 14. Limitaciones actuales

La versión actual todavía no implementa:

* Asientos manuales.
* Periodos contables.
* Cierre contable.
* Conciliación bancaria.
* Remesas.
* Modelos fiscales.
* Exportación contable.
* Facturas rectificativas con asiento propio.
* Control de vencimientos automático.
* Reversión de asientos.
* Libro diario formal.
* Libro mayor.

---

## 15. Mejoras futuras

Mejoras previstas:

* Endpoint para crear asientos manuales.
* Validación automática de que cada asiento está cuadrado.
* Libro diario.
* Libro mayor por cuenta.
* Balance de sumas y saldos.
* Asientos para facturas rectificativas.
* Asientos para cancelaciones.
* Exportación CSV/Excel.
* Integración con módulos fiscales.
* Panel visual de contabilidad en el frontend.

---

## 16. Resumen

El módulo contable de BenxCore conecta la facturación con una base de contabilidad por partida doble.

Actualmente permite:

* Crear cuentas contables base por empresa.
* Generar asientos al emitir facturas.
* Generar asientos al registrar cobros.
* Consultar cuentas.
* Consultar asientos.
* Consultar líneas de debe y haber.
* Mantener la trazabilidad entre factura, pago y asiento.

Este diseño convierte el sistema de facturación en una base más realista para un ERP, ya que las operaciones comerciales no solo modifican facturas y pagos, sino que también generan efectos contables trazables.
