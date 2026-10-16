# 📋 Auditoría Integral del Frontend — Atlas Gym

**Fecha de análisis:** Septiembre 2026  
**Rama activa:** `ramaLucas` / `develop`  
**Stack tecnológico:** Next.js 16.3 (Turbopack, App Router) · React 19 · Tailwind CSS v4 · TypeScript 5.7 · Vitest 5.0  

---

## 🧭 Resumen Ejecutivo

La aplicación cuenta con una **excelente base visual y funcional**: la interfaz es moderna, atractiva, responsiva, cuenta con modo dual (Admin y Alumno), 1.500 ejercicios indexados con GIFs, sistema de mensualidades automáticas con vencimiento los días 10, y 92 tests unitarios pasando al 100%.

Sin embargo, al haber crecido rápidamente con múltiples módulos, presenta **deuda técnica importante** en 4 áreas clave:
1. **Rendimiento de Bundle y Memoria:** Un archivo JSON de 1.17 MB se carga estáticamente en el cliente y se vuelca en `localStorage`, inflando el paquete inicial a más de 1.2 MB.
2. **Arquitectura de Estado:** Un único Context monolítico (`useGymStore`) provoca re-renders masivos en toda la aplicación ante cualquier cambio mínimo.
3. **Archivos Gigantes y Monolíticos:** Pantallas como `app/rutinas/page.tsx` superan las 1.870 líneas de código y mezclan lógica de admin, alumno, formularios y modales en un solo archivo.
4. **Faltantes para un Gimnasio Real:** Falta registro de asistencia en 1 click, exportación contable (Excel/CSV), generación automática de cuotas mensuales y notificaciones visuales (toasts).

---

## 1. ⚠️ ¿Qué está mal o presenta riesgo de bugs?

### 1.1. Catálogo masivo de 1.500 ejercicios infla el Bundle del Cliente (1.2 MB)
- **Diagnóstico:** `lib/data/exercises.json` (1.17 MB) es importado estáticamente en `lib/catalogo-ejercicios.ts`, el cual a su vez es importado en `lib/mock-data.ts` y cargado en el estado inicial de `lib/store.tsx`.
- **Impacto directo:** 
  - El bundle compilado de Turbopack genera un chunk de **1.217.607 bytes (1.22 MB)** (`1e83lblvurgy9.js`) que el navegador debe descargar y parsear en el primer segundo de carga.
  - El `useEffect` de `store.tsx` ejecuta `localStorage.setItem("atlas_videos_v1", JSON.stringify(videosTecnica))`. Esto guarda más de 1.5 MB en el `localStorage` del cliente. Teniendo en cuenta que los navegadores móviles suelen limitar `localStorage` a 5 MB, se está consumiendo hasta un 30% del espacio del usuario solo con el catálogo inicial.
- **Paradoja:** Ya existe un endpoint `/api/ejercicios/route.ts` con filtros y paginación (`limit=50`), pero **ningún componente del frontend lo consume actualmente**.

### 1.2. Re-renders masivos por Context Monolítico (`lib/store.tsx`)
- **Diagnóstico:** `AppDataContext` agrupa en un único objeto todo el estado de la aplicación: alumnos, pagos, rutinas, videos, planes, avisos, sesiones de entrenamiento y usuario actual.
- **Impacto:**
  - Cuando un alumno marca una serie como hecha en su rutina (`guardarSesion`), o cuando el admin cambia de pestaña o registra un pago, **todos los componentes que llaman a `useAppData()` se re-renderizan**, incluyendo la `Sidebar`, el `AppShell`, los dropdowns de notificaciones y la pantalla activa.
  - Faltan contextos divididos (por ejemplo: `AuthContext` separado de `GymDataContext`) o selectores memoizados.

### 1.3. Desajuste de fechas y período mensual en Finanzas
- **Diagnóstico:** En `app/finanzas/page.tsx` (línea 324):
  ```typescript
  return pagos.filter((p) => p.fecha.slice(0, 7) === mes);
  ```
  Filtra por la fecha en la que se registró el pago (`p.fecha`), en lugar del período mensual que cancela la cuota (`p.periodoMes`).
- **Problema en la práctica:** Si un alumno paga la cuota de Agosto el día 2 de Septiembre, ese pago desaparece de la vista del mes de Agosto y se suma en Septiembre.
- Además, en el modal de registrar pago (`ModalRegistrarPago`), no hay un campo para seleccionar a qué mes corresponde la cuota que se está cobrando; se autoasigna la fecha de hoy.

### 1.4. Búsqueda de Alumnos restrictiva (solo por Nombre)
- **Diagnóstico:** En `app/alumnos/page.tsx` (línea 54):
  ```typescript
  const coincideBusqueda = a.nombre.toLowerCase().includes(busqueda.toLowerCase());
  ```
- **Problema en recepción:** En un gimnasio real, cuando un socio entra, el recepcionista pide su **DNI** o celular. Al tipear el número de DNI en la barra de búsqueda, la lista se queda vacía porque no busca en `a.dni`, `a.email` ni `a.celular`.

### 1.5. Eliminación en cascada incompleta (Videoteca vs Rutinas)
- **Diagnóstico:** Aunque se implementó protección para no eliminar planes asignados o alumnos con cuotas, al eliminar un video en Videoteca (`eliminarVideoTecnica`), no se chequea si hay rutinas que hacen referencia a ese ejercicio o video, dejando tarjetas sin demo o enlaces rotos.

### 1.6. Tres patrones distintos de Modales en el proyecto
- En la actualidad conviven 3 formas distintas de hacer modales:
  1. `<dialog ref={dialogRef}>` con API nativa `.showModal()` (`ModalNuevoAlumno`, `ModalPerfil`, `ModalNuevoAviso`).
  2. `<dialog open>` sin `.showModal()` (`PlanesPage`). Rompe la accesibilidad y el trapping nativo de foco.
  3. `<div className="fixed inset-0 ...">` (`Finanzas`, `Rutinas`, `Videoteca`, `Login`). No atrapan el foco del teclado (a11y) ni responden a la tecla `Esc` (Escape) a menos que se escuche manualmente en un `useEffect`.

---

## 2. 🚀 ¿Qué falta para un Gimnasio Real?

| Funcionalidad Faltante | Por qué es necesaria | Dificultad |
| :--- | :--- | :---: |
| **Registro de Asistencia en 1 Click** | El campo `ultimaAsistencia` existe en el modelo, pero no hay botón para marcar "Presente hoy" desde la lista de alumnos ni en su ficha. | Baja |
| **Exportación a Excel / CSV** | El dueño o administrador necesita exportar la planilla de pagos del mes y la lista de morosos para su contador. | Baja |
| **Generación Mensual de Cuotas** | Al comenzar un mes, el sistema debería generar automáticamente las cuotas "PENDIENTES" para los socios activos, facilitando el control de morosidad el día 10. | Media |
| **Notificaciones Visuales (Toasts)** | Al guardar cambios, agregar un alumno o registrar un cobro, el modal se cierra sin un mensaje de confirmación ("Alumno creado con éxito"). | Baja |
| **PWA Web App Manifest Real** | Hay un tutorial en el login de cómo instalar la PWA, pero falta `manifest.json` y los metadatos necesarios para que el navegador ofrezca la instalación nativa. | Media |
| **Filtros Avanzados en Finanzas** | Poder filtrar pagos por medio de cobro (Efectivo, Mercado Pago, Transferencia) para el arqueo de caja diario del gimnasio. | Baja |

---

## 3. 🧹 ¿Qué código se puede limpiar y optimizar?

### 3.1. Modularización de Archivos Gigantes
- **`app/rutinas/page.tsx` (1.870 líneas):** Es el archivo más grande del proyecto. Contiene la vista del admin, la vista del alumno, 3 modales de creación/edición, el visor de video y el motor de series. Debe modularizarse en componentes más pequeños:
  - `components/rutinas/admin-rutinas-grid.tsx`
  - `components/rutinas/alumno-rutina-view.tsx`
  - `components/rutinas/modal-ejercicio-video.tsx`
  - `components/rutinas/modal-nueva-rutina.tsx`
- **`app/finanzas/page.tsx` (1.079 líneas):** Contiene la vista de admin, la vista de cuotas del alumno, el modal de cobro y la tabla.
- **`app/videoteca/page.tsx` (635 líneas):** Puede extraer el modal de carga y la tarjeta de video.

### 3.2. Componentes Duplicados que deberían ser comunes
- **`MetricCard`:** Está escrito con la misma estructura y clases en `app/alumnos/page.tsx` y en `app/finanzas/page.tsx`.
- **Badges de estado:** Los badges de cuota y plan se repiten con estilos inline en varias páginas.
- **Encabezados de sección (`SectionHeader`):** Repetidos con ligeras variaciones.

### 3.3. Tipado TypeScript con `any`
- En `app/page.tsx` y `app/alumnos/[id]/page.tsx`, varios props usan `any` (`alumno: any`, `rutina: any`, `usuario: any`).
- Deben tiparse con las interfaces ya disponibles en `lib/types.ts` (`Alumno`, `Rutina`, `UsuarioSesion`).

### 3.4. Uso de `next/image` en lugar de `<img>`
- En `components/sidebar.tsx` (líneas 58 y 88) se desactivó el linter con `// eslint-disable-next-line @next/next/no-img-element`.
- Reemplazarlo por el componente `<Image>` de Next.js optimiza la compresión, evita saltos de layout (CLS) y carga en WebP.

---

## 4. 🗺️ Hoja de Ruta Sugerida (Roadmap)

```mermaid
flowchart TD
    subgraph Fase 1: Rendimiento y Optimización Inmediata
        A1[Mudar catálogo a lazy loading / API route] --> A2[Reducir bundle de 1.2MB a ~200KB]
        A2 --> A3[Evitar guardar 1500 ejercicios en localStorage]
    end

    subgraph Fase 2: Correcciones y Experiencia
        B1[Búsqueda multi-campo en Alumnos DNI/Email] --> B2[Ajustar periodoMes en Finanzas y cobros]
        B2 --> B3[Unificar estándar de Modales con tecla Esc y a11y]
    end

    subgraph Fase 3: Funcionalidades de Alto Valor
        C1[Botón Presente / Asistencia rápida] --> C2[Exportación a Excel/CSV de Finanzas]
        C2 --> C3[Sistema de Toasts Sonner para feedback visual]
    end

    subgraph Fase 4: Limpieza Arquitectónica
        D1[Modularizar app/rutinas 1870 líneas] --> D2[Extraer MetricCard y componentes a components/ui]
        D2 --> D3[Tipado estricto sin any]
    end

    Fase 1 --> Fase 2 --> Fase 3 --> Fase 4
```

---

## 5. Conclusión

El frontend de Atlas Gym tiene una **calidad estética y de producto muy alta**. Los flujos principales funcionan y los tests garantizan estabilidad.

La prioridad número uno para dar el salto a nivel producción es **aliviar el bundle inicial** (desacoplando el catálogo masivo del store sincrónico) y **sumar los 3 o 4 detalles operativos de un gimnasio del día a día** (asistencia 1-click, exportar a Excel, búsqueda por DNI y confirmaciones visuales).
