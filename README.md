# BenxCore

> A full-stack ERP application for managing core business operations, including customers, products, invoicing, payments, accounting and document generation.

BenxCore is a full-stack business management application built as part of my **Web Application Development (DAW)** studies.

The project goes beyond a basic CRUD application by connecting different areas of a business into a single workflow: from managing customers and products to issuing invoices, recording payments, generating PDFs and automatically creating the corresponding accounting entries.

The main goal of BenxCore is to explore the architecture and business logic behind a real-world ERP while building a modular and maintainable full-stack application.

---
## 🖥️ Preview

### Dashboard

![BenxCore Dashboard](docs/dashboard.jpg)

BenxCore provides a centralized dashboard with an overview of invoicing, payments, outstanding balances, customers and products.

## 🛠 Tech Stack

### Backend

![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod
- JWT + bcrypt
- PDFKit
- Vitest + Supertest
- Docker / Docker Compose

### Frontend

![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)

- React 19
- TypeScript
- Vite

---

## ✨ Key Features

### 🔐 Authentication & Users

- JWT-based authentication
- Company and administrator registration
- User management
- Role system:
  - `ADMIN`
  - `ACCOUNTANT`
  - `USER`
- Secure password hashing with bcrypt

### 👥 Customer Management

- Create, read, update and delete customers
- Soft delete
- Tax ID / NIF duplicate validation
- Customer fiscal information management

### 📦 Products & Services

- Product and service management
- Pricing and tax information
- Soft delete support

### 🧾 Invoicing

- Invoice drafts
- Sequential invoice numbering
- Configurable invoice series
- Automatic line calculations
- Discounts and VAT calculations
- Automatic invoice totals
- Fiscal snapshots of issuer and customer when an invoice is issued
- Invoice lifecycle management

### 💳 Payments

- Partial payments
- Full payments
- Payment history
- Automatic invoice status updates
- Payment receipt generation

### 🔄 Invoice, Payment & Accounting Flow

![BenxCore Invoice and Accounting](docs/invoice-accounting.jpg)

Payments are directly connected to the accounting system. When an invoice is issued or a payment is registered, BenxCore automatically generates the corresponding accounting entries while keeping track of the invoice balance and payment history.

### 📚 Automatic Accounting

BenxCore automatically generates **double-entry accounting entries** when relevant business events occur.

For example:

```text
Invoice issued
      ↓
Accounting entry generated

Payment registered
      ↓
Payment accounting entry generated
```

This connects invoicing and payments directly with the accounting system instead of treating them as isolated modules.

### 📄 PDF Generation

- Invoice PDFs
- Payment receipt PDFs
- Company fiscal information
- Customer information
- Company logo support

### 🔎 Audit System

Relevant operations are recorded through an `AuditLog`, providing traceability across the application.

### 🧪 Automated Testing

Critical backend flows are tested using:

- Vitest
- Supertest

Tests cover important business logic and API behaviour.

---

## 🏗 Architecture

The backend follows a modular structure where each domain contains its own routes, validation schemas and business logic.

```text
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

A typical module follows this structure:

```text
src/modules/clients/

├── clients.routes.ts
├── clients.schemas.ts
└── clients.service.ts
```

Where:

```text
routes   → HTTP / Express layer
schemas  → validation with Zod
service  → business logic and Prisma data access
```

This structure keeps the backend separated by business domain and makes it easier to extend the application with new modules.

The frontend is a React SPA located in `frontend/`, organised around the main sections of the ERP with shared components and API utilities.

---

## 🔄 Application Flow

One of the main goals of BenxCore is to connect the different modules into a complete business workflow.

```text
Authentication
      ↓
Company configuration
      ↓
Customers & Products
      ↓
Invoice Draft
      ↓
Invoice Issued
      ↓
Accounting Entry
      ↓
Invoice PDF
      ↓
Partial / Full Payment
      ↓
Payment Accounting Entry
      ↓
Payment Receipt
```

This allows the entire process to be managed through the frontend without relying on Postman or manual database operations.

---

## 🚀 Getting Started

### Requirements

Make sure you have installed:

- Node.js
- npm
- Docker
- Docker Compose

---

### 1. Start PostgreSQL

The repository includes a `docker-compose.yml` file for the database.

```bash
docker compose up -d
```

By default, PostgreSQL runs on:

```text
localhost:5432
```

You can also use your own PostgreSQL instance by changing `DATABASE_URL`.

---

### 2. Start the Backend

```bash
cd backend
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Then apply the database migrations:

```bash
npx prisma migrate deploy
```

Optionally populate the database with demo data:

```bash
npm run seed
```

Start the development server:

```bash
npm run dev
```

The API runs by default at:

```text
http://localhost:3000
```

---

### 3. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs by default at:

```text
http://localhost:5173
```

---

## 🔑 Environment Variables

Backend environment variables are defined in:

```text
backend/.env
```

Use `backend/.env.example` as a template.

Example:

```env
PORT=3000
NODE_ENV=development

DATABASE_URL="postgresql://user:password@localhost:5432/benxcore_db?schema=public"

JWT_SECRET="replace-with-your-secret"
JWT_EXPIRES_IN="7d"
```

> `.env` is not committed to the repository.

---

## 🧪 Useful Commands

### Backend

```bash
npm run dev
```

Start the backend in development mode.

```bash
npm run build
```

Compile TypeScript.

```bash
npm start
```

Run the compiled application.

```bash
npm run typecheck
```

Run TypeScript type checking.

```bash
npm test
```

Run automated tests.

```bash
npm run seed
```

Populate the database with demo data.

```bash
npx prisma migrate dev
```

Create and apply migrations during development.

```bash
npx prisma migrate deploy
```

Apply existing migrations.

### Frontend

```bash
npm run dev
```

Start the Vite development server.

```bash
npm run build
```

Create a production build.

```bash
npm run preview
```

Preview the production build.

```bash
npm run lint
```

Run the linter.

---

## 📖 Documentation

Additional technical documentation is available in [`docs/`](docs/).

| Document | Description |
|---|---|
| [`requisitos.md`](docs/requisitos.md) | Initial project requirements |
| [`base-datos.md`](docs/base-datos.md) | Database model and entities |
| [`backend-overview.md`](docs/backend-overview.md) | Backend architecture and design decisions |
| [`api-endpoints.md`](docs/api-endpoints.md) | API endpoint reference |
| [`facturacion.md`](docs/facturacion.md) | Invoice and payment lifecycle |
| [`contabilidad.md`](docs/contabilidad.md) | Automatic accounting system |
| [`pdf.md`](docs/pdf.md) | Invoice and payment PDF generation |
| [`usuarios.md`](docs/usuarios.md) | Users and roles |
| [`frontend.md`](docs/frontend.md) | Frontend architecture and application flow |
| [`tareas.md`](docs/tareas.md) | Development progress |
| [`tfg-status-and-roadmap.md`](docs/tfg-status-and-roadmap.md) | Project status and technical roadmap |

> Some internal documentation is currently written in Spanish.

---

## 🗺 Roadmap

BenxCore already supports the complete core workflow from authentication to invoicing, payments and accounting.

Future improvements include:

- [ ] Formal validation of balanced accounting entries
- [ ] Complete role-based permissions across all modules
- [ ] Credit notes / corrective invoices
- [ ] Manual accounting entries
- [ ] General journal
- [ ] General ledger
- [ ] Automatic overdue invoice management
- [ ] Swagger / OpenAPI documentation
- [ ] Further frontend improvements
- [ ] Expanded automated test coverage

---

## 🎯 Project Goals

BenxCore is primarily a learning and portfolio project.

Its purpose is to apply concepts from my Web Application Development studies to a larger application involving:

- Full-stack architecture
- REST API design
- Relational databases
- Authentication and authorisation
- Business logic
- Accounting workflows
- Automated testing
- Docker-based development environments
- Maintainable and modular code

The project is actively evolving as I continue learning and implementing new features.

---

## 👨‍💻 Author

**Daniel Benavides**

Full-Stack Developer in training · Web Application Development (DAW)

[LinkedIn](https://www.linkedin.com/in/danielbenavides-dev/) · [GitHub](https://github.com/Dani-Bena)

---

⭐ If you find the project interesting, feel free to explore the repository and its documentation.
