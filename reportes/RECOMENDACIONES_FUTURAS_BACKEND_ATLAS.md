# ATLAS GYM — Auditoría de Sistemas & Recomendaciones Técnicas para Backend y Base de Datos

**Fecha:** 24 de Septiembre de 2026  
**Destinatario:** Bruno / Equipo ATLAS GYM  
**Estado:** Frontend 100% Validado (108 tests pasando, Turbopack clean)  
**Documento PDF generado:** [`reportes/RECOMENDACIONES_FUTURAS_BACKEND_ATLAS.pdf`](file:///C:/Users/Bruno/Desktop/Bruno/ATLAS/frontAtlas/atlasgym_front/reportes/RECOMENDACIONES_FUTURAS_BACKEND_ATLAS.pdf)

---

## 1. Resumen Ejecutivo

El frontend de **ATLAS Gym** ha alcanzado su estado óptimo de madurez y validación técnica:
- **108 tests unitarios pasando al 100%** en Vitest.
- **13/13 rutas estáticas y dinámicas** compiladas limpias en Next.js (Turbopack).
- Sincronización en tiempo real entre Finanzas y Asistencias para la actualización inmediata del estado de cuota tras cobrar en recepción.
- Prevención de registros duplicados en el Tótem Kiosco para proteger el cálculo de aforo.

El paso siguiente es la implementación del **Backend** y la **Base de Datos Relacional**. Este documento recopila los lineamientos clave para estructurar la persistencia y la lógica del servidor de forma robusta y escalable.

---

## 2. Recomendaciones de Arquitectura & Base de Datos

### 2.1. Inmutabilidad de Pagos e Historial de Precios
- **Problema:** Los precios de los planes se actualizan en el tiempo por inflación o políticas comerciales. Un aumento en septiembre no debe recalcular retroactivamente lo que un socio pagó o adeudaba en meses anteriores.
- **Solución en BD:** La tabla `pagos` debe almacenar un snapshot inmutable con:
  - `monto_cobrado` (DECIMAL)
  - `precio_plan_momento` (DECIMAL)
  - `periodo_mes` (VARCHAR 'YYYY-MM')
  - `metodo_pago` (ENUM)
  - `fecha_pago` (DATE)

### 2.2. Reglas de Asistencia: Anti-Fraude vs Doble Turno
- **Regla estándar:** Si existe un registro con `fecha = CURRENT_DATE` y la sesión previa tiene menos de 100 minutos de antigüedad, rechazar con mensaje informativo de sesión activa.
- **Doble turno opcional:** Si el gimnasio incorpora pases con doble turno, el backend permitirá un segundo check-in únicamente si la sesión anterior ya caducó (> 100 minutos) y el plan lo contempla.
- **Indexación:** Crear índice compuesto:
  ```sql
  CREATE INDEX idx_asistencias_alumno_fecha ON asistencias (alumno_id, fecha);
  ```

### 2.3. Autenticación y Autorización por Roles (RBAC + JWT)
- **Token JWT:** `{ sub: usuario_id, rol: "ADMIN" | "ALUMNO", alumno_id: string | null }`
- **Guards de Backend:**
  - `POST /api/pagos`, `PUT /api/planes`, `DELETE /api/alumnos/:id` &rarr; Exclusivos `ADMIN`.
  - `GET /api/mis-cuotas`, `GET /api/mi-rutina` &rarr; Autolimitados al `alumno_id` del token.
  - `POST /api/asistencias/totem` &rarr; Protegido por API Key de dispositivo asignada a la tablet.

### 2.4. Sincronización en Red en Tiempo Real
- Migrar del actual `BroadcastChannel` local a **Server-Sent Events (SSE)** o **WebSockets**.
- Recomendación: **SSE** para la afluencia en sala de recepción (muy liviano, nativo HTTP/2).

### 2.5. Transacciones ACID e Idempotencia
- Usar bloques `BEGIN ... COMMIT` al registrar cobros para asegurar consistencia atómica entre el pago y la cuota del alumno.
- Usar encabezado `X-Idempotency-Key` en endpoints de cobro para evitar pagos duplicados por doble clic accidental.

---

## 3. Hoja de Ruta de Implementación (Roadmap)

1. **Fase 1: Modelado de BD y Migraciones (PostgreSQL / Supabase)**
2. **Fase 2: API REST Core & Autenticación JWT**
3. **Fase 3: Adaptador del Store en Frontend (React Query / SWR hacia los endpoints)**
4. **Fase 4: Eventos en Tiempo Real (SSE) y Despliegue en Servidor**

---
*ATLAS Gym — Sistema de Gestión Integral de Gimnasio &copy; 2026*
