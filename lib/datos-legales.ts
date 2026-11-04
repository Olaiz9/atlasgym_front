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

/**
 * Datos obligatorios que faltan. Decisión 2026-11-01: razón social, CUIT y domicilio son
 * OPCIONALES (los dueños de ATLAS prefirieron no publicarlos; si faltan, la página no los muestra).
 * El contacto sí es obligatorio: sin él, el socio no tiene dónde pedir ver o borrar sus datos.
 */
export function datosLegalesPendientes(datos: typeof DATOS_LEGALES = DATOS_LEGALES): string[] {
  const faltan: string[] = []
  if (!datos.contactoPrivacidad) faltan.push('contacto para consultas de privacidad')
  return faltan
}

/** Cómo se nombra al responsable: la razón social si está, o los titulares del gimnasio. */
export function nombreResponsable(datos: typeof DATOS_LEGALES = DATOS_LEGALES): string {
  return datos.responsable || `los titulares de ${datos.nombreGimnasio}`
}
