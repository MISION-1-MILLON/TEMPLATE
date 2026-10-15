# Nexo

Software de gestión para pequeños negocios de **cualquier sector**: seis herramientas que trabajan sobre los mismos datos.

> El nombre «Nexo» es provisional. Se cambia en `src/lib/brand.ts`.

| Herramienta | Qué hace | Plan |
|---|---|---|
| **Gestión** | Productos y stock, clientes, ventas (TPV), caja y facturas | Gratis |
| **Precio** | Calculadora de PVP por margen objetivo y semáforo de márgenes del catálogo | Gratis |
| **Tienda** | Catálogo o carta pública (`/t/<negocio>`) con QR, alimentado por el stock real | Gratis |
| **Publica** | Textos para Instagram, WhatsApp y Wallapop/Vinted a partir de la ficha del producto | Pro |
| **Mercado** | Analítica: lo que más factura, categorías, días y horas punta, stock parado | Pro |
| **Fideliza** | Campañas, cupones y puntos (pendiente) | Business |

## Cómo funciona la personalización por sector

El **núcleo** (productos, clientes, ventas, stock, caja) es el mismo para todos. Cada **sector** es un archivo de configuración
que añade encima:

- vocabulario (`Producto` → `Zapatilla`, `Plato`, `Vehículo`; `Tienda` → `Carta`, `Escaparate`…)
- campos propios del producto y del cliente (talla, colorway, alérgenos, km…), guardados en una columna JSON `attributes`
- categorías iniciales, plantillas de publicación y hashtags
- productos de ejemplo para la demo

Sectores incluidos: general, zapatillas, moda, restauración y motor (en `src/sectors/index.ts`).

**Añadir un sector nuevo** = añadir un objeto `SectorConfig` y registrarlo en `SECTORS`. Sin migraciones de base de datos.
Cambiar de sector desde Ajustes no borra datos.

## Puesta en marcha

Requisitos: Node 20 o superior.

```bash
cp .env.example .env          # y pon un AUTH_SECRET largo
npm install
npm run db:push               # crea la base de datos SQLite
npm run db:seed               # (opcional) cuentas demo con 60 días de ventas
npm run dev                   # http://localhost:3000
```

Cuentas demo (plan Pro), todas con la contraseña `demo1234`:

- `demo+general@nexo.app`
- `demo+zapatillas@nexo.app`
- `demo+moda@nexo.app`
- `demo+restauracion@nexo.app`
- `demo+motor@nexo.app`

## Arquitectura

- **Next.js 15** (App Router, Server Components y Server Actions) + **TypeScript** + **Tailwind**
- **Prisma** como ORM. SQLite en desarrollo y PostgreSQL en producción.
- Autenticación propia: contraseña con bcrypt y sesión JWT firmada en una cookie httpOnly (`src/lib/session.ts`).
- **Multi-negocio (multi-tenant)**: cada dato cuelga de una `Organization`. Todas las consultas filtran por el `org.id`
  de la sesión (`requireSession()` en `src/lib/auth.ts`).
- Importes en **céntimos (enteros)**. Los precios se guardan con IVA incluido y el desglose se calcula por tipo de IVA.
- La lógica de ventas está en `src/lib/sales.ts`. Una venta, en una sola transacción, descuenta stock, registra el
  movimiento de stock, apunta la entrada en caja y numera la factura. Anularla revierte todo.

```
src/
  app/
    page.tsx              landing
    (auth)/               registro, acceso
    panel/                el panel (protegido por middleware)
    t/[slug]/             tienda o carta pública
  lib/                    auth, db, ventas, dinero, módulos y planes
  sectors/                configuración por sector
prisma/schema.prisma      modelo de datos
prisma/seed.ts            datos demo
```

## Pasar a producción

1. En `prisma/schema.prisma`, cambia `provider = "sqlite"` por `"postgresql"` y apunta `DATABASE_URL` a tu Postgres
   (Neon, Supabase, RDS…). Después ejecuta `npx prisma migrate dev --name init`.
2. Con Postgres, añade `mode: "insensitive"` a las búsquedas `contains` para que no distingan mayúsculas.
3. Despliegue: Vercel, Railway o Render funcionan sin cambios (`npm run build && npm start`).

## Próximos pasos (hoja de ruta)

- [ ] **Cobro de suscripciones con Stripe** (Checkout y webhook). Hoy el cambio de plan en Ajustes es inmediato y sin cobro.
- [ ] **Facturación legal en España**: Verifactu / TicketBAI y numeración inalterable. Hoy la factura es imprimible, pero no está certificada.
- [ ] Equipo: invitar usuarios con rol (el modelo `Membership` ya lo soporta) y varios locales.
- [ ] Variantes de producto (una zapatilla con varias tallas, cada una con su stock).
- [ ] Subida de imágenes (S3/R2) en lugar de URL.
- [ ] Publica con IA (Claude API) y publicación directa en Instagram y Facebook.
- [ ] Fideliza: segmentos, campañas por WhatsApp o email, cupones y puntos.
- [ ] Campos personalizados editables por el propio cliente desde Ajustes (la base JSON ya lo permite).
- [ ] App móvil / PWA para vender desde el móvil.
- [ ] Tests automáticos (unitarios para `sales.ts` y e2e con Playwright).
