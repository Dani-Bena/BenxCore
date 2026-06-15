# Estado del TFG y roadmap técnico — BenxCore

## 0. Actualización (15/06/2026)

Este documento se escribió cuando el backend ya estaba avanzado pero antes de tener frontend, tests y algunas mejoras de PDF/errores. Desde entonces se ha avanzado bastante en varios de los puntos que aquí se marcaban como "imprescindibles" o "muy recomendables":

* Hay **tests automáticos** (`backend/tests/`) cubriendo el flujo de facturación completo y la gestión de usuarios.
* Hay **manejo global de errores** (`middleware/error.middleware.ts`).
* Hay un **frontend funcional** (React + Vite) que cubre login, dashboard, clientes, productos, series, facturas/pagos/PDFs y gestión de usuarios. Ver `frontend.md`.
* Los **PDFs ahora incluyen el logo de empresa** si existe (`utils/pdf-logo.ts`), y se centralizó el estilo (`utils/pdf-style.ts`).
* Se ha añadido un **módulo de usuarios y roles** (`ADMIN`, `ACCOUNTANT`, `USER`, con `MANAGER`/`VIEWER` reservados). Ver `usuarios.md`.

El resto del documento se mantiene tal cual se escribió en su momento (sirve como registro de cómo se vio el proyecto en esa fase), con anotaciones puntuales donde un punto ya está resuelto. La sección 8 (prioridades) sí se ha actualizado para reflejar lo que queda.

---

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

### 2.7. Multiusuario con roles

Cada empresa puede tener varios usuarios con distintos roles (`ADMIN`, `ACCOUNTANT`, `USER`), gestionados desde la propia aplicación. El sistema garantiza que siempre haya al menos un `ADMIN` por empresa, y las altas/bajas/ediciones quedan auditadas igual que el resto de entidades.

Esto refuerza el argumento de "no es solo un CRUD": hay reglas de negocio también en cómo se administra el propio sistema.

---

## 3. Riesgos actuales

### 3.1. Falta de tests

**Resuelto parcialmente.** Ya existen tests automáticos (`backend/tests/invoice-flow.test.ts`, `backend/tests/users.test.ts`) que cubren el ciclo completo de una factura (borrador → emisión → pago → asientos) y la gestión de usuarios con roles. Quedaría bien ampliar la cobertura a clientes, productos y series, pero el riesgo principal que describía este punto ya está mitigado.

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

**Resuelto en parte.** Ahora cada empresa puede tener varios usuarios (`ADMIN`, `ACCOUNTANT`, `USER`) gestionados desde `/api/users` y desde el frontend (ver `usuarios.md`). Lo que falta es que esos roles tengan permisos realmente distintos en el resto de módulos: hoy, fuera de la gestión de usuarios, cualquier usuario autenticado de la empresa puede hacer lo mismo. Los roles `MANAGER` y `VIEWER` existen en el modelo pero todavía no tienen comportamiento propio.

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

### 4.4. Tests mínimos — hecho

`backend/tests/invoice-flow.test.ts` cubre el flujo crítico: login, factura en borrador, emisión, numeración, pagos parciales y totales, y generación de asientos. `backend/tests/users.test.ts` cubre alta de usuarios, roles y restricciones de `ADMIN`.

Pendiente (no bloqueante): tests específicos de clientes y productos (alta, duplicados de NIF/código, soft delete).

---

### 4.5. Validar asientos cuadrados

Antes de guardar un asiento contable, sería muy recomendable comprobar:

```txt
totalDebe = totalHaber
```

Esto es muy importante conceptualmente.

Aunque ahora generemos los asientos automáticamente bien, añadir una validación formal mejora mucho la calidad del módulo contable.

---

### 4.6. Manejo global de errores — hecho

`middleware/error.middleware.ts` centraliza la respuesta de errores: los errores de negocio (`AppError`) devuelven su código y mensaje, y cualquier excepción no controlada se registra en consola y responde `500`. Se mantiene además la validación específica por servicio (Zod en rutas, errores de dominio en servicios).

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

### 5.1. Frontend mínimo — hecho

Hay un frontend en React + Vite con login, dashboard, clientes, productos, series, facturas (con detalle, emisión, pagos, descarga de PDF y comprobantes) y gestión de usuarios para `ADMIN`. Cubre el flujo completo de demo. Detalle en `frontend.md`.

Pendiente de pulir: una sección de contabilidad independiente (hoy los asientos solo se ven dentro del detalle de cada factura) y mejorar la gestión de mensajes de error/aviso en la interfaz.

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

### 5.4. Mejorar diseño visual de PDFs — parcialmente hecho

Ya se añadió soporte de **logo de empresa** (`utils/pdf-logo.ts`) y se centralizó el estilo tipográfico (`utils/pdf-style.ts`) para que factura y comprobante sean coherentes.

Sigue pendiente:

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

Esta sección sí está actualizada a 15/06/2026. La mayoría de lo que antes era "Prioridad 1" ya está hecho (README, `.env.example`, seed, tests mínimos, frontend, gestión de usuarios). Lo que queda:

### Prioridad 1

```txt
Validación de asientos cuadrados (debe = haber) antes de guardarlos
Documentación de modelo de datos al día (hecho en docs/base-datos.md)
Guía de instalación paso a paso
```

### Prioridad 2

```txt
Swagger/OpenAPI
Documentación de arquitectura con diagramas de flujo
Sección de contabilidad en el frontend
Permisos reales por rol (MANAGER/VIEWER) en el resto de módulos
```

### Prioridad 3

```txt
Facturas rectificativas
Asientos manuales
Libro diario/mayor, balance de sumas y saldos
Control automático de facturas vencidas (OVERDUE)
Mejoras visuales adicionales de PDF (numeración de página, pie legal, datos bancarios)
```

---

## 9. Conclusión

BenxCore tiene una base sólida para un TFG, y a 15/06/2026 ya no es solo "una base backend potente": es un sistema completo de extremo a extremo.

El sistema ya demuestra:

* Modelado de dominio.
* Arquitectura modular.
* Seguridad básica y gestión de usuarios con roles.
* Persistencia relacional.
* Reglas de negocio.
* Ciclo de vida de facturas.
* Automatización contable.
* Generación documental.
* Frontend funcional para demostrar todo lo anterior.
* Tests automáticos de los flujos críticos.

Lo que queda ya no es "imprescindible para defender el proyecto", sino mejoras que lo acercan más a un ERP real: validación formal de asientos cuadrados, permisos por rol en todos los módulos, facturas rectificativas, libro diario/mayor y Swagger. Son buenas líneas de trabajo futuro para la memoria, pero ninguna bloquea ya una demo o una defensa.
