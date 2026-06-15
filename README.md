# BenxCore

BenxCore es un ERP ligero para la gestión empresarial básica: empresas, usuarios, clientes, productos/servicios, facturación, pagos, contabilidad automática y generación documental en PDF.

El proyecto está desarrollado como Trabajo de Fin de Grado y se centra en construir una arquitectura backend modular, mantenible y extensible, con un frontend que permite recorrer todo el flujo (login → clientes → productos → facturas → emisión → pagos → PDFs → contabilidad) sin necesidad de usar Postman ni la terminal.

## Stack tecnológico

**Backend**

- Node.js + Express
- TypeScript
- Prisma ORM + PostgreSQL
- Zod (validación)
- JWT + bcrypt (autenticación)
- PDFKit (generación de PDFs)
- Vitest + Supertest (tests)
- Docker / Docker Compose (base de datos)

**Frontend**

- React 19 + TypeScript
- Vite

## Funcionalidades principales

- Autenticación con JWT.
- Registro de empresa y usuario administrador.
- Gestión de datos fiscales de empresa.
- Gestión de usuarios y roles por empresa (`ADMIN`, `ACCOUNTANT`, `USER`).
- CRUD de clientes (con soft delete y control de duplicados de NIF).
- CRUD de productos y servicios.
- Series de facturación con numeración correlativa.
- Creación de facturas en borrador, con cálculo automático de líneas, descuentos, IVA y totales.
- Emisión de facturas con numeración correlativa y snapshot fiscal de emisor y cliente.
- Registro de pagos parciales y completos, con cambio automático de estado de la factura.
- Generación automática de asientos contables (partida doble) al emitir y al cobrar.
- Consulta de cuentas contables y asientos.
- PDF de factura y PDF de comprobante de pago (con logo de empresa si está configurado).
- Auditoría de operaciones relevantes (`AuditLog`).
- Soft delete en las entidades principales.
- Frontend con dashboard, gestión de clientes/productos/series/facturas/usuarios.
- Tests automáticos de los flujos críticos.

## Arquitectura

El backend está organizado por módulos, cada uno con su capa de rutas, validación y lógica de negocio:

```txt
backend/src/modules/
├── auth
├── company
├── users
├── clients
├── products
├── invoice-series
├── invoices
└── accounting
```

Patrón habitual dentro de un módulo:

```txt
src/modules/clients/
├── clients.routes.ts    → capa HTTP (Express)
├── clients.schemas.ts   → validación con Zod
└── clients.service.ts   → lógica de negocio + acceso a datos (Prisma)
```

El frontend es una SPA separada en `frontend/`, organizada por páginas (una por sección del menú) más algunos componentes y helpers compartidos. Ver `docs/frontend.md` para más detalle.

## Puesta en marcha

### 1. Base de datos

El repositorio incluye un `docker-compose.yml` con un contenedor de PostgreSQL:

```bash
docker compose up -d
```

Esto levanta PostgreSQL en `localhost:5432` con la base de datos, usuario y contraseña definidos en `docker-compose.yml`. Si usas otra instancia de PostgreSQL, ajusta `DATABASE_URL` en consecuencia.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # y ajusta los valores según tu entorno
npx prisma migrate deploy
npm run seed            # crea empresa, usuario admin y datos de demo
npm run dev
```

El servidor arranca por defecto en `http://localhost:3000`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación se sirve por defecto en `http://localhost:5173` y apunta al backend en `http://localhost:3000` (configurado en `frontend/src/api.ts`).

### Usuario de demo

El seed crea una empresa de demo con un usuario administrador:

```txt
email:    daniel@test.com
password: 12345678
```

## Variables de entorno

Definidas en `backend/.env` (ver `backend/.env.example`):

```txt
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://usuario:password@localhost:5432/benxcore_db?schema=public"

# JWT
JWT_SECRET="cambia-este-secreto-en-produccion"
JWT_EXPIRES_IN="7d"
```

`backend/.env` no se versiona; `backend/.env.example` sirve como plantilla.

## Comandos útiles

**Backend** (`cd backend`)

```bash
npm run dev         # arrancar en desarrollo (tsx watch)
npm run build       # compilar TypeScript
npm start           # arrancar el build compilado
npm run typecheck   # comprobar tipos sin compilar
npm run seed        # poblar la base de datos con datos de demo
npm test            # ejecutar tests (vitest)
npx prisma migrate dev      # crear/aplicar migraciones en desarrollo
npx prisma migrate deploy   # aplicar migraciones existentes
```

**Frontend** (`cd frontend`)

```bash
npm run dev       # servidor de desarrollo (Vite)
npm run build     # build de producción
npm run preview   # previsualizar el build
npm run lint      # linter
```

## Documentación

Toda la documentación funcional vive en `docs/`:

- [`requisitos.md`](docs/requisitos.md) — requisitos iniciales del proyecto.
- [`base-datos.md`](docs/base-datos.md) — modelo de datos y entidades.
- [`backend-overview.md`](docs/backend-overview.md) — visión general del backend, módulos y decisiones de diseño.
- [`api-endpoints.md`](docs/api-endpoints.md) — referencia de endpoints de la API.
- [`facturacion.md`](docs/facturacion.md) — ciclo de vida de facturas y pagos.
- [`contabilidad.md`](docs/contabilidad.md) — contabilidad automática y asientos.
- [`pdf.md`](docs/pdf.md) — generación de PDFs de factura y comprobantes.
- [`usuarios.md`](docs/usuarios.md) — gestión de usuarios y roles.
- [`frontend.md`](docs/frontend.md) — frontend (estructura, páginas, flujo).
- [`tareas.md`](docs/tareas.md) — lista de tareas y progreso.
- [`tfg-status-and-roadmap.md`](docs/tfg-status-and-roadmap.md) — estado del proyecto y roadmap técnico.

## Estado del proyecto

El backend implementa un flujo completo: registro/login → configuración de empresa y usuarios → clientes y productos → series de facturación → facturas en borrador → emisión → asientos contables → PDF de factura → pagos → comprobantes de pago. El frontend cubre ese mismo flujo de extremo a extremo.

Quedan como trabajo futuro (detallado en `docs/tfg-status-and-roadmap.md`): validación formal de asientos cuadrados, permisos diferenciados por rol en todos los módulos, facturas rectificativas, asientos manuales, libro diario/mayor, control automático de facturas vencidas y documentación interactiva con Swagger/OpenAPI.
