# BenxCore explicado para alguien que no programa

## Qué es esto

BenxCore es una aplicación web que he hecho como Trabajo de Fin de Grado. Es un programa para gestionar una empresa pequeña o un autónomo: llevar los clientes, los productos que vendes, hacer facturas, cobrarlas, y que la contabilidad se haga sola. Algo así como un mini-ERP (Enterprise Resource Planning, que es el nombre técnico que se le da a los programas de gestión empresarial tipo SAP, pero sin complicarse la vida a ese nivel).

La idea es que una persona se registra, crea su empresa, y a partir de ahí puede hacer todo el ciclo de facturación desde el navegador: dar de alta clientes, meter sus productos o servicios, crear facturas, emitirlas con número oficial, cobrarlas, descargar el PDF de la factura... y por detrás, el sistema se encarga de llevar la contabilidad automáticamente.

---

## Por qué existe

Es mi proyecto de fin de carrera. Lo elegí porque me parecía más interesante que hacer un CRUD típico (una app que solo crea, lee, actualiza y borra cosas en una base de datos sin más). Quería algo que tuviera reglas de negocio reales, que se pareciera a cómo funcionan las cosas de verdad en una empresa. Y la facturación es uno de esos problemas que parece simple ("haz una factura, ponle un número, cobra") pero cuando te metes tiene muchas reglas y detalles que hay que respetar.

---

## Cómo está montado (sin entrar en código)

La app tiene dos partes:

### El backend (la parte invisible)

Es como la cocina de un restaurante: tú no la ves, pero es donde pasa todo lo importante. Es un servidor que:

- Guarda todos los datos en una base de datos (PostgreSQL, que es una base de datos relacional, o sea, las cosas están organizadas en tablas con filas y columnas, como un Excel pero mucho más potente).
- Tiene "reglas" que impiden que pases cosas raras (por ejemplo, no puedes cobrar una factura que todavía no has emitido, o no puedes cobrar más de lo que debe el cliente).
- Genera los PDFs de las facturas.
- Gestiona quién puede entrar y qué puede hacer cada uno.
- Lleva la contabilidad automáticamente.

### El frontend (lo que ves en el navegador)

Es como la sala del restaurante: es lo que ve el usuario. Una página web con:

- Una pantalla de login (y ahora también de registro).
- Un panel principal con un resumen de cómo va la empresa (cuánto has facturado, cuánto te deben, cuántas facturas tienes pendientes...).
- Pantallas para gestionar clientes, productos, series de facturación, facturas y usuarios.

Las dos partes se hablan entre sí: cuando tú pulsas "Crear factura" en el navegador, el frontend le manda un mensaje al backend diciéndole "oye, crea esta factura con estos datos", el backend lo procesa, lo guarda en la base de datos, y le responde al frontend con la factura creada para que te la muestre.

---

## Qué puede hacer la aplicación

### Registro y login

Cualquiera puede registrarse: pone el nombre de su empresa, su nombre, un email y una contraseña, y se le crea una empresa con un usuario administrador. A partir de ahí puede invitar a más gente (contables, empleados...) desde dentro de la aplicación.

### Gestionar clientes

Puedes dar de alta clientes con todos sus datos: razón social, nombre comercial, CIF/NIF, dirección, email, teléfono, persona de contacto, condiciones de pago... Básicamente toda la información que necesitas para poder hacerle una factura. También puedes "desactivar" un cliente si ya no trabajas con él, pero sin borrarlo (porque puede tener facturas antiguas asociadas).

### Gestionar productos y servicios

Puedes crear un catálogo con lo que vendes: servicios de consultoría, desarrollo web, venta de productos físicos, lo que sea. Cada producto tiene su precio, su IVA, su código interno... Cuando luego hagas una factura, puedes seleccionar un producto del catálogo y se te rellena todo automáticamente.

### Series de facturación

Esto es algo que mucha gente no sabe, pero las facturas en España tienen que llevar un número correlativo (F2026-000001, F2026-000002...). No puedes poner el número que te dé la gana. Las series controlan esto: defines un prefijo (por ejemplo "F2026-") y el sistema va numerando automáticamente cada factura que emites.

### Crear y emitir facturas

Aquí está la chicha del proyecto. Una factura pasa por varias fases:

1. **Borrador**: la creas, le pones el cliente, los conceptos (líneas de factura), cantidades, precios, descuentos, IVA... Puedes cambiarla tantas veces como quieras. El sistema calcula automáticamente los totales.

2. **Emisión**: cuando está lista, la "emites". Esto es como sellarla oficialmente. En ese momento:
   - Se le asigna un número oficial correlativo (F2026-000001).
   - Se le pone la fecha de emisión.
   - Se "congela" una foto de los datos fiscales de tu empresa y del cliente dentro de la factura. Esto es importante: si dentro de 6 meses cambias la dirección de tu empresa, las facturas que ya emitiste siguen teniendo la dirección antigua, porque así tiene que ser legalmente.
   - Ya no se puede modificar. Una factura emitida es un documento oficial.

3. **Cobro**: una vez emitida, puedes ir registrando los pagos que te hace el cliente. Pueden ser parciales (el cliente te paga la mitad ahora y la otra mitad el mes que viene) o completos. El sistema controla que no cobres más de lo que te deben y va actualizando el estado automáticamente:
   - Si te pagan una parte: "Parcialmente pagada".
   - Si te pagan todo: "Pagada".

### Descargar PDFs

Puedes descargar dos tipos de documentos:

- **PDF de factura**: el documento oficial con los datos del emisor, del cliente, las líneas, el IVA, los totales... Es lo que le mandarías al cliente.
- **Comprobante de pago**: un justificante por cada cobro que registras. Si una factura se cobra en dos pagos, hay dos comprobantes distintos.

### Contabilidad automática

Esto es probablemente lo que más me costó hacer y de lo que estoy más contento. Cuando emites una factura o cobras un pago, el sistema genera automáticamente los "asientos contables". Sin entrar en muchos detalles de contabilidad, un asiento es un registro que dice "ha entrado dinero por aquí y ha salido por allá", y tiene que cuadrar siempre (lo que entra = lo que sale, que es la regla de la "partida doble" que llevan usando los contables desde el siglo XV).

Por ejemplo, cuando emites una factura de 1.210 euros (1.000 de base + 210 de IVA), el sistema apunta automáticamente:

- El cliente nos debe 1.210 euros (cuenta 430 - Clientes).
- Hemos ganado 1.000 euros por el servicio (cuenta 705 - Prestaciones de servicios).
- Debemos 210 euros a Hacienda por el IVA (cuenta 477 - IVA repercutido).

Y cuando el cliente te paga:

- Entran 1.210 euros en el banco (cuenta 572 - Bancos).
- El cliente ya no nos debe nada (se cancela la cuenta 430).

Todo esto pasa solo, sin que el usuario tenga que saber nada de contabilidad. El sistema usa las cuentas del Plan General Contable español (que es el estándar que usan todas las empresas en España).

### Gestión de usuarios y roles

El administrador de una empresa puede crear más usuarios: contables, empleados... Cada uno con su propio email y contraseña. Hay distintos roles:

- **ADMIN**: puede hacer todo, incluyendo gestionar otros usuarios.
- **ACCOUNTANT**: puede usar toda la aplicación pero no gestionar usuarios.
- **USER**: igual que ACCOUNTANT (de momento).

Una regla importante: siempre tiene que quedar al menos un administrador activo. No puedes borrar o degradar al último admin, porque entonces nadie podría gestionar los usuarios y la empresa se quedaría "bloqueada".

### Dashboard

Al entrar ves un panel con un resumen de todo:

- Total facturado, total cobrado, total pendiente de cobro.
- Cuántas facturas están pendientes, cuántas pagadas, cuántos borradores.
- Cuántos clientes, productos y series activas tienes.
- Las 5 últimas facturas.

Es como el cuadro de mandos de un coche pero para tu empresa.

### Auditoría

Todo lo que se hace queda registrado: quién creó qué factura, quién la emitió, quién registró un pago, quién cambió los datos de un cliente, quién creó un usuario... Es como tener cámaras de seguridad pero para los datos. Si alguna vez alguien pregunta "quién hizo esto y cuándo", se puede consultar.

---

## Qué tiene de especial frente a un proyecto "normalito"

Si lo comparo con lo que suele ser un TFG típico de programación (una app de tareas, un blog, una tienda online sencilla), BenxCore se diferencia en varias cosas:

1. **Reglas de negocio reales**: no es solo "crear y borrar cosas". Hay reglas como "no puedes modificar una factura emitida", "no puedes cobrar más de lo que te deben", "el snapshot fiscal se congela al emitir"... Son cosas que pasan en la vida real y que hay que programar bien.

2. **Contabilidad automática**: la mayoría de proyectos de facturación se quedan en "hago facturas y ya". Aquí la facturación está conectada con la contabilidad: cada operación comercial genera su apunte contable. Eso es lo que hace un ERP de verdad.

3. **Multiempresa**: la app puede tener varias empresas a la vez, cada una con sus propios datos, usuarios, clientes y facturas, sin que se mezclen entre sí.

4. **Generación de documentos PDF**: no solo guardas los datos, sino que puedes generar documentos profesionales descargables. Es una funcionalidad muy visual que demuestra que el sistema produce algo tangible.

5. **Tests automáticos**: hay pruebas que comprueban automáticamente que todo funciona bien. Por ejemplo, un test que simula todo el ciclo (registrar empresa, crear cliente, crear producto, crear factura, emitirla, intentar modificarla y que falle, cobrarla en dos pagos, y comprobar que los asientos contables cuadran). Si alguien cambia algo del código y rompe alguna de estas reglas, el test lo detecta.

6. **Trazabilidad completa**: todo queda auditado. Quién hizo qué y cuándo. En un sistema empresarial real esto es obligatorio.

---

## Tecnologías que uso (explicado fácil)

- **TypeScript**: es el lenguaje de programación que uso tanto en el backend como en el frontend. Es como JavaScript pero con "tipos", que básicamente significa que el propio lenguaje te avisa si estás haciendo algo raro antes de que la app se rompa.

- **Node.js + Express**: Node.js es lo que permite ejecutar JavaScript/TypeScript fuera del navegador (en un servidor). Express es una librería que facilita crear servidores web que escuchan peticiones y responden.

- **React**: es la librería que uso para construir la interfaz de usuario (el frontend). Es la más usada del mundo para hacer páginas web interactivas.

- **PostgreSQL**: la base de datos. Es donde se guardan todos los datos (clientes, facturas, pagos, usuarios...). Es gratuita, muy potente y la usan desde Instagram hasta Spotify.

- **Prisma**: es una herramienta que hace de "puente" entre el código TypeScript y la base de datos PostgreSQL. En vez de escribir consultas SQL a mano, le digo cosas como "busca todas las facturas de esta empresa" en TypeScript y Prisma las traduce.

- **JWT (JSON Web Tokens)**: es el sistema que uso para la autenticación. Cuando inicias sesión, el servidor te da un "token" (como un pase VIP) que el navegador guarda y envía en cada petición para demostrar que eres tú.

- **bcrypt**: es lo que uso para guardar las contraseñas de forma segura. Nunca se guarda la contraseña tal cual (eso sería un desastre de seguridad), sino que se "hashea" (se transforma en una cadena irreversible). Si alguien accede a la base de datos, no puede ver las contraseñas reales.

- **PDFKit**: la librería que genera los PDFs de facturas y comprobantes de pago.

- **Zod**: una librería que valida los datos que llegan del usuario. Si alguien intenta crear una factura sin poner el cliente, Zod lo detecta y rechaza la petición antes de que llegue a la lógica del programa.

- **Vite**: la herramienta que empaqueta y sirve el frontend durante el desarrollo. Hace que la página se actualice en tiempo real cuando cambias algo del código.

---

## Cómo se estructura el código

```
BenxCore/
├── backend/                    ← la cocina
│   ├── src/
│   │   ├── modules/            ← cada "parte" del negocio tiene su carpeta
│   │   │   ├── auth/           ← login y registro
│   │   │   ├── company/        ← datos de la empresa
│   │   │   ├── clients/        ← gestión de clientes
│   │   │   ├── products/       ← productos y servicios
│   │   │   ├── invoice-series/ ← series de numeración
│   │   │   ├── invoices/       ← facturas, pagos y PDFs
│   │   │   ├── accounting/     ← contabilidad automática
│   │   │   └── users/          ← gestión de usuarios
│   │   ├── middleware/         ← seguridad y manejo de errores
│   │   └── utils/              ← utilidades (errores, estilos PDF...)
│   ├── prisma/
│   │   ├── schema.prisma       ← definición de todas las tablas
│   │   ├── seed.ts             ← datos de prueba iniciales
│   │   └── migrations/         ← historial de cambios en la base de datos
│   └── tests/                  ← pruebas automáticas
│
├── frontend/                   ← la sala del restaurante
│   └── src/
│       ├── pages/              ← cada pantalla de la aplicación
│       ├── components/         ← piezas reutilizables (el modal, por ejemplo)
│       ├── api.ts              ← funciones para hablar con el backend
│       ├── types.ts            ← definiciones de datos
│       └── App.tsx             ← la estructura principal de la app
│
└── docs/                       ← documentación técnica del proyecto
```

Cada módulo del backend tiene tres archivos:

- **routes**: recibe las peticiones del navegador y decide qué hacer con ellas.
- **schemas**: comprueba que los datos que envía el usuario son correctos.
- **service**: hace el trabajo de verdad (las reglas de negocio, guardar en base de datos, etc.).

Es como una cadena de montaje: la petición entra por routes, se valida en schemas, y se procesa en service.

---

## El modelo de datos (las "tablas")

La base de datos tiene 14 tablas. Las principales son:

- **Company**: los datos de la empresa (nombre, NIF, dirección...).
- **User**: los usuarios que pueden entrar en la app (nombre, email, contraseña encriptada, rol).
- **Client**: los clientes de la empresa.
- **Product**: los productos o servicios que vende la empresa.
- **InvoiceSeries**: las series de numeración para las facturas.
- **Invoice**: las facturas en sí.
- **InvoiceLine**: cada línea de una factura (lo que se factura: "2 horas de consultoría a 50 euros").
- **InvoiceTaxSummary**: el resumen de IVA agrupado por tipo.
- **Payment**: los pagos que se registran sobre las facturas.
- **AccountingAccount**: las cuentas contables (430 Clientes, 572 Bancos, etc.).
- **JournalEntry**: los asientos contables (la cabecera).
- **JournalLine**: las líneas de cada asiento (el detalle del debe y haber).
- **AuditLog**: el registro de auditoría (quién hizo qué y cuándo).

Todos los importes de dinero usan un tipo numérico "Decimal", no "float". Esto es importante porque los floats tienen errores de redondeo (el típico 0.1 + 0.2 = 0.30000000000000004) y en un sistema de facturación eso no se puede permitir. Si una factura es de 1.306,80 euros, tiene que ser exactamente eso, no 1.306,7999999.

---

## Seguridad

- Las contraseñas nunca se guardan en texto plano. Se encriptan con bcrypt.
- Cada petición al servidor tiene que llevar un token de autenticación. Sin token, no hay acceso.
- Cada empresa solo puede ver sus propios datos. Aunque intentes acceder a la factura de otra empresa, el sistema te lo impide.
- Los datos de los usuarios que devuelve la API nunca incluyen la contraseña (ni siquiera la encriptada).
- Solo los administradores pueden gestionar usuarios.
- No se puede dejar una empresa sin al menos un administrador.

---

## Lo que no hace (y por qué)

Hay cosas que el sistema no hace todavía, pero no porque se me hayan olvidado, sino porque están fuera del alcance de un TFG:

- **Factura electrónica**: en España se está implantando un sistema obligatorio de factura electrónica (Verifactu, Facturae...). BenxCore genera PDFs, no facturas electrónicas firmadas digitalmente. Es un campo muy complejo que requeriría un proyecto entero por sí solo.

- **Contabilidad completa**: el sistema genera los asientos automáticamente, pero no tiene libro diario, libro mayor, balances de cierre... Es una base de integración contable, no un programa de contabilidad certificado.

- **Gestión de compras y proveedores**: solo gestiona las ventas (facturas emitidas), no las compras.

- **Inventario**: si vendes productos físicos, no lleva el control de stock.

- **Envío de facturas por email**: los PDFs se descargan, pero no se envían automáticamente al cliente.

Todo esto está documentado como "trabajo futuro", que es la sección que se pone en la memoria del TFG para decir "soy consciente de que esto falta, aquí explico cómo lo haría".

---

## Resumen en una frase

BenxCore es una aplicación web donde registras tu empresa, das de alta tus clientes y productos, creas facturas, las emites con número oficial, las cobras (en uno o varios pagos), descargas los PDFs, y la contabilidad se genera sola por detrás. Todo desde el navegador, con control de usuarios, auditoría de todo lo que pasa, y sin que se mezclen los datos entre empresas.
