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

## Publicar en internet (Vercel + Neon, gratis para empezar)

1. **Vercel**: entra en https://vercel.com/signup con tu cuenta de GitHub.
2. **Add New… → Project**, importa `MISION-1-MILLON/TEMPLATE` y, **antes de pulsar Deploy**, abre
   *Environment Variables* y añade:
   - `AUTH_SECRET` = una cadena aleatoria larga (puedes generarla en https://generate-secret.vercel.app/32)
3. Pulsa **Deploy**. El primer despliegue fallará porque aún no hay base de datos. Es normal.
4. En el proyecto, ve a **Storage → Create Database → Neon (Postgres)**, acepta y conéctala al proyecto.
   Vercel añade solas `DATABASE_URL` y `DATABASE_URL_UNPOOLED`.
5. **Deployments → ⋯ → Redeploy**. Al desplegar se crean las tablas (`prisma migrate deploy`) y la app queda
   publicada en `https://<tu-proyecto>.vercel.app`.

Cada `git push` a `main` vuelve a publicar la app automáticamente. Para usar tu propio dominio: *Settings → Domains*.

Opcional: `NEXT_PUBLIC_APP_TIMEZONE` (por defecto `Europe/Madrid`).

## Desarrollo en local

Requisitos: Node 20 o superior y un PostgreSQL (local o una base de datos gratuita de Neon).

```bash
cp .env.example .env          # rellena DATABASE_URL, DATABASE_URL_UNPOOLED y AUTH_SECRET
npm install
npm run db:migrate            # crea las tablas
npm run db:seed               # (opcional) cuentas demo con 60 días de ventas
npm run dev                   # http://localhost:3000
```

Si cambias `prisma/schema.prisma`, genera la migración con `npm run db:migrate:new`.

Cuentas demo (plan Pro), todas con la contraseña `demo1234`:

- `demo+general@nexo.app`
- `demo+zapatillas@nexo.app`
- `demo+moda@nexo.app`
- `demo+restauracion@nexo.app`
- `demo+motor@nexo.app`

## Arquitectura

- **Next.js 15** (App Router, Server Components y Server Actions) + **TypeScript** + **Tailwind**
- **Prisma** sobre **PostgreSQL**, con migraciones en `prisma/migrations`.
- Autenticación propia: contraseña con bcrypt y sesión JWT firmada en una cookie httpOnly (`src/lib/session.ts`).
- **Multi-negocio (multi-tenant)**: cada dato cuelga de una `Organization`. Todas las consultas filtran por el `org.id`
  de la sesión (`requireSession()` en `src/lib/auth.ts`).
- Fechas calculadas en la zona horaria del negocio (`src/lib/time.ts`), aunque el servidor esté en UTC.
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
