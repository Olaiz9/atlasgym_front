# 📋 Bitácora de Desarrollo y Reporte de Calidad — Rama Bruno (`ramaBruno`)
**Proyecto:** ATLAS GYM Frontend  
**Responsable:** Bruno  
**Metodología:** Verificación continua de tests (`vitest` + `react-doctor`) y documentación obligatoria en tiempo real con exportación a PDF.

---

## 🎯 Protocolo de Trabajo y Estándares de Entrega

Para cada cambio, nueva funcionalidad o corrección en el proyecto:
1. **Desarrollo en `ramaBruno`:** Ningún cambio se realiza directamente en `develop` ni en ramas ajenas.
2. **Batería de Tests y Calidad Obligatoria:**
   - 🧪 **Vitest:** Ejecución de suite de pruebas unitarias y de componentes (`npm test`).
   - 🩺 **React Doctor:** Auditoría estricta de buenas prácticas, hooks y performance (`npx react-doctor@latest`).
3. **Registro en Bitácora:** Documentar qué se cambió, por qué y en qué archivos.
4. **Generación Automática del PDF:** Compilación de la bitácora a formato PDF imprimible de alta fidelidad (`BITACORA_BRUNO.pdf`).
5. **Push Seguro:** Publicación de los commits exclusivamente en `origin/ramaBruno`.

---

## 📌 Registro de Actividades y Reportes

### Hito 1: Preparación de Entorno, Sincronización de Rama y Validación de Tests
* **Fecha:** 06 de Septiembre de 2026
* **Solicitud de Bruno:**
  > *"Instalame vitest en la terminal"*  
  > *"A partir de ahora cada cambio que hagamos, solo lo subas a mi rama 'ramaBruno' para evitar problemas de versiones"*  
  > *"Mi compañero cada vez que hace un cambio se asegura de que pasen con éxito los dos tests (react doctor y vitest) y además que le cree un documento de reporte de los tests aprobados y qué fue lo que se cambió y por qué. Necesito que los reportes sean siempre en PDF..."*

* **¿Qué se hizo?**
  1. Se instalaron todas las dependencias del proyecto (`npm install`) dejando operativo `vitest v5.0.0` con `@testing-library/react` y `jsdom`.
  2. Se configuró y sincronizó la rama `ramaBruno` con la base actualizada de `origin/develop` vía fast-forward limpio sin conflictos.
  3. Se ejecutaron las dos suites de calidad requeridas: Vitest y React Doctor.
  4. Se estableció el pipeline automatizado de generación de reportes en PDF (`BITACORA_BRUNO.pdf`).

* **¿Por qué se hizo?**
  - Para aislar el trabajo de Bruno en su propia rama y prevenir desajustes de versiones con Lucas y Augusto.
  - Para garantizar que todo código que ingrese cumpla con los estándares de calidad del equipo antes de ser compartido.

* **Archivos afectados / creados:**
  - 📁 `BITACORA_BRUNO.md`: Bitácora viva en formato Markdown.
  - 📁 `BITACORA_BRUNO.html`: Plantilla de diseño corporativo optimizada para impresión A4.
  - 📁 `BITACORA_BRUNO.pdf`: Reporte en PDF exportado para revisión y entrega.

* **Resultados de Verificación y Calidad:**
  - 🧪 **Vitest (`npm test`):**
    - Archivos de prueba: `2 passed (2)`
    - Tests ejecutados: `10 passed (10)`
    - Estado: **100% APROBADO (0 fallos)**
  - 🩺 **React Doctor (`npx react-doctor`):**
    - Archivos escaneados: `32 archivos`
    - Score de salud: **100 / 100 (Great)**
    - Diagnóstico: **0 advertencias, 0 errores, No issues found!**

---

### Hito 2: Organización y Centralización de Reportes y Bitácoras
* **Fecha:** 06 de Septiembre de 2026
* **Solicitud de Bruno:**
  > *"Todos los archivos que veas que son de 'Bitácora', 'Reporte', 'Changelog', etc.. Necesito que los agrupes en una sola carpeta que quede como archivos de reportes para evitar que estén sueltos por las ramas."*

* **¿Qué se hizo?**
  1. Se creó el directorio dedicado 📁 `reportes/` en la raíz del repositorio.
  2. Se reubicaron mediante `git mv` todos los documentos de bitácoras, changelogs y reportes PDF/HTML de todo el proyecto:
     - `CHANGELOG_ATLAS.md`, `CHANGELOG_ATLAS.html`, `CHANGELOG_ATLAS.pdf`
     - `BITACORA_BRUNO.md`, `BITACORA_BRUNO.html`, `BITACORA_BRUNO.pdf`
  3. Se actualizaron las referencias relativas internas para mantener la compilación autónoma de PDFs en la nueva carpeta.

* **¿Por qué se hizo?**
  - Para evitar la polución de archivos sueltos en el directorio raíz del proyecto.
  - Para mantener una estructura limpia, escalable y ordenada que facilite la revisión tanto para Bruno como para el resto del equipo en futuros merges.

* **Archivos afectados / movidos:**
  - 📁 `reportes/CHANGELOG_ATLAS.md` (reubicado)
  - 📁 `reportes/CHANGELOG_ATLAS.html` (reubicado)
  - 📁 `reportes/CHANGELOG_ATLAS.pdf` (reubicado)
  - 📁 `reportes/BITACORA_BRUNO.md` (reubicado y actualizado)
  - 📁 `reportes/BITACORA_BRUNO.html` (reubicado y actualizado)
  - 📁 `reportes/BITACORA_BRUNO.pdf` (reubicado y recompilado)

* **Resultados de Verificación y Calidad:**
  - 🧪 **Vitest (`npm test`):**
    - Archivos de prueba: `2 passed (2)`
    - Tests ejecutados: `10 passed (10)`
    - Estado: **100% APROBADO (0 fallos)**
  - 🩺 **React Doctor (`npx react-doctor`):**
    - Archivos escaneados: `32 archivos`
    - Score de salud: **100 / 100 (Great)**
    - Diagnóstico: **0 advertencias, 0 errores, No issues found!**

---

### Hito 3: Registro de Entrenos (Pesos y Reps), Historial Previo y Visor de Técnica Inline
* **Fecha:** 08 de Septiembre de 2026
* **Solicitud de Bruno:**
  > *"Se me ocurrió añadir una característica en la parte de rutinas en el portal de alumnos. La cual se basa en poder registrar los pesos y repeticiones que vas haciendo y marcarlas como finalizadas una vez que termines. A su vez, la idea es que esa información quede registrada para que el usuario la próxima vez que haga esa rutina, pueda recordar cómo le fue en progreso. El ejemplo sería como está en la imagen que te pasé, obviamente respetando la estética y color de nuestra app ATLAS. Y por último, necesitaría que por cada ejercicio en la rutina, se pueda visualizar el video/gif de la técnica de ese ejercicio sin tener que irnos a buscar en la videoteca."*

* **Desarrollo por Fases Ejecutadas:**
  1. **Fase 1 — Modelo de Datos y Persistencia de Sesiones:**
     - Creación de las interfaces `RegistroSerie`, `SesionEjercicio` y `SesionEntrenamiento` en `lib/types.ts`.
     - Carga de `SESIONES_MOCK` en `lib/mock-data.ts` con entrenamientos previos de Lucía (`a1`) para poblar la columna "Previa".
     - Implementación en `lib/store.tsx` del estado `sesionesEntrenamiento` hidratado desde `localStorage` (`atlas_historial_v1`), con sincronización automática pura vía `useEffect` y las acciones `guardarSesion()` y `getUltimaSesion()`.
  2. **Fase 2 — UI de Registro de Series en la Vista del Alumno:**
     - Creación del componente `TarjetaEjercicioAlumno` con tabla interactiva: **Serie | Previa | KG | REPS | ✓**.
     - Inputs editables con tipografía monospace y diseño adaptado a la estética ATLAS (`slate-950` con acentos `blue-600`).
     - Botón circular de check (✓) con cambio de estado visual y resaltado de fila.
     - Contador en tiempo real y barra animada de progreso del día (`transition-[width]`).
     - Botón "Guardar Entreno" con feedback instantáneo (`¡Entreno guardado!`).
  3. **Fase 3 — Visor de Video de Técnica Inline:**
     - Creación de `lib/rutina-utils.ts` con la función `buscarVideoParaEjercicio()` para matching automático de ejercicios con la videoteca.
     - Botón "Ver técnica del ejercicio 🎥" en cada tarjeta de ejercicio con tutorial disponible.
     - Componente `ModalVideoTecnica` con reproductor YouTube (16:9) y listado de consejos biomecánicos clave.
  4. **Fase 4 — Calidad, Tests y Documentación:**
     - Creación de la suite de tests unitarios `lib/rutina-utils.test.ts` con 7 pruebas automáticas.
     - Ejecución y aprobación de Vitest al 100% y React Doctor con Score 100/100.
     - Compilación de la bitácora a PDF y publicación en `ramaBruno`.

* **Archivos afectados / creados:**
  - 📁 `lib/types.ts`: Nuevas interfaces de historial de entrenamiento.
  - 📁 `lib/mock-data.ts`: Datos iniciales de sesiones previas en `SESIONES_MOCK`.
  - 📁 `lib/store.tsx`: Estado, persistencia y métodos `guardarSesion` y `getUltimaSesion`.
  - 📁 `lib/rutina-utils.ts` [NUEVO]: Lógica reutilizable de búsqueda y formateo.
  - 📁 `lib/rutina-utils.test.ts` [NUEVO]: Tests unitarios para las funciones de rutina.
  - 📁 `app/rutinas/page.tsx`: Componentes `TarjetaEjercicioAlumno`, `ModalVideoTecnica` y vista `VistaMiRutinaAlumno`.
  - 📁 `reportes/BITACORA_BRUNO.md`: Registro del hito en Markdown.
  - 📁 `reportes/BITACORA_BRUNO.html`: Template visual actualizado.
  - 📁 `reportes/BITACORA_BRUNO.pdf`: Reporte en PDF consolidado y regenerado.

* **Resultados de Verificación y Calidad:**
  - 🧪 **Vitest (`npm test`):**
    - Archivos de prueba: `4 passed (4)` — *+1 archivo nuevo de test*
    - Tests ejecutados: `28 passed (28)` — *+7 tests nuevos aprobados*
    - Estado: **100% APROBADO (0 fallos)**
  - 🩺 **React Doctor (`npx react-doctor`):**
    - Archivos escaneados: `40 archivos`
    - Score de salud: **100 / 100 (Great)**
    - Diagnóstico: **0 advertencias, 0 errores, No issues found!**

---

### Hito 4: Optimización UI con Acordeón en Cortinas y Guardado Parcial con Confirmación
* **Fecha:** 08 de Septiembre de 2026
* **Solicitud de Bruno:**
  > *"- Qué pasa si no termino todo y le doy a guardar?
  - Me gustaría que las cartas de los ejercicios me fueran saliendo en un tipo desplegable de cortinas y no estén una al lado de la otra así ahorramos espacio."*

* **Desarrollo por Fases Ejecutadas:**
  1. **Fase 1 — Acordeón Desplegable en Cortinas para Ejercicios:**
     - Reemplazo de la cuadrícula horizontal de dos columnas por una lista vertical en acordeón (`flex flex-col gap-3.5`) que optimiza drásticamente el espacio en pantalla y en dispositivos móviles.
     - Cabecera compacta clickeable con número identificador, nombre del ejercicio, badge dinámico de estado (`✓ Completado`, `X/Y series` o total de series), descanso (`⏱ 90s`) y flecha chevron animada.
     - Despliegue suave al tocar cualquier ejercicio mostrando notas técnicas, tabla completa de series y acceso al video biomecánico.
     - Modularización de la tarjeta en `BadgeEstadoEjercicio`, `TablaSeries` y `TarjetaEjercicioAlumno` para mantener una complejidad de control baja y arquitectura limpia.
  2. **Fase 2 — Manejo de Guardado Parcial / Incompleto:**
     - Detección en tiempo real de ejercicios y series completadas al presionar "Guardar Entreno".
     - Creación de `ModalConfirmarIncompleto` con alerta amigable detallando exactamente cuántos ejercicios/series faltan completar.
     - Opciones claras: **"Seguir entrenando"** para volver a la rutina o **"Guardar progreso parcial"** para persistir en `localStorage` únicamente las series efectivamente realizadas sin perder el trabajo del día.
     - Estados visuales en el botón de acción: *"Guardar Entreno"*, *"Finalizar y Guardar Entreno"*, *"¡Entrenamiento completado! 🎉"* y *"¡Progreso parcial guardado!"*.
  3. **Fase 3 — Calidad, Tests y Documentación:**
     - Auditoría y validación estricta de React Doctor (Score 100/100).
     - Validación completa de la suite Vitest (28 tests aprobados).
     - Actualización de bitácoras Markdown/HTML y recompilación del PDF.

* **Archivos afectados / creados:**
  - 📁 `app/rutinas/page.tsx`: Componentes `BadgeEstadoEjercicio`, `TablaSeries`, `ModalConfirmarIncompleto`, `TarjetaEjercicioAlumno` y vista `VistaMiRutinaAlumno`.
  - 📁 `reportes/BITACORA_BRUNO.md`: Registro del hito en Markdown.
  - 📁 `reportes/BITACORA_BRUNO.html`: Template visual corporativo actualizado.
  - 📁 `reportes/BITACORA_BRUNO.pdf`: Reporte en PDF regenerado.

* **Resultados de Verificación y Calidad:**
  - 🧪 **Vitest (`npm test`):**
    - Archivos de prueba: `4 passed (4)`
    - Tests ejecutados: `28 passed (28)`
    - Estado: **100% APROBADO (0 fallos)**
  - 🩺 **React Doctor (`npx react-doctor`):**
    - Archivos escaneados: `40 archivos`
    - Score de salud: **100 / 100 (Great)**
    - Diagnóstico: **0 advertencias, 0 errores, No issues found!**

---

### 5. Corrección Integral de Baches Funcionales y Experiencia de Usuario (Post-Merge con ramaLucas)
* **Fecha:** 10 de Septiembre de 2026
* **Contexto de Integración:** Luego de la incorporación de los cambios de `ramaLucas` mediante merge limpio en `ramaBruno`, se ejecutó una auditoría funcional integral y se subsanaron 5 requerimientos críticos de interacción y usabilidad del sistema:

* **Desarrollo por Fases Ejecutadas:**
  1. **Fase 1 — Corrección del Selector de Plan en Registro de Alumnos (`ModalNuevoAlumno`):**
     - **Causa Raíz:** `@base-ui/react/select` renderizaba el menú desplegable en el `<body>` vía portal (`SelectPrimitive.Portal`). Al encontrarse dentro de una etiqueta nativa `<dialog>` abierta con `.showModal()`, la API *Top Layer* del navegador bloqueaba los eventos del puntero y foco en el menú portaleado.
     - **Solución:** Reemplazo por un `<select>` nativo accesible y estilizado con la paleta oscura de ATLAS, con enlace reactivo a los planes activos de `useAppData()`.
  2. **Fase 2 — Autocompletado de Plan, Monto y Celular en "Registrar Pago" (`ModalRegistrarPago`):**
     - Inyección de la colección de `planes` en el formulario de cobro dentro de `app/finanzas/page.tsx`.
     - Detección automática del plan asignado cruzando `planId` o el nombre del plan con la lista maestra de precios. Al seleccionar un alumno, se completan en tiempo real el plan, el monto oficial correspondiente y el teléfono de WhatsApp.
     - Modularización de la sección de mensajería en el subcomponente `SeccionNotificarWhatsapp`.
  3. **Fase 3 — Modales Estilizados de Confirmación Previa en Videoteca y Planes:**
     - Erradicación de las ventanas emergentes nativas del navegador (`window.confirm()`) que mostraban el alert genérico de `localhost`.
     - Implementación de `ModalConfirmarEliminarVideo` en `app/videoteca/page.tsx` y `ModalConfirmarEliminarPlan` en `app/planes/page.tsx`, con backdrop oscuro desenfocado (`backdrop-blur-sm`), tarjeta `bg-slate-900`, icono de alerta en `bg-rose-500/10` y confirmación destructiva.
  4. **Fase 4 — Integración del Catálogo de Videoteca en Creador de Rutinas (`ModalNuevaRutina`):**
     - Se vinculó `videosTecnica` a la interfaz de creación de rutinas en `app/rutinas/page.tsx`.
     - Inclusión de un selector rápido `+ Desde Videoteca...` categorizado por grupos musculares (`Pecho`, `Espalda`, `Piernas`, `Hombros`, `Brazos`, `Core`) que inserta el ejercicio directamente con valores base (3 series, 10-12 reps, 60s descanso).
     - Vinculación de un `<datalist id="lista-ejercicios-videoteca">` en cada fila de ejercicio para autocompletado en tiempo real mientras el profesor escribe.
     - Desacople de la tarjeta de día en `TarjetaDiaRutina` para mantener la mantenibilidad óptima en React Doctor.
  5. **Fase 5 — Descarte Automático de Badge de Notificaciones al Entrar a Avisos:**
     - En `app/avisos/page.tsx`, adición de un `useEffect` que dispara `marcarTodosAvisosLeidos(usuarioActual.id)` al ingresar al módulo.
     - Optimización en `lib/use-avisos.ts` con la guarda `hayNoLeidos`, previniendo escrituras redundantes en `localStorage` o re-renders innecesarios.
     - El badge circular rojo con el conteo de no leídos desaparece instantáneamente del Sidebar, Mobile Nav y Header al acceder a la pantalla.

* **Archivos afectados:**
  - 📁 `components/modal-nuevo-alumno.tsx`: Selector nativo accesible de planes dentro de dialog.
  - 📁 `app/finanzas/page.tsx`: Autocompletado de tarifa y plan en cobro; extracción de `SeccionNotificarWhatsapp`.
  - 📁 `app/videoteca/page.tsx`: Componente `ModalConfirmarEliminarVideo`.
  - 📁 `app/planes/page.tsx`: Componente `ModalConfirmarEliminarPlan`.
  - 📁 `app/rutinas/page.tsx`: Selector y datalist de videoteca en rutina; subcomponente `TarjetaDiaRutina`.
  - 📁 `app/avisos/page.tsx`: Efecto de lectura global de avisos al ingresar.
  - 📁 `lib/use-avisos.ts`: Guarda reactiva `hayNoLeidos` en `marcarTodosAvisosLeidos`.
  - 📁 `reportes/BITACORA_BRUNO.md`: Documentación del Hito 5.
  - 📁 `reportes/BITACORA_BRUNO.html`: Actualización visual de bitácora.
  - 📁 `reportes/BITACORA_BRUNO.pdf`: Recompilación del informe ejecutivo en PDF.

* **Resultados de Verificación y Calidad (Doble Suite):**
  - 🧪 **Vitest (`npm test`):**
    - Archivos de prueba: `9 passed (9)`
    - Tests ejecutados: `66 passed (66)`
    - Estado: **100% APROBADO (0 fallos)**
  - 🩺 **React Doctor (`npx react-doctor`):**
    - Archivos escaneados: `48 archivos`
    - Score de salud: **100 / 100 (Great)**
    - Diagnóstico: **0 advertencias, 0 errores, No issues found!**

