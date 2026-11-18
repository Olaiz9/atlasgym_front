# Traspaso: rama `diseno/estilo-3`

Objetivo: que la app real quede **igual que los mocks**, conservando **todo** lo que la app ya hace (sin sacar funciones, solo sumar lo que falta).

## Dónde está cada cosa

- **Mocks (la referencia exacta):** lienzo https://claude.ai/artifact/Q4nbEgCxNxMmDBLDr1Hdrn. Cada pantalla es un archivo `project/<Nombre>.dc.html`; se lee con la herramienta Artifact (`action: "read"`, `path: "project/<Nombre>.dc.html"`). Copiar de ahí colores, tamaños, textos y orden.
- **Código:** carpeta `C:\Antigravity Projects\atlasgym_front_estilo3`, rama `diseno/estilo-3` (sale de `diseno/prueba-2`), subida a GitHub (`Olaiz9/atlasgym_front`).
- **Modelo de cómo pasar un mock a código:** ver `app/totem/page.tsx`, `app/page.tsx` (Inicio dueños) y `app/finanzas/page.tsx`, ya hechos.

## Pantallas que entran (las demás se descartan)

| Mock (archivo del lienzo) | Pantalla de la app | Estado |
|---|---|---|
| `Main.dc.html` + `InicioMovil.dc.html` | `/` dueños (escritorio y celular) | ✅ hecho |
| `Finanzas.dc.html` | `/finanzas` dueños | ✅ hecho |
| `Totem.dc.html` (título coral `#FF7A8E`) | `/totem` | ✅ hecho |
| `AlumnosMovil.dc.html` | `/alumnos` | pendiente |
| `FichaSocio.dc.html` | `/alumnos/[id]` (incluye asistente de morosos) | pendiente |
| `AsistenciasMovil.dc.html` | `/asistencias` | pendiente |
| `CobrarMovil.dc.html` | modal Registrar pago de `/finanzas` (pago completo / seña, medio de pago) | pendiente |
| `AnularMovil.dc.html` | modal Anular de `/finanzas` (chips de motivo) | pendiente |
| `PerfilMovil.dc.html` | `components/modal-perfil.tsx` + acceso desde el avatar en celular | pendiente |
| `LoginAlumno.dc.html` | `/login` | pendiente |
| `PortalSocio.dc.html` | `/` alumno en **celular** | pendiente |
| `PortalWeb2.dc.html` (dos columnas) | `/` alumno en **escritorio** | pendiente |
| `RutinaAlumno.dc.html` + `RutinaWeb.dc.html` | `/rutinas` alumno | pendiente |
| `EntrenoAlumno.dc.html` | entrenamiento en curso de `/rutinas` (botón **Anterior** + lista para saltar de ejercicio) | pendiente |
| `CuotasAlumno.dc.html` | `/finanzas` alumno (`VistaCuotasAlumno`) | pendiente |
| `AvisosAlumno.dc.html` | `/avisos` | pendiente |
| `VideotecaAlumno.dc.html` | `/videoteca` (con textos alternativos descriptivos en GIF y videos) | pendiente |

**Descartados:** `PortalWeb.dc.html` (portal web original) y `PortalWeb2Movil.dc.html`.

## Reglas acordadas (correcciones de la experta en UX)

- La **lista o tabla es lo principal**. Las métricas van chicas, en una franja con líneas, sin tarjetas grandes ni números gigantes.
- **Menos ruido:** Big Shoulders solo en el `h1` de cada pantalla (ya está en `globals.css`). Los subtítulos en Public Sans, 18–20px, semibold, sin mayúsculas. El dato secundario va en gris (`text-slate-500`) y más fino.
- **Etiquetas de estado sin relleno:** ícono + texto. "Al día" y "Pagado" quedan neutros; ámbar para pendiente o seña, rojo (`rose-400`) para vencido (ver `ESTADO_PAGO_STYLES` y `ESTADO_CUENTA_STYLES` en `lib/types.ts`). Nunca solo color (daltonismo).
- **Un solo botón azul por fila o pantalla.** WhatsApp y Anular van neutros o dentro del menú "⋯".
- **Sin el separador "·"** en textos: usar "|", dos líneas, o el número como contador aparte.
- **Todo lo que se toca mide 44px o más.** En celular, las acciones principales van abajo, al alcance del pulgar. En celular, las tablas pasan a filas simples (ver Inicio).
- **Montos con el formato de la app:** `$20.000` (sin espacio). Hay tests que lo buscan así.
- `alt` / `aria-label` descriptivos en todas las imágenes, GIF y videos.
- Mucho aire entre secciones (`gap-10/12`). Lo secundario va abajo o detrás de botones "Ir a…".

## Cómo probar

```bash
cd "C:\Antigravity Projects\atlasgym_front_estilo3"
npx tsc --noEmit
npx vitest run
npm run dev -- -p 3013
```

- `.env.local` (no se sube) tiene `NEXT_PUBLIC_ALLOW_OFFLINE_DEMO=true`, para ver datos de ejemplo sin backend. Los datos son de agosto: en Finanzas, tocar "Ver todos".
- Login demo: `admin` / `admin123`. Alumno: DNI `41890123` como usuario y contraseña. Tótem: `/totem`, PIN `1234`.
- En el repo principal hay un `.claude/launch.json` con la config `estilo-3` (puerto 3013) para el panel del navegador.

## Pendientes fuera del diseño (avisados al usuario, no hechos)

- Cálculo de días por semana (`lib/asistencia-utils.ts:22-84`): el formulario de planes no ofrece 1 ni 6 días, y si el socio no tiene plan cargado, el número se adivina a partir del **nombre** del plan.
- `app/finanzas/page.tsx` (`SeccionNotificarWhatsapp`): `onAsignarCredenciales(...).catch(() => {})` traga el error al guardar usuario y contraseña del socio.
