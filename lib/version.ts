/**
 * Versión de la app que se muestra en el login.
 *
 * Los valores los inyecta next.config.mjs al compilar:
 *  - NEXT_PUBLIC_APP_VERSION: el campo "version" de package.json (se sube a mano en cada entrega).
 *  - NEXT_PUBLIC_APP_COMMIT: el commit exacto con el que se armó la build. Sirve para saber,
 *    mirando la pantalla, qué código está corriendo en el servidor del gimnasio.
 */
export function textoVersion(version?: string, commit?: string): string {
  const v = version?.trim()
  const c = commit?.trim().slice(0, 7)
  if (!v) return 'versión de desarrollo'
  return c ? `v${v} · ${c}` : `v${v}`
}

export const VERSION_APP = textoVersion(
  process.env.NEXT_PUBLIC_APP_VERSION,
  process.env.NEXT_PUBLIC_APP_COMMIT,
)
