# BenxCore

BenxCore es un prototipo backend de ERP ligero orientado a la gestión empresarial básica: clientes, productos/servicios, facturación, pagos, contabilidad automática y generación documental en PDF.

El proyecto está desarrollado como parte de un Trabajo de Fin de Grado y se centra en construir una arquitectura backend modular, mantenible y extensible.

## Stack tecnológico

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod
- JWT
- bcrypt
- PDFKit
- Docker / Docker Compose

## Funcionalidades principales

- Autenticación con JWT.
- Registro de empresa y usuario administrador.
- Gestión de datos fiscales de empresa.
- CRUD de clientes.
- CRUD de productos y servicios.
- Series de facturación.
- Creación de facturas en borrador.
- Emisión de facturas con numeración correlativa.
- Snapshot fiscal de emisor y cliente.
- Registro de pagos parciales y completos.
- Cambio automático de estados de factura.
- Generación automática de asientos contables.
- Consulta de cuentas y asientos.
- PDF de factura.
- PDF de comprobante de pago.
- Auditoría de operaciones relevantes.
- Soft delete en entidades principales.

## Arquitectura

El backend está organizado por módulos:

```txt
src/modules/
├── auth
├── company
├── clients
├── products
├── invoice-series
├── invoices
└── accounting