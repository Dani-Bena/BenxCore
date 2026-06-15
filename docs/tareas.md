# Tareas

Lista de tareas que voy llevando del proyecto. Las primeras secciones son las tareas iniciales (ya cerradas), y debajo voy añadiendo lo que va surgiendo a medida que avanza el backend, el frontend y la documentación.

## Preparación

- [x] Crear repositorio en GitHub
- [x] Crear estructura inicial
- [x] Crear documentación inicial
- [x] Configurar backend
- [x] Configurar frontend
- [x] Diseñar base de datos
- [x] Crear autenticación
- [x] Crear módulo de clientes
- [x] Crear módulo de productos
- [x] Crear módulo de facturas

## Backend — funcionalidades

- [x] Registro de empresa + usuario administrador
- [x] Login y middleware de autenticación (JWT)
- [x] CRUD de empresa (datos fiscales)
- [x] CRUD de clientes (soft delete, control de duplicados de NIF)
- [x] CRUD de productos/servicios (soft delete, código único)
- [x] Series de facturación con numeración correlativa
- [x] Facturas en borrador con cálculo automático de líneas, IVA y totales
- [x] Emisión de facturas (numeración, snapshot fiscal, asiento contable)
- [x] Registro de pagos parciales/totales y cambio automático de estado
- [x] Asientos contables automáticos (emisión y cobro)
- [x] Consulta de cuentas y asientos contables
- [x] PDF de factura
- [x] PDF de comprobante de pago
- [x] Logo de empresa en los PDFs (`utils/pdf-logo.ts`)
- [x] Auditoría (`AuditLog`) en clientes, productos, facturas, pagos y usuarios
- [x] Middleware global de manejo de errores (`error.middleware.ts`)
- [x] Módulo de gestión de usuarios y roles (`ADMIN`, `ACCOUNTANT`, `USER`)
- [x] Tests automáticos de los flujos principales (`backend/tests/`)
- [ ] Validación formal de que cada asiento contable está cuadrado (debe = haber) antes de guardarlo
- [ ] Control automático de facturas vencidas (estado `OVERDUE`)
- [ ] Facturas rectificativas (el modelo ya tiene `CORRECTIVE` y `rectifiesInvoiceId`, falta el flujo)
- [ ] Asientos manuales (`source = MANUAL`)
- [ ] Libro diario / libro mayor / balance de sumas y saldos
- [ ] Roles `MANAGER` y `VIEWER` con permisos reales (hoy solo existen en el enum)
- [ ] Documentación interactiva con Swagger/OpenAPI

## Frontend

- [x] Configurar proyecto (Vite + React + TypeScript)
- [x] Pantalla de login
- [x] Layout general con barra lateral y navegación por rol
- [x] Dashboard con resumen de facturación, cobros y datos maestros
- [x] Pantalla de clientes (alta, edición, baja, filtro de búsqueda)
- [x] Pantalla de productos/servicios
- [x] Pantalla de series de facturación
- [x] Pantalla de facturas (borrador, emisión, pagos, descarga de PDF/comprobante)
- [x] Pantalla de usuarios (solo visible para rol `ADMIN`)
- [x] Componente modal reutilizable
- [x] Favicon y estilos generales (`App.css`, `index.css`)
- [ ] Pantalla/sección de contabilidad (consulta de asientos desde el frontend)
- [ ] Mensajes de error más consistentes (hoy se muestran como texto suelto en `message`)

## Documentación

- [x] `README.md` principal con stack, funcionalidades y arquitectura
- [x] `.env.example`
- [x] Seed de datos de demo (`prisma/seed.ts`)
- [x] Documentación de facturación, contabilidad y PDFs
- [x] Documentación del modelo de base de datos actualizada
- [x] Documentación del módulo de usuarios y roles
- [x] Documentación del frontend
- [x] Documento de estado del TFG y roadmap
- [ ] Documento de arquitectura con diagramas (flujo de factura, pago, asiento)
- [ ] Guía de instalación paso a paso (PostgreSQL, migraciones, seed, arranque)

## Antes de la defensa

- [ ] Revisar que el seed cubre un escenario de demo completo (factura emitida + pagada + asiento)
- [ ] Repasar mensajes de la API en inglés vs textos del frontend en español (mezcla actual)
- [ ] Preparar guion de demo: login → cliente → producto → factura → emisión → pago → PDFs → contabilidad
