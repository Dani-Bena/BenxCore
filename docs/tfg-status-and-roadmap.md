# Estado del TFG y roadmap técnico — BenxCore

## 1. Valoración general

El backend de BenxCore se encuentra en un estado avanzado para un Trabajo de Fin de Grado si se presenta como un prototipo funcional de ERP ligero orientado a facturación, cobros y contabilidad básica.

No es únicamente una API CRUD. El sistema ya implementa reglas de negocio relevantes, trazabilidad, estados, documentos PDF y asientos contables automáticos.

Desde el punto de vista académico, el proyecto tiene una base defendible porque combina:

* Diseño modular.
* Persistencia relacional.
* Validación de datos.
* Autenticación.
* Multiempresa.
* Facturación con ciclo de vida.
* Contabilidad automática.
* Generación documental.
* Documentación técnica.

---

## 2. Puntos fuertes actuales

### 2.1. Arquitectura modular

El backend separa responsabilidades en:

```txt
routes
schemas
services
persistence
```

Esto permite explicar una arquitectura limpia y escalable.

---

### 2.2. Reglas de negocio reales

El sistema implementa lógica que se parece a procesos empresariales reales:

* No se editan facturas emitidas.
* No se pagan facturas en borrador.
* No se paga más del importe pendiente.
* Las facturas emitidas guardan snapshot fiscal.
* Los pagos generan movimientos contables.
* Los documentos PDF no modifican datos.

---

### 2.3. Facturación profesional

El flujo de facturación no es un CRUD plano.

Incluye:

```txt
DRAFT → ISSUED → PARTIALLY_PAID → PAID
```

Con emisión, numeración correlativa, líneas, descuentos, IVA, totales, pagos y PDFs.

---

### 2.4. Contabilidad automática

La conexión entre facturación, pagos y asientos contables aporta bastante valor.

Ejemplos:

Al emitir factura:

```txt
Debe 430 Clientes
Haber 705 Prestaciones de servicios
Haber 477 IVA repercutido
```

Al cobrar:

```txt
Debe 572 Bancos
Haber 430 Clientes
```

Esto hace que el proyecto parezca más cercano a un ERP real.

---

### 2.5. Generación documental

La generación de PDFs de factura y comprobantes de pago da una salida tangible al sistema.

Es una funcionalidad útil para mostrar en una defensa.

---

### 2.6. Trazabilidad

El uso de `AuditLog` permite defender que el sistema registra acciones relevantes.

Esto es importante en sistemas empresariales.

---

## 3. Riesgos actuales

### 3.1. Falta de tests

El mayor riesgo ahora mismo es que el backend ha crecido bastante y todavía no tiene pruebas automáticas.

Para un TFG, esto no invalida el proyecto, pero sí sería una mejora importante.

---

### 3.2. Falta de documentación general de instalación

Hace falta un documento claro que explique:

* Cómo levantar PostgreSQL.
* Cómo instalar dependencias.
* Cómo configurar `.env`.
* Cómo ejecutar migraciones.
* Cómo arrancar el backend.
* Cómo probar endpoints.

---

### 3.3. Roles todavía básicos

Actualmente existe usuario administrador, pero no hay una gestión completa de usuarios y permisos por empresa.

Para MVP puede valer, pero conviene mencionarlo como trabajo futuro.

---

### 3.4. Contabilidad básica, no completa

La contabilidad automática es útil, pero todavía no equivale a un software contable completo.

Faltan:

* Asientos manuales.
* Libro diario.
* Libro mayor.
* Cierres.
* Reversión de asientos.
* Balance.
* Exportaciones.

Debe presentarse como una base de integración contable, no como un sistema contable certificado.

---

### 3.5. Facturación no electrónica

El sistema genera PDFs, pero no implementa factura electrónica estructurada, firma digital ni integración con sistemas oficiales.

Debe explicarse como limitación y línea futura.

---

## 4. Imprescindibles antes de entregar

### 4.1. README principal sólido

Debe existir un `README.md` claro con:

* Descripción del proyecto.
* Stack tecnológico.
* Funcionalidades principales.
* Arquitectura.
* Cómo ejecutar.
* Variables de entorno.
* Comandos útiles.
* Estado del proyecto.

Esto es imprescindible.

---

### 4.2. `.env.example`

No debe subirse `.env`, pero sí un archivo de ejemplo:

```txt
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
PORT=
```

Esto ayuda a reproducir el proyecto.

---

### 4.3. Seed inicial

Muy recomendable crear un seed con:

* Empresa demo.
* Usuario admin.
* Cliente demo.
* Producto demo.
* Serie de facturación.
* Factura demo opcional.

Esto facilita la evaluación y la demo.

---

### 4.4. Tests mínimos

Como mínimo, convendría tener tests de:

* Login.
* Crear cliente.
* Crear producto.
* Crear factura en borrador.
* Emitir factura.
* Registrar pago.
* Comprobar que no se puede editar factura emitida.
* Comprobar que no se puede pagar más de lo pendiente.

No hace falta cubrir todo, pero sí los flujos críticos.

---

### 4.5. Validar asientos cuadrados

Antes de guardar un asiento contable, sería muy recomendable comprobar:

```txt
totalDebe = totalHaber
```

Esto es muy importante conceptualmente.

Aunque ahora generemos los asientos automáticamente bien, añadir una validación formal mejora mucho la calidad del módulo contable.

---

### 4.6. Manejo global de errores

Ahora se manejan errores por módulo.

Sería recomendable añadir un middleware global de errores para Express, aunque se mantengan errores específicos de servicio.

Esto daría más consistencia a la API.

---

### 4.7. Documentación de arquitectura

Conviene tener un documento adicional:

```txt
docs/architecture.md
```

Con:

* Diagrama lógico de capas.
* Estructura de carpetas.
* Relación entre módulos.
* Flujo de una factura.
* Flujo de un pago.
* Flujo de un asiento contable.

---

### 4.8. Documentación de base de datos

Muy recomendable crear:

```txt
docs/database-model.md
```

Con explicación de entidades:

* Company
* User
* Client
* Product
* Invoice
* InvoiceLine
* Payment
* AccountingAccount
* JournalEntry
* JournalLine
* AuditLog

Esto ayuda mucho en la memoria.

---

## 5. Muy recomendable antes de la defensa

### 5.1. Frontend mínimo

Aunque el backend sea potente, para la defensa un frontend simple ayuda muchísimo.

Pantallas mínimas recomendadas:

* Login.
* Dashboard.
* Clientes.
* Productos.
* Facturas.
* Detalle de factura.
* Botón de emitir.
* Botón de descargar PDF.
* Botón de registrar pago.
* Botón de descargar comprobante.

No tiene que ser perfecto, pero sí demostrar el flujo.

---

### 5.2. Swagger / OpenAPI

Añadir documentación interactiva de API con Swagger sería muy positivo.

Permite mostrar endpoints, probarlos y justificar mejor el backend.

---

### 5.3. Dashboard resumen

Un endpoint o pantalla con:

* Facturas emitidas.
* Facturas pendientes.
* Total pendiente de cobro.
* Total cobrado.
* Número de clientes.
* Últimas facturas.
* Últimos pagos.

Esto daría una visión de producto.

---

### 5.4. Mejorar diseño visual de PDFs

Los PDFs funcionan, pero se podrían mejorar con:

* Logo de empresa.
* Mejor maquetación.
* Colores corporativos.
* Numeración de página.
* Pie legal.
* Datos bancarios.

---

## 6. Trabajo futuro defendible

Como líneas futuras se pueden plantear:

* Factura electrónica.
* Firma digital.
* Código QR de verificación.
* Asientos manuales.
* Libro diario.
* Libro mayor.
* Balance de sumas y saldos.
* Facturas rectificativas.
* Envío de facturas por email.
* Gestión de proveedores y compras.
* Inventario.
* Roles avanzados.
* Auditoría avanzada.
* Multiidioma.
* Moneda configurable.
* Exportación contable.
* Integración bancaria.

---

## 7. Opinión técnica

El backend está en buen nivel para un TFG si el alcance se define correctamente.

La forma adecuada de presentarlo sería:

```txt
Sistema backend modular para la gestión de facturación, cobros y contabilidad básica en un entorno empresarial multiempresa.
```

No debería venderse como:

```txt
Software contable completo
Software homologado de facturación electrónica
ERP completo de producción
```

La clave es defenderlo como un MVP avanzado y extensible.

---

## 8. Prioridad de próximos pasos

Orden recomendado:

### Prioridad 1

```txt
README sólido
.env.example
Seed inicial
Tests mínimos
Validación de asientos cuadrados
```

### Prioridad 2

```txt
Swagger/OpenAPI
Documentación de arquitectura
Documentación de modelo de datos
Frontend mínimo
```

### Prioridad 3

```txt
Dashboard
Mejor diseño PDF
Facturas rectificativas
Asientos manuales
Libro diario/mayor
```

---

## 9. Conclusión

BenxCore tiene una base backend muy potente para un TFG.

El sistema ya demuestra:

* Modelado de dominio.
* Arquitectura modular.
* Seguridad básica.
* Persistencia relacional.
* Reglas de negocio.
* Ciclo de vida de facturas.
* Automatización contable.
* Generación documental.

Lo imprescindible ahora no es añadir muchas más funcionalidades, sino consolidar:

* Documentación.
* Tests.
* Instalación reproducible.
* Demo clara.
* Frontend mínimo.

Con eso, el proyecto puede quedar muy sólido para presentación y defensa.
