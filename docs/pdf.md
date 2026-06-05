# Documentación del módulo de generación de PDFs — BenxCore

## 1. Objetivo del módulo

El módulo de generación de PDFs de BenxCore permite crear documentos descargables a partir de la información ya registrada en el sistema.

Actualmente se generan dos tipos de documentos:

1. PDF de factura emitida.
2. PDF de comprobante de pago.

El objetivo es separar correctamente los documentos comerciales/fiscales de los documentos financieros asociados al cobro.

---

## 2. Tipos de PDF implementados

### 2.1. PDF de factura

El PDF de factura representa el documento comercial emitido al cliente.

Endpoint:

```txt
GET /api/invoices/:id/pdf
```

Este PDF contiene:

* Número de factura.
* Fecha de emisión.
* Fecha de vencimiento.
* Estado de la factura.
* Datos fiscales del emisor.
* Datos fiscales del cliente.
* Líneas de factura.
* Descuentos por línea.
* IVA por línea.
* Resumen de impuestos.
* Subtotal.
* Total de IVA.
* Total de factura.
* Notas de la factura, si existen.

No contiene:

* Historial de pagos.
* Tabla de cobros registrados.
* Asientos contables.
* Información interna de auditoría.

Esta decisión permite que el PDF de factura sea un documento estable. La factura emitida no debe cambiar visualmente cada vez que se registra un pago.

---

### 2.2. PDF de comprobante de pago

El PDF de comprobante de pago representa un justificante financiero asociado a un pago concreto.

Endpoint:

```txt
GET /api/invoices/:id/payments/:paymentId/receipt
```

Este PDF contiene:

* Número de comprobante.
* Número de factura asociada.
* Fecha de pago.
* Datos del emisor.
* Datos del cliente.
* Importe pagado.
* Método de pago.
* Referencia del pago.
* Notas del pago, si existen.
* Estado de la factura tras el pago.
* Total pagado acumulado.
* Importe pendiente.

Este documento no sustituye a la factura. Sirve como justificante del cobro.

---

## 3. Separación conceptual

BenxCore diferencia entre tres conceptos:

```txt
Factura = documento comercial/fiscal
Pago = evento financiero registrado en base de datos
Comprobante = documento justificativo de un pago
```

Esta separación evita mezclar responsabilidades.

La factura representa lo que se ha vendido y facturado.

El pago representa un movimiento económico recibido.

El comprobante representa una evidencia documental de ese pago.

---

## 4. Reglas del PDF de factura

### 4.1. Solo facturas emitidas

No se permite generar PDF oficial de una factura en estado `DRAFT`.

Motivo:

```txt
Una factura en borrador todavía no es un documento oficial.
```

Si se intenta generar el PDF de una factura en borrador, el sistema devuelve error.

---

### 4.2. No se genera PDF de facturas canceladas

No se genera PDF oficial de facturas en estado `CANCELLED`.

Motivo:

```txt
Una factura cancelada no debe circular como documento comercial válido.
```

---

### 4.3. La factura debe tener número oficial

Para generar el PDF, la factura debe tener:

* `invoiceNumber`
* `issueDate`

Esto garantiza que la factura ya ha sido emitida formalmente.

---

### 4.4. Uso de snapshot fiscal

El PDF de factura usa los datos fiscales congelados dentro de la factura:

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

No usa directamente los datos actuales de `Company` o `Client`.

Esto es importante porque si mañana cambia la dirección del cliente o de la empresa, las facturas antiguas deben conservar los datos originales.

---

## 5. Reglas del PDF de comprobante de pago

### 5.1. El pago debe existir

El comprobante solo se genera si existe un `Payment` con:

```txt
payment.id = paymentId
payment.invoiceId = invoiceId
invoice.companyId = empresa autenticada
```

Esto evita acceder a pagos de otras empresas o generar comprobantes con datos inconsistentes.

---

### 5.2. La factura debe estar emitida

El comprobante de pago solo se genera si la factura asociada tiene:

* `invoiceNumber`
* `issueDate`

Esto evita generar comprobantes de pagos asociados a documentos no emitidos oficialmente.

---

### 5.3. Cada pago tiene su propio comprobante

Cada pago registrado puede tener su propio PDF.

Ejemplo:

```txt
Factura F2026-000002

Pago 1: 500.00 €
Comprobante: REC-3-F2026-000002.pdf

Pago 2: 806.80 €
Comprobante: REC-4-F2026-000002.pdf
```

Esto permite justificar pagos parciales y pagos finales por separado.

---

## 6. Endpoints implementados

### PDF de factura

```txt
GET /api/invoices/:id/pdf
```

Descripción:

Genera el PDF oficial de una factura emitida.

Parámetros:

| Parámetro | Descripción      |
| --------- | ---------------- |
| `id`      | ID de la factura |

Respuesta:

```txt
Content-Type: application/pdf
Content-Disposition: inline; filename="F2026-000001.pdf"
```

Ejemplo:

```txt
GET /api/invoices/2/pdf
```

---

### PDF de comprobante de pago

```txt
GET /api/invoices/:id/payments/:paymentId/receipt
```

Descripción:

Genera el PDF de comprobante de un pago asociado a una factura.

Parámetros:

| Parámetro   | Descripción      |
| ----------- | ---------------- |
| `id`        | ID de la factura |
| `paymentId` | ID del pago      |

Respuesta:

```txt
Content-Type: application/pdf
Content-Disposition: inline; filename="REC-3-F2026-000002.pdf"
```

Ejemplo:

```txt
GET /api/invoices/2/payments/3/receipt
```

---

## 7. Seguridad y autorización

Ambos endpoints están protegidos mediante JWT.

El usuario debe enviar el token en la cabecera:

```txt
Authorization: Bearer <token>
```

Además, el sistema valida que:

* La factura pertenece a la empresa autenticada.
* El pago pertenece a esa factura.
* La factura pertenece a la empresa autenticada.

Esto evita que un usuario pueda descargar PDFs de facturas o pagos de otra empresa.

---

## 8. Ejemplos de uso con PowerShell

### 8.1. Login

```powershell
$response = Invoke-RestMethod `
  -Uri "http://localhost:3000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "email": "daniel@test.com",
    "password": "12345678"
  }'
```

---

### 8.2. Descargar PDF de factura

```powershell
Invoke-WebRequest `
  -Uri "http://localhost:3000/api/invoices/2/pdf" `
  -Headers @{
    Authorization = "Bearer $($response.token)"
  } `
  -OutFile ".\factura-test.pdf"
```

Abrir:

```powershell
start .\factura-test.pdf
```

---

### 8.3. Listar pagos de una factura

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/invoices/2/payments" `
  -Method GET `
  -Headers @{
    Authorization = "Bearer $($response.token)"
  } | ConvertTo-Json -Depth 10
```

---

### 8.4. Descargar comprobante de pago

```powershell
Invoke-WebRequest `
  -Uri "http://localhost:3000/api/invoices/2/payments/3/receipt" `
  -Headers @{
    Authorization = "Bearer $($response.token)"
  } `
  -OutFile ".\comprobante-pago.pdf"
```

Abrir:

```powershell
start .\comprobante-pago.pdf
```

---

## 9. Contenido del PDF de factura

El PDF de factura se estructura en las siguientes secciones:

### Cabecera

Incluye:

* Título `FACTURA`.
* Número de factura.
* Fecha de emisión.
* Fecha de vencimiento.
* Estado.

---

### Datos fiscales

Incluye dos bloques:

#### Emisor

* Nombre.
* NIF.
* Dirección.
* Email.
* Teléfono.

#### Cliente

* Nombre.
* NIF.
* Dirección.
* Email.
* Teléfono.

---

### Líneas de factura

Incluye:

* Número de línea.
* Descripción.
* Cantidad.
* Precio unitario.
* Descuento.
* IVA.
* Total de línea.

---

### Resumen de impuestos

Incluye:

* Tipo de IVA.
* Base imponible.
* Cuota de IVA.

---

### Totales

Incluye:

* Subtotal.
* IVA.
* Total.

No incluye pagos, porque los pagos pertenecen al flujo financiero y se documentan mediante comprobantes.

---

## 10. Contenido del PDF de comprobante de pago

El PDF de comprobante de pago se estructura en estas secciones:

### Cabecera

Incluye:

* Título `COMPROBANTE DE PAGO`.
* Número de comprobante.
* Número de factura.
* Fecha de pago.

---

### Datos del emisor

Incluye:

* Nombre.
* NIF.
* Dirección.
* Email.
* Teléfono.

---

### Datos del cliente

Incluye:

* Nombre.
* NIF.
* Dirección.
* Email.
* Teléfono.

---

### Detalle del pago

Incluye:

* Número de factura.
* Fecha de factura.
* Total de factura.
* Importe pagado.
* Método de pago.
* Referencia.
* Notas, si existen.

---

### Estado de la factura tras el pago

Incluye:

* Estado actual de la factura.
* Total pagado acumulado.
* Importe pendiente.

---

## 11. Relación con facturación

El módulo PDF se apoya en el módulo de facturación.

Flujo general:

```txt
Crear factura en borrador
    ↓
Emitir factura
    ↓
Generar PDF de factura
    ↓
Registrar pago
    ↓
Generar comprobante de pago
```

Estados relacionados:

```txt
DRAFT → no permite PDF oficial
ISSUED → permite PDF de factura
PARTIALLY_PAID → permite PDF de factura y comprobantes
PAID → permite PDF de factura y comprobantes
CANCELLED → no permite PDF oficial
```

---

## 12. Relación con contabilidad

Los PDFs no generan contabilidad por sí mismos.

La contabilidad se genera en estos momentos:

* Al emitir factura.
* Al registrar pago.

Los PDFs simplemente representan documentalmente operaciones ya registradas.

Esto evita que la descarga de un PDF tenga efectos secundarios sobre la base de datos.

Regla importante:

```txt
Generar PDF no modifica datos.
```

---

## 13. Diseño técnico

El módulo se implementa mediante servicios separados:

```txt
invoice-pdf.service.ts
payment-receipt-pdf.service.ts
```

Responsabilidades:

### invoice-pdf.service.ts

* Buscar factura emitida.
* Validar que puede exportarse.
* Generar PDF de factura.
* Devolver buffer y nombre de archivo.

### payment-receipt-pdf.service.ts

* Buscar pago asociado a factura.
* Validar que pertenece a la empresa.
* Validar que la factura está emitida.
* Generar PDF de comprobante.
* Devolver buffer y nombre de archivo.

### invoices.routes.ts

Expone los endpoints HTTP:

```txt
GET /api/invoices/:id/pdf
GET /api/invoices/:id/payments/:paymentId/receipt
```

---

## 14. Decisiones de diseño

### 14.1. Factura sin historial de pagos

Se decidió no incluir pagos dentro del PDF oficial de factura.

Motivo:

```txt
La factura debe ser un documento estable.
```

Si el usuario descarga la misma factura antes y después de registrar pagos, el contenido principal no debería cambiar.

---

### 14.2. Comprobante separado

Los pagos tienen su propio comprobante.

Motivo:

```txt
El pago es un evento financiero independiente.
```

Esto permite justificar pagos parciales, pagos finales o múltiples pagos de una misma factura.

---

### 14.3. PDFs sin efectos secundarios

Generar un PDF no crea ni modifica datos.

Motivo:

```txt
La generación documental debe ser una operación de lectura.
```

---

## 15. Limitaciones actuales

La versión actual no incluye todavía:

* Logo de empresa.
* Firma digital.
* Código QR de verificación.
* Plantillas personalizables.
* Numeración específica de comprobantes.
* Almacenamiento permanente del PDF generado.
* Envío por email.
* Factura electrónica.
* Descarga masiva de PDFs.
* Traducción multiidioma.
* Personalización visual por empresa.

---

## 16. Mejoras futuras

Posibles mejoras:

* Añadir logotipo de empresa al PDF.
* Añadir plantilla visual configurable.
* Guardar PDFs generados en almacenamiento.
* Crear historial de documentos enviados.
* Generar recibos agrupados.
* Añadir endpoint de envío por email.
* Añadir código QR para verificar factura.
* Añadir firma digital.
* Crear PDF de proforma.
* Crear PDF de factura rectificativa.
* Exportar facturas en lote.
* Añadir soporte multiidioma.
* Añadir moneda configurable.

---

## 17. Resumen

El módulo de PDFs de BenxCore permite generar documentos descargables para dos operaciones clave:

* Factura emitida.
* Comprobante de pago.

La factura queda como documento comercial/fiscal estable.

El comprobante de pago queda como documento financiero asociado a un cobro concreto.

Esta separación mejora la claridad del sistema y hace que BenxCore tenga una estructura más cercana a un ERP real.
