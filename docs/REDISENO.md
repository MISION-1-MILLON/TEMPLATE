# Rediseño del centro de mando

Rama `claude/festive-pascal-lfghfk`. Reconstrucción completa del front end (panel, landing, acceso y tienda pública) con permisos reales por rol y varios locales.

## Decisiones (respuestas del propietario)

| Tema | Decisión |
|---|---|
| Gestor | Gestoría externa: solo consulta y exporta |
| Alcance | Front end + permisos reales en base de datos y servidor |
| Juego | Se mantiene, rediseñado (sobrio y discreto) |
| Pantallas | Panel completo, landing, tienda pública, registro y acceso |
| Adaptación | Sector al darse de alta + herramientas que se encienden y apagan |
| Dispositivos | Mixto: empleado en tablet/móvil, dueño y gerente en móvil y ordenador, gestoría en ordenador |
| Estilo | Claro y sobrio, modo oscuro disponible |
| Marca | Nexo |
| Gerente | Operativa sin beneficio, márgenes ni suscripción |
| Empleado | Vender y cobrar, aplicar descuentos, ver y ajustar stock |
| Locales | Varios locales ya |

## Roles

`owner` (Dueño), `manager` (Gerente), `staff` (Empleado), `accountant` (Gestoría). El antiguo `admin` pasa a `manager`.

| Permiso | Dueño | Gerente | Empleado | Gestoría |
|---|:-:|:-:|:-:|:-:|
| Vender y cobrar | ✔ | ✔ | ✔ | |
| Aplicar descuentos | ✔ | ✔ | ✔ | |
| Anular ventas | ✔ | ✔ | | |
| Ver ventas | todas | todas | las suyas de hoy | todas (lectura) |
| Exportar ventas y facturas | ✔ | ✔ | | ✔ |
| Productos (crear, editar) | ✔ | ✔ | | |
| Ver y ajustar stock | ✔ | ✔ | ✔ | |
| Clientes | ✔ | ✔ | elegir/crear en la venta | |
| Caja: movimientos del día | ✔ | ✔ | | lectura |
| Beneficio, márgenes, costes | ✔ | | | |
| Gastos e IVA | ✔ | | | lectura |
| Competencia y proveedores | ✔ | ✔ | | |
| Calculadora de precios | ✔ | | | |
| Tienda online, Publica | ✔ | ✔ | | |
| Estadísticas | completas | sin beneficio | | |
| Equipo (invitar) | todos los roles | solo empleados | | |
| Locales (crear, editar) | ✔ | | | |
| Herramientas y ajustes del negocio | ✔ | | | |
| Plan y facturación | ✔ | | | |
| Cambiar de local | todos | los suyos | el suyo | todos |

La fuente de verdad es `src/lib/permissions.ts`; el servidor lo comprueba en cada acción y página, la interfaz solo esconde lo que no se puede usar.

## Locales

`Location` por negocio. Ventas, movimientos de stock y de caja llevan `locationId`; el stock se guarda por producto y local (`ProductStock`). Cada miembro puede tener locales asignados (vacío = todos). El local activo va en una cookie y se cambia desde la barra lateral.

## Herramientas por negocio

`Organization.modules` guarda las herramientas encendidas. El sector propone las suyas al darse de alta; el dueño las cambia en Ajustes. Lo que el plan no incluye se ve bloqueado con su plan.

## Fases

1. Especificación (este documento y `PRODUCT.md`).
2. Modelo de datos y migración.
3. Permisos en el servidor.
4. Sistema de diseño y armazón (barra lateral por rol, selector de local, paleta de comandos, movimiento).
5. Pantallas del panel.
6. Landing, acceso y tienda pública.
7. Verificación (impeccable, taste-skill, typecheck, build, recorridos por rol) y PR.

## Comprobación

Recorrido con un navegador sobre la versión de producción, entrando con cada perfil del restaurante de ejemplo
(✓ se abre; · no disponible para ese perfil):

| Pantalla | Dueño | Gerente | Empleado | Gestoría |
|---|:-:|:-:|:-:|:-:|
| Inicio | ✓ | ✓ | ✓ (su turno) | ✓ (resumen del trimestre) |
| Vender | ✓ | ✓ | ✓ | · |
| Ventas | ✓ | ✓ | ✓ (las suyas de hoy) | ✓ |
| Caja | ✓ | ✓ | · | ✓ (consulta) |
| Catálogo / Stock | ✓ | ✓ | ✓ (ver y ajustar stock) | · |
| Nuevo producto, clientes, competencia, proveedores, tienda, publicar, estadísticas, progreso, equipo | ✓ | ✓ | · | · |
| Precios y márgenes, locales, ajustes | ✓ | · | · | · |
| IVA por trimestre | ✓ | · | · | ✓ |
| Exportar ventas (CSV) | ✓ | ✓ | · | ✓ |

taste-skill `lint.mjs --app`: 0 FAIL. `inspect.mjs --app` en portada, registro, acceso y tienda pública: 0 FAIL
(las páginas del panel necesitan sesión y se revisaron con capturas por perfil, en claro, oscuro y móvil).
