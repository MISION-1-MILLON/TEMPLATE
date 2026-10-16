# Nexo

Software de gestión para pequeños negocios de **cualquier sector**: seis herramientas que trabajan sobre los mismos datos.

> El nombre «Nexo» es provisional. Se cambia en `src/lib/brand.ts`.

| Herramienta | Qué hace | Plan |
|---|---|---|
| **Caja** | Vender (TPV), productos y stock, clientes, dinero del día y facturas | Gratis |
| **Competencia** | Precios de la competencia buscados solos en internet | Gratis (límite diario) |
| **Proveedores** | Ranking de proveedores del más barato al más caro | Gratis (límite diario) |
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

## Búsqueda automática de precios (Competencia y Proveedores)

La app busca sola en internet, con Claude y su búsqueda web:
- **Competencia:** a cuánto venden tus productos otras tiendas (física, web, marketplaces). Te dice si estás caro o barato y te propone precios.
- **Proveedores:** deduce lo que compras a partir de tu catálogo y busca proveedores con su precio, ordenados de más barato a más caro.

Cuándo busca:
- **Revisión de la matriz (gratis para el cliente):** cada producto y cada cosa que compra el cliente se revisa una vez al mes. Lo hace la tarea programada diaria, que cada día revisa lo que lleve más de 30 días sin buscarse. También son de la matriz la búsqueda al crear un producto y la primera búsqueda de proveedores.
- **"Buscar ahora" (a mano):** gasta el cupo diario del cliente (Gratis 5, Pro 40, Business 150; `DAILY_LIMIT` en `src/lib/research.ts`), salvo que haya un resultado de esa misma semana en la caché.

**Caché compartida (`PriceLookup`):** la misma búsqueda (por ejemplo, "Nike Air Max 90" o "harina de trigo, kg") se hace una vez cada 30 días y sirve para todos los clientes. En restauración la clave incluye la ubicación, porque el precio de un plato depende de la zona. Así el coste depende de cuántos productos distintos hay en la plataforma, no del número de clientes.

Coste aproximado: 0,20–0,30 € por búsqueda nueva (tokens del modelo y búsquedas web). Los resultados de la caché no cuestan nada.

Capacidad: la tarea diaria trabaja unos 4 minutos con 3 búsquedas en paralelo, unas 15–25 búsquedas nuevas al día (450–750 al mes). Si se queda corto, hay dos opciones: programarla varias veces al día (requiere el plan Pro de Vercel) o pasarla a la Batch API de Anthropic, que tiene un 50 % de descuento.

Variables en Vercel:

| Variable | Para qué |
|---|---|
| `ANTHROPIC_API_KEY` | Clave de https://console.anthropic.com (Settings → API keys) |
| `CRON_SECRET` | Cadena aleatoria. Vercel la usa para lanzar la tarea diaria (`vercel.json`) |

Sin `ANTHROPIC_API_KEY`, las secciones funcionan, pero muestran "pendiente de activar".
Para pruebas locales sin gastar: `NEXO_AI_MOCK=1` devuelve resultados simulados (marcados como "simulado").

## Cobro de suscripciones (Stripe)

Contratar un plan abre la página de pago de Stripe, con 14 días de prueba gratis la primera vez. Stripe avisa a la app
mediante un webhook y la app activa, cambia o cancela el plan automáticamente. El cliente gestiona su tarjeta, sus facturas
y la cancelación desde el portal de Stripe (botón «Tarjeta y facturas» en Ajustes).

No hace falta crear productos ni precios en Stripe: se crean solos la primera vez que alguien contrata.

1. Crea una cuenta en https://dashboard.stripe.com y deja activado el **modo de prueba** (*Test mode*).
2. **Developers → API keys**: copia la *Secret key* (`sk_test_…`).
3. **Developers → Webhooks → Add endpoint**:
   - URL: `https://<tu-dominio>/api/stripe/webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
     `customer.subscription.deleted`
   - Copia el *Signing secret* (`whsec_…`).
4. **Settings → Billing → Customer portal**: pulsa **Save** (o *Activate*) para activar el portal de clientes.
5. En Vercel, *Settings → Environment Variables*: añade `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` y vuelve a desplegar.
6. Prueba a contratar con la tarjeta de prueba `4242 4242 4242 4242` (cualquier fecha futura y cualquier CVC).

Para cobrar de verdad, repite los pasos 2–5 en **modo real** (*Live*) con las claves `sk_live_…`.

Sin `STRIPE_SECRET_KEY`: en local el cambio de plan es inmediato (para desarrollar); en producción queda bloqueado.

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

- [x] Cobro de suscripciones con Stripe (Checkout, webhook, portal de cliente y prueba de 14 días).
- [ ] IVA automático con Stripe Tax y emails de aviso (fin de prueba, pago fallido).
- [ ] **Facturación legal en España**: Verifactu / TicketBAI y numeración inalterable. Hoy la factura es imprimible, pero no está certificada.
- [ ] Equipo: invitar usuarios con rol (el modelo `Membership` ya lo soporta) y varios locales.
- [ ] Variantes de producto (una zapatilla con varias tallas, cada una con su stock).
- [ ] Subida de imágenes (S3/R2) en lugar de URL.
- [ ] Publica con IA (Claude API) y publicación directa en Instagram y Facebook.
- [ ] Fideliza: segmentos, campañas por WhatsApp o email, cupones y puntos.
- [ ] Campos personalizados editables por el propio cliente desde Ajustes (la base JSON ya lo permite).
- [ ] App móvil / PWA para vender desde el móvil.
- [ ] Tests automáticos (unitarios para `sales.ts` y e2e con Playwright).
