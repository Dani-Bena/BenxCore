# BenxCore
<h1 align = "center"> Facturacion de pequeñas empresas </h1>

## Estado actual

1. GitHub configurado ✅
2. Backend con Express + TypeScript configurado ✅
3. Docker Desktop instalado y funcionando ✅
4. PostgreSQL desplegado en Docker ✅
5. Prisma 7 configurado ✅
6. Migración inicial aplicada correctamente ✅
7. Modelos ERP definidos ✅
8. Prisma Client conectado al backend ✅
9. Endpoint real consultando datos desde PostgreSQL ✅
10. Haces login ✅
11. Recibes un token JWT ✅
12. Usas ese token en Authorization: Bearer ✅
13. El backend valida el token ✅
14. Recupera el usuario desde PostgreSQL ✅
15. Incluye la empresa asociada ✅
16. POST /api/auth/register ✅
17. POST /api/auth/login ✅
18. GET /api/auth/me ✅
19. JWT ✅
20. Bcrypt ✅
21. Middleware de autenticación ✅
22. Teneos clientes
23. Tenemos empresas
24. Tenemos serializacion de la factura
25. tenemos productos

## facturas
1. Crear borrador de factura
2. Elegir cliente
3. Añadir líneas
4. Calcular base imponible, IVA y total
5. Guardar resumen de impuestos
6. Permitir editar mientras esté en DRAFT
7. Emitir factura
8. Asignar número correlativo
9. Copiar datos fiscales de empresa y cliente
10. Bloquear factura

### validaciones antes de crear la factura
1. El cliente debe pertenecer a la empresa autenticada
2. El cliente debe estar activo
3. La serie, si se indica, debe pertenecer a la empresa
4. La serie debe estar activa
5. Los productos usados deben pertenecer a la empresa
6. Las líneas deben tener quantity > 0
7. El taxRate debe estar entre 0 y 100
8. El unitPrice no puede ser negativo
9. La factura debe tener al menos una línea
