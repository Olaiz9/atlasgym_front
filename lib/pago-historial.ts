import type { Alumno, Pago } from "./types";

// La ausencia de una ficha en el listado no demuestra una baja.
export function alumnoDePagoEstaDeBaja(pago: Pago, alumno?: Alumno): boolean {
  return (alumno?.activo ?? pago.alumnoActivo) === false;
}

export function nombreHistoricoDelPago(pago: Pago, alumno?: Alumno): string {
  return pago.alumnoNombreHistorico || alumno?.nombre || "Alumno Atlas";
}