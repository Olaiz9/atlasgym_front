<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ATLAS Gym — Frontend (Next.js 16.3 / React 19 / TypeScript 5.7 / Tailwind 4)
## Guía de Arquitectura, Flujos de Negocio y Operación para Claude Code

Este archivo proporciona el contexto completo, flujos de integración y reglas de diseño para cualquier sesión de desarrollo, auditoría o mantenimiento con **Claude Code** en este repositorio.

---

### 1. Contexto de Negocio y Operación Real

- **Usuarios Reales:** Dos hermanos (co-titulares) operan la app administrativa desde celulares (vía Wi-Fi local o dominio web) y notebooks.
- **Tótem de Autoservicio (`/totem`):** Corre en una tablet montada en el mostrador. No requiere login de usuario: se vincula una única vez ingresando el `ATLAS_TOTEM_SECRET` que se almacena localmente en `localStorage` (`atlas_totem_device_secret`). Si se corta el Wi-Fi, permite check-in offline consultando el padrón en caché (`atlas_totem_padron_cache_v1`) y encola las asistencias en `atlas_totem_outbox_v1` para sincronizarlas al volver la conexión.
- **Control de Asistencia (`/asistencias`):** Muestra el aforo en vivo. El polling en segundo plano solo consulta las asistencias del día actual (`?fecha=YYYY-MM-DD`) para no saturar la red ni la base. Si un socio supera su plan semanal (2, 3, 4, 5, 6 días), la pantalla muestra un pill de advertencia visual color ámbar/rojo con los días excedidos, sin bloquear el paso del alumno.
- **Caja y Cobranzas (`/finanzas`):**
  - **Arqueo de Caja del Día:** Panel interactivo que resume lo cobrado hoy desglosado por Efectivo, Transferencia, Tarjeta y por Titular a cargo (`Bruno (Dueño)`, `Titular 2`, etc.).
  - **Señas y Pagos Parciales:** Permite registrar cobros parciales (`EstadoPago.PARCIAL`), muestra saldo pendiente y ofrece un modal con 1 clic para "Completar Saldo" cuando el socio liquida el remanente.
  - **Anulaciones Auditadas:** Reemplaza cualquier borrado físico por un modal de anulación con chips de motivos frecuentes ("Cargado por error", "Monto incorrecto", "Socio equivocado").
  - **Asistente para Socios Morosos:** Sugiere imputar meses atrasados en orden cronológico para no dejar agujeros contables.
- **Día Cero y WhatsApp (`/alumnos`):**
  - Modal de **Importación Masiva CSV**: permite arrastrar un archivo delimitado por comas, punto y coma o tabulaciones, previsualiza los socios con matching de planes y los migra con su último pago en una sola transacción.
  - Botones **WhatsApp 1-Clic (`wa.me`)**: ubicados en `/alumnos`, `/alumnos/[id]` y `/finanzas`, normalizan automáticamente números argentinos (`+54 9`, remueven `0` y `15`) y generan mensajes directos preconfigurados de bienvenida con credenciales (DNI) o recordatorio formal de cuota pendiente.

---

### 2. Arquitectura de Integración con el Backend (Spring Boot)

1. **Proxy Inverso Dinámico Same-Origin (`/backend-api`):**
   - Implementado en `app/backend-api/[...path]/route.ts`.
   - Todas las llamadas del navegador van a `/backend-api/*` (mismo origen del frontend).
   - El proxy en Next.js reenvía en el servidor hacia `BACKEND_INTERNAL_URL` (`http://backend:8080` en Docker o `http://127.0.0.1:8080` en desarrollo).
   - **Beneficio crítico:** Los teléfonos de los dueños conectados al Wi-Fi del gimnasio acceden a `http://192.168.x.x:3000` y la API funciona de inmediato sin errores de `localhost:8080`, sin problemas de CORS y sin exponer el puerto 8080 a Internet.
2. **Normalización Automática en `lib/api-client.ts`:**
   - La función `normalizarUrlApi` garantiza que cualquier URL relativa comience con `/backend-api`.
   - `resolverUrlUpstreamBackend` detecta si se está ejecutando en servidor o cliente para apuntar al backend correcto.
3. **Manejo Centralizado del Estado (`lib/store.tsx`):**
   - Provee el contexto `GymContext` con datos en memoria y sincronización transparente con la API REST.

---

### 3. Comandos de Verificación y Compilación

```powershell
# Levantar servidor de desarrollo
npm run dev

# Ejecutar suite de tests unitarios y de componentes (151 tests)
npx vitest run

# Chequeo estricto de tipos TypeScript (debe dar 0 errores)
npx tsc --noEmit

# Compilación optimizada para producción (Next.js Turbopack)
npm run build
```

---

### 4. Estructura de Directorios Clave

- `app/`: Rutas de Next.js App Router (`/`, `/alumnos`, `/alumnos/[id]`, `/asistencias`, `/finanzas`, `/planes`, `/rutinas`, `/totem`, `/videoteca`, `/backend-api`).
- `components/`: Componentes modulares de interfaz y componentes UI base de Tailwind/Radix (`app-shell.tsx`, `modal-perfil.tsx`, etc.).
- `lib/`:
  - `api-client.ts`: Cliente HTTP tipado hacia el backend.
  - `store.tsx`: Estado global de la aplicación.
  - `types.ts`: Modelos de datos TypeScript (EstadoPago, Alumno, Asistencia, etc.).
  - `whatsapp-utils.ts`: Normalizador de celulares argentinos y generador de enlaces `wa.me`.
  - `csv-import.ts`: Parser tolerante de CSVs para migración de padrones.
  - `totem-offline.ts`: Gestión de caché y cola Outbox offline para la tablet.
  - `date-utils.ts` y `asistencia-utils.ts`: Utilidades de fechas ISO y cómputo de semanas.

---

### 5. Reglas Críticas para Agentes y Desarrolladores

- **NUNCA usar `NEXT_PUBLIC_*` para secretos de backend o credenciales maestras.** El bundle del cliente es público.
- **NUNCA agregar capturas silenciosas de errores (`.catch(() => {})`)** en mutaciones o llamadas de API; siempre mostrar toast o feedback visible al usuario.
- **Respetar siempre la normalización de números argentinos** usando `normalizarCelularWhatsappAR` antes de construir enlaces a `wa.me`.
- **Ejecutar siempre `npx vitest run` y `npx tsc --noEmit`** antes de dar por terminada cualquier modificación.
