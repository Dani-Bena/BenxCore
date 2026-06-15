# Documentación del módulo de PDFs — BenxCore

## 1. Objetivo

Este módulo se encarga de generar los dos documentos descargables del sistema: el PDF de una factura emitida y el PDF de un comprobante de pago. La idea es darle a todo lo que ya está registrado en base de datos una salida en papel (o PDF) que se pueda entregar a un cliente.

Para entender por qué hay dos documentos distintos en lugar de uno, conviene tener claros estos tres conceptos:

```txt
Factura     = documento comercial/fiscal
Pago        = movimiento económico registrado en base de datos
Comprobante = justificante documental de un pago concreto
```

La factura representa lo que se ha vendido. El pago representa que ha entrado dinero. El comprobante es la prueba en papel de ese cobro. Mantenerlos separados evita mezclar dos cosas que cambian en momentos distintos: la factura se genera una vez al emitir, y los comprobantes se van generando uno por cada pago que llegue después.

## 2. PDF de factura

```txt
GET /api/invoices/:id/pdf
```

Incluye: número de factura, fechas de emisión y vencimiento, estado, datos fiscales del emisor y del cliente (los del snapshot, no los actuales de `Company`/`Client`), líneas con descuentos e IVA, resumen de impuestos por tipo de IVA, subtotal, total de IVA y total.

Deliberadamente **no incluye** historial de pagos, asientos contables ni nada de auditoría interna. La razón es que la factura debe ser un documento estable: si alguien descarga el PDF antes y después de que se registre un pago, el contenido principal de la factura no debería cambiar. Los pagos se documentan aparte, con su propio comprobante.

Reglas para poder generarlo:

* La factura no puede estar en `DRAFT` — un borrador todavía no es un documento oficial.
* La factura no puede estar `CANCELLED` — no debe circular como documento válido.
* Tiene que tener `invoiceNumber` e `issueDate`, es decir, tiene que haber sido emitida.

Y como decía arriba, usa siempre los datos fiscales **congelados** dentro de la propia factura (`issuerName`, `issuerNif`, `customerNif`, etc.), nunca los datos actuales de la empresa o el cliente.

## 3. PDF de comprobante de pago

```txt
GET /api/invoices/:id/payments/:paymentId/receipt
```

Incluye: número de comprobante, número de factura asociada, fecha de pago, datos de emisor y cliente, importe pagado, método y referencia del pago, notas si las hay, y el estado de la factura tras ese pago (total pagado acumulado e importe pendiente).

Reglas:

* El pago tiene que existir y pertenecer a esa factura (`payment.invoiceId = invoiceId`), y la factura tiene que pertenecer a la empresa autenticada — así se evita generar comprobantes cruzando datos de otra empresa.
* La factura asociada tiene que estar emitida (`invoiceNumber` + `issueDate`).

Cada pago tiene su propio comprobante. Si una factura recibe dos pagos, hay dos PDFs distintos:

```txt
Factura F2026-000002
  Pago 1: 500.00 €    → REC-3-F2026-000002.pdf
  Pago 2: 806.80 €    → REC-4-F2026-000002.pdf
```

Esto permite justificar pagos parciales y finales por separado, que es como se suele pedir en la práctica.

## 4. Logo y estilo

Ambos PDFs intentan cargar un logo de empresa desde `assets/company-logo.png` (o `.jpg`/`.jpeg`) mediante `utils/pdf-logo.ts`. Si el archivo no existe, el PDF se genera igual, simplemente sin logo — no es un error, solo un detalle visual opcional.

El estilo (fuentes y tamaños de texto) está centralizado en `utils/pdf-style.ts`, para que la factura y el comprobante compartan la misma apariencia y no haya que ajustar tamaños por separado en cada servicio.

## 5. Seguridad

Ambos endpoints requieren `Authorization: Bearer <token>`, y además comprueban que la factura (y, en el caso del comprobante, también el pago) pertenezcan a la empresa del usuario autenticado. Así un usuario nunca puede descargar el PDF de una factura o un pago de otra empresa solo por adivinar el `id`.

Importante: **generar un PDF no modifica nada en la base de datos**. Es una operación de solo lectura sobre datos que ya existían.

## 6. Probarlo con PowerShell

Login:

```powershell
$response = Invoke-RestMethod `
  -Uri "http://localhost:3000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{ "email": "daniel@test.com", "password": "12345678" }'
```

Descargar el PDF de una factura:

```powershell
Invoke-WebRequest `
  -Uri "http://localhost:3000/api/invoices/2/pdf" `
  -Headers @{ Authorization = "Bearer $($response.token)" } `
  -OutFile ".\factura-test.pdf"

start .\factura-test.pdf
```

Listar los pagos de una factura:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/invoices/2/payments" `
  -Method GET `
  -Headers @{ Authorization = "Bearer $($response.token)" } | ConvertTo-Json -Depth 10
```

Descargar el comprobante de un pago:

```powershell
Invoke-WebRequest `
  -Uri "http://localhost:3000/api/invoices/2/payments/3/receipt" `
  -Headers @{ Authorization = "Bearer $($response.token)" } `
  -OutFile ".\comprobante-pago.pdf"

start .\comprobante-pago.pdf
```

## 7. Diseño técnico

La generación está repartida en dos servicios, cada uno con su responsabilidad bien delimitada:

* **`invoice-pdf.service.ts`**: busca la factura emitida, valida que se pueda exportar, genera el PDF y devuelve el buffer junto con el nombre de archivo.
* **`payment-receipt-pdf.service.ts`**: busca el pago y comprueba que pertenece a la empresa y que la factura está emitida, genera el comprobante y devuelve buffer + nombre.

Ambos se exponen desde `invoices.routes.ts` (`GET /api/invoices/:id/pdf` y `GET /api/invoices/:id/payments/:paymentId/receipt`), y comparten las utilidades de logo y estilo mencionadas arriba.

## 8. Lo que falta

A nivel de contenido, los PDFs ya cubren lo esencial para un TFG. Las mejoras que tengo anotadas son sobre todo de acabado visual y de gestión documental:

* Pie legal, numeración de página y datos bancarios.
* Colores corporativos / plantilla configurable por empresa.
* Guardar una copia del PDF generado (hoy se genera al vuelo y no se almacena).
* Envío por email, código QR de verificación, firma digital — estas últimas entran más en el terreno de la factura electrónica, que queda fuera del alcance actual y está recogida como línea futura en `tfg-status-and-roadmap.md`.
