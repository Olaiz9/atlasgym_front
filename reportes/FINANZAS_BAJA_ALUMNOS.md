# Pagos historicos en Finanzas

La tabla administrativa conserva los pagos de alumnos dados de baja y muestra
Alumno dado de baja debajo del nombre. La exportacion CSV incluye la misma
indicacion. Los filtros por mes y los totales no excluyen estos pagos.

La API envia alumnoNombreHistorico y alumnoActivo en cada pago. La ficha
cargada permite reflejar cambios locales de estado; si no esta cargada se usa
alumnoActivo. Un estado ausente o null no demuestra que el alumno este de baja.
El estado PAGADO/PENDIENTE/VENCIDO se conserva independientemente de la baja.

Reiniciar el backend actualizado y recargar el frontend. En Finanzas seleccionar
el mes del pago o Ver todos. Probar con un alumno que tenga un pago previo y
luego darlo de baja: su pago debe seguir visible y sumando en los ingresos si
esta PAGADO, con la etiqueta de baja. No se modifican asistencias ni entrenamientos.

Pruebas: lib/pago-historial.test.ts y app/finanzas/page.test.tsx.