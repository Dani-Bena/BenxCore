# Frontend

## Objetivo

El backend de BenxCore es bastante completo, pero un backend solo (probado con Postman/PowerShell) es difícil de mostrar en una defensa. Este frontend es deliberadamente sencillo: una SPA en React que cubre el flujo completo — login, datos maestros (clientes, productos, series), facturación, pagos y descarga de documentos — usando directamente la API del backend.

No busca ser un diseño elaborado ni un ejercicio de arquitectura frontend. El objetivo es que cualquiera pueda seguir el ciclo completo de una factura desde el navegador sin tocar la terminal.

## Stack

- React 19 + TypeScript
- Vite como build tool y servidor de desarrollo
- Sin librería de rutas: la navegación entre pantallas es un simple `useState` con el nombre de la página activa (`App.tsx`)
- Sin gestor de estado externo: cada página pide sus propios datos a la API con `fetch`
- CSS plano (`App.css` / `index.css`), sin frameworks de componentes

## Cómo arrancar

```bash
cd frontend
npm install
npm run dev
```

Por defecto Vite levanta el frontend en `http://localhost:5173`. La URL del backend está fijada en `frontend/src/api.ts`:

```ts
export const API_URL = "http://localhost:3000";
```

Si el backend corre en otro puerto o host, hay que cambiar esa constante (no se usa variable de entorno todavía).

## Estructura

```
frontend/src/
├── api.ts              → helpers para llamar a la API (fetch, descarga de PDFs, formato de moneda/fecha)
├── types.ts            → tipos compartidos (Client, Product, Invoice, Payment, JournalEntry, User...)
├── App.tsx             → layout, sesión, navegación entre páginas
├── App.css / index.css → estilos
├── components/
│   └── Modal.tsx       → modal genérico (overlay + cierre con Escape o clic fuera)
├── assets/
│   ├── logo.png
│   └── hero.png
└── pages/
    ├── LoginPage.tsx
    ├── DashboardPage.tsx
    ├── ClientsPage.tsx
    ├── ProductsPage.tsx
    ├── SeriesPage.tsx
    ├── InvoicesPage.tsx
    └── UsersPage.tsx
```

## Autenticación y sesión

`LoginPage` llama a `POST /api/auth/login` y, si tiene éxito, `App.tsx` guarda el `token` y el `user` devueltos en `localStorage`. Mientras no haya token guardado, la aplicación siempre muestra `LoginPage`; si lo hay, se reconstruye la sesión al recargar la página leyendo `localStorage`.

El token se pasa como prop a cada página y se envía en la cabecera `Authorization: Bearer <token>` mediante `apiRequest()` (en `api.ts`). No hay refresco automático de token: si caduca, las peticiones empiezan a fallar con 401 y el usuario tendría que volver a iniciar sesión (esto está anotado como mejora pendiente).

## Navegación

`App.tsx` define las páginas posibles:

```ts
type Page = "dashboard" | "clients" | "products" | "series" | "invoices" | "users";
```

La barra lateral muestra siempre: Dashboard, Clientes, Productos, Series, Facturas. La opción **Usuarios** solo se muestra si `user.role === "ADMIN"` (ver `usuarios.md` para el porqué). Si un usuario sin ese rol llegara de alguna forma a `page === "users"`, se le muestra el Dashboard en su lugar — el control real de permisos está en el backend, esto es solo para que la interfaz no quede en blanco.

## Páginas

### LoginPage

Formulario de email/contraseña contra `/api/auth/login`. Viene precargado con las credenciales del usuario demo (`daniel@test.com` / `12345678`) para agilizar las pruebas durante el desarrollo y la defensa.

### DashboardPage

Carga en paralelo clientes, productos, series y facturas, y calcula en el cliente:

- Total facturado, total cobrado y total pendiente de cobro.
- Número de facturas pendientes (`ISSUED`, `PARTIALLY_PAID`, `OVERDUE`), borradores y pagadas.
- Clientes, productos y series activos.
- Las 5 facturas más recientes.

Las tarjetas de "Facturas pendientes" y "Borradores" son clicables: llevan a la pantalla de Facturas con un filtro de estado ya aplicado (`onNavigateToInvoices`).

### ClientsPage / ProductsPage / SeriesPage

Las tres siguen el mismo patrón: tabla con los registros (con opción de incluir los inactivos), formulario para crear/editar en un `Modal`, y acción de desactivar (soft delete). `ClientsPage` incluye además un campo de búsqueda para filtrar por nombre/NIF en el listado.

### InvoicesPage

Es la pantalla más grande del frontend (cubre prácticamente todo el ciclo de vida de una factura):

- Listado de facturas con buscador (por cliente o número de factura) y filtros rápidos por estado (Todas, Borradores, Pendientes de cobro, Pagadas, Canceladas) — estos filtros son los mismos que puede activar el Dashboard al pulsar una tarjeta.
- Creación de facturas en borrador (cliente, serie, y una línea con producto/cantidad/precio/descuento/IVA).
- Emisión de la factura (`POST /api/invoices/:id/issue`).
- Registro de pagos parciales o totales sobre una factura emitida.
- Descarga del PDF de factura y del comprobante de cada pago (`downloadPdf()` en `api.ts`, que convierte la respuesta en blob y dispara la descarga).
- Vista del detalle de la factura, incluyendo los asientos contables generados (`journalEntries`), mostrando si cada asiento está cuadrado (`entryBalance()` compara la suma de debe y haber).

En la práctica, esta pantalla hace de "vista de contabilidad" indirecta: no hay una sección de contabilidad independiente todavía, pero los asientos de cada factura son visibles desde aquí.

### UsersPage

Solo accesible para `ADMIN`. Lista los usuarios de la empresa (activos e inactivos), y permite crear, editar (nombre, email, rol, estado) y desactivar usuarios. Ver `usuarios.md` para las reglas que aplica el backend.

## Helpers de `api.ts`

- `apiRequest<T>(path, token, options)`: wrapper sobre `fetch` que añade el header de autenticación, serializa JSON y lanza un `Error` con el mensaje devuelto por la API si la respuesta no es `ok`.
- `downloadPdf(path, token, filename)`: pide un PDF, lo convierte en blob y fuerza la descarga en el navegador.
- `money(value)`: formatea números como `"1234.56 €"`.
- `formatDate(value)`: formatea fechas en formato `es-ES`.

## Limitaciones actuales / pendientes

- La URL del backend está hardcodeada (`API_URL` en `api.ts`), no se usa `.env` en el frontend.
- No hay manejo de expiración de sesión: si el token caduca, simplemente empiezan a fallar las peticiones.
- Los mensajes de error/aviso se muestran en un único `message` global en la barra lateral, sin distinguir éxito de error.
- No hay tests de frontend (los tests automáticos del proyecto son solo de backend, ver `backend/tests/`).
- No existe una pantalla de contabilidad independiente; los asientos solo se ven dentro del detalle de cada factura.
