// lib/mock-data.ts
// Datos de ejemplo. Cuando exista el backend, esto se reemplaza por fetch
// y los ids pasan a ser los que devuelva la base de datos real.
import { Alumno, Pago } from "./types";

export const ALUMNOS_MOCK: Alumno[] = [
  { id: "a1", nombre: "Lucía Fernández", email: "lucia.fernandez@mail.com", celular: "2611234567", plan: "Musculación", fechaAlta: "2026-03-14", activo: true, ultimaAsistencia: "2026-08-29" },
  { id: "a2", nombre: "Martín Torres", email: "martin.torres@mail.com", celular: "2612345678", plan: "Full Access", fechaAlta: "2026-01-08", activo: true, ultimaAsistencia: "2026-08-30" },
  { id: "a3", nombre: "Sofía Ramírez", email: "sofia.ramirez@mail.com", celular: "2613456789", plan: "Funcional", fechaAlta: "2026-05-22", activo: true, ultimaAsistencia: "2026-08-10" },
  { id: "a4", nombre: "Diego Castro", email: "diego.castro@mail.com", celular: "2614567890", plan: "Musculación", fechaAlta: "2026-07-01", activo: true, ultimaAsistencia: "2026-08-27" },
  { id: "a5", nombre: "Valentina Ríos", email: "valentina.rios@mail.com", celular: "2615678901", plan: "Full Access", fechaAlta: "2026-06-15", activo: true, ultimaAsistencia: undefined },
];

export const PAGOS_MOCK: Pago[] = [
  { id: "1", alumnoId: "a1", plan: "Musculación", monto: 15000, fecha: "2026-08-20", metodo: "Transferencia", estado: "PAGADO" },
  { id: "2", alumnoId: "a2", plan: "Full Access", monto: 22000, fecha: "2026-08-18", metodo: "Efectivo", estado: "PAGADO" },
  { id: "3", alumnoId: "a3", plan: "Funcional", monto: 18000, fecha: "2026-08-05", metodo: "Tarjeta", estado: "VENCIDO" },
  { id: "4", alumnoId: "a4", plan: "Musculación", monto: 15000, fecha: "2026-08-25", metodo: "-", estado: "PENDIENTE" },
  { id: "5", alumnoId: "a5", plan: "Full Access", monto: 22000, fecha: "2026-08-25", metodo: "-", estado: "PENDIENTE" },
  { id: "6", alumnoId: "a1", plan: "Musculación", monto: 15000, fecha: "2026-07-19", metodo: "Transferencia", estado: "PAGADO" },
  { id: "7", alumnoId: "a2", plan: "Full Access", monto: 22000, fecha: "2026-07-17", metodo: "Efectivo", estado: "PAGADO" },
];
