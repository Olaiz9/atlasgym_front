/**
 * Datos del responsable de la base de datos (el gimnasio), usados en la Política de
 * Privacidad (/privacidad) que exige la Ley 25.326 de Protección de Datos Personales.
 *
 * COMPLETAR antes de la entrega con los datos reales del cliente. Mientras quede algún
 * valor vacío, la página muestra un aviso de "datos pendientes".
 * (Cuando el sistema sea multi-gimnasio, esto pasa a ser configuración de cada gimnasio.)
 */
export const DATOS_LEGALES = {
  /** Nombre comercial que ven los socios. */
  nombreGimnasio: 'ATLAS Gym',
  /** Razón social o nombre y apellido del titular del comercio. */
  responsable: '',
  cuit: '',
  domicilio: '',
  /** Email o canal donde los socios ejercen sus derechos (acceso, rectificación, supresión). */
  contactoPrivacidad: '',
  /** Fecha de la última actualización de la política (AAAA-MM-DD). */
  actualizada: '2026-11-01',
}

export function datosLegalesPendientes(): string[] {
  const faltan: string[] = []
  if (!DATOS_LEGALES.responsable) faltan.push('responsable (razón social)')
  if (!DATOS_LEGALES.cuit) faltan.push('CUIT')
  if (!DATOS_LEGALES.domicilio) faltan.push('domicilio')
  if (!DATOS_LEGALES.contactoPrivacidad) faltan.push('contacto para consultas de privacidad')
  return faltan
}
