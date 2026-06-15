# Requisitos de BenxCore

> Este fue el planteamiento inicial del proyecto, antes de empezar a implementarlo. Lo dejo tal cual porque sirve para ver de dónde se partió. El alcance final terminó siendo más amplio: se añadieron gestión de usuarios y roles, contabilidad automática por partida doble, comprobantes de pago y un módulo de auditoría que no estaban previstos al principio. El estado real y actualizado del proyecto está en `tfg-status-and-roadmap.md` y `tareas.md`.

## Objetivo general

Desarrollar una aplicación web tipo ERP para pequeñas empresas y autónomos, permitiendo gestionar clientes, productos, servicios y facturas.

## Requisitos funcionales

- El usuario podrá registrarse e iniciar sesión.
- El usuario podrá gestionar los datos de su empresa.
- El usuario podrá crear, editar, eliminar y consultar clientes.
- El usuario podrá crear, editar, eliminar y consultar productos o servicios.
- El usuario podrá crear facturas asociadas a clientes.
- El sistema calculará automáticamente subtotal, IVA y total.
- El usuario podrá consultar un panel resumen.
- El usuario podrá generar facturas en PDF.

## Requisitos no funcionales

- La aplicación tendrá una interfaz responsive.
- La API estará protegida mediante autenticación.
- Las contraseñas se almacenarán cifradas.
- La base de datos será relacional.
- El proyecto estará dividido en frontend y backend.