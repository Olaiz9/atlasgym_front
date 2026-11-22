import type { Alumno, Pago } from "./types";

// Indica si el socio asociado al pago se encuentra actualmente dado de baja o fue eliminado.
// La ausencia de una ficha en el listado no demuestra una baja.
export function alumnoDePagoEstaDeBaja(pago: Pago, alumno?: Alumno): boolean {
  return (alumno?.activo ?? pago.alumnoActivo) === false;
}

// El nombre actual de la ficha manda: si el titular lo corrige, finanzas lo muestra corregido.
// El nombre guardado al cobrar solo se usa si la ficha ya no está (socio eliminado).
export function nombreDelPago(pago: Pago, alumno?: Alumno): string {
  return alumno?.nombre || pago.alumnoNombreHistorico || "Alumno Atlas";
}
