// lib/catalogo-ejercicios.ts
import { VideoTecnica } from './types'
import rawExercises from './data/exercises.json'
import { traducirNombre, traducirMusculo, traducirInstrucciones, generarDescripcionEspanol } from './traductor-ejercicios'

export { type EjercicioCatalogo, CLASICOS_CURADOS } from './clasicos-curados'
import { CLASICOS_CURADOS, EjercicioCatalogo } from './clasicos-curados'

const BODY_PART_MAP: Record<string, VideoTecnica['grupoMuscular']> = {
  chest: 'Pecho',
  back: 'Espalda',
  'upper legs': 'Piernas',
  'lower legs': 'Piernas',
  shoulders: 'Hombros',
  neck: 'Hombros',
  'upper arms': 'Brazos',
  'lower arms': 'Brazos',
  waist: 'Core',
  cardio: 'Piernas',
}

function esEjercicioDeGluteos(raw: { name?: string; targetMuscles?: string[] }): boolean {
  const name = String(raw.name || '').toLowerCase()
  const targets = Array.isArray(raw.targetMuscles)
    ? raw.targetMuscles.map((t) => String(t).toLowerCase())
    : []
  if (targets.includes('abductors')) return true
  if (
    targets.includes('glutes') &&
    !/push[- ]?up|hamstring curl/i.test(name) &&
    /\b(glute|glutes|gluteus|hip thrusts?|hip lift|bridge|abduct|abductor|hip extension|pull[- ]?through|reverse hyper(?: ?extension)?|piriformis|monster walk|pelvic|frog)\b/i.test(
      name
    )
  ) {
    return true
  }
  return false
}

const EQUIPMENT_MAP: Record<string, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuerna',
  cable: 'Polea',
  machine: 'Máquina',
  'body weight': 'Peso corporal',
  'body only': 'Peso corporal',
  band: 'Banda elástica',
  kettlebell: 'Pesa rusa',
  leverage: 'Palanca / Máquina',
  smith: 'Máquina Smith',
  sled: 'Trineo',
  ball: 'Balón',
  roller: 'Rodillo',
}

function capitalizar(str: string): string {
  if (!str) return ''
  return str
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

// Identificadores de los ya cargados para evitar duplicados
const idsCurados = new Set(CLASICOS_CURADOS.map((c) => c.exerciseId))

// ── Mapeo dinámico de los 1.500 ejercicios restantes con traducción al español ──
const EJERCICIOS_RESTANTES: EjercicioCatalogo[] = (rawExercises as any[])
  .filter((raw) => !idsCurados.has(raw.exerciseId))
  .map((raw) => {
    const rawBody = (raw.bodyParts && raw.bodyParts[0]) ? String(raw.bodyParts[0]).toLowerCase() : 'chest'
    const grupo: VideoTecnica['grupoMuscular'] = esEjercicioDeGluteos(raw)
      ? 'Glúteos'
      : (BODY_PART_MAP[rawBody] || 'Core')

    const rawEquip = (raw.equipments && raw.equipments[0]) ? String(raw.equipments[0]).toLowerCase() : 'body weight'
    const equipo = EQUIPMENT_MAP[rawEquip] || capitalizar(rawEquip)

    const nombreTraducido = traducirNombre(raw.name)
    const instruccionesTraducidas = traducirInstrucciones(raw.instructions)
    const musculosPrincipalesTraducidos = Array.isArray(raw.targetMuscles)
      ? raw.targetMuscles.map(traducirMusculo)
      : [grupo]
    const musculosSecundariosTraducidos = Array.isArray(raw.secondaryMuscles)
      ? raw.secondaryMuscles.map(traducirMusculo)
      : []

    const descripcion = generarDescripcionEspanol(
      nombreTraducido,
      grupo,
      equipo,
      musculosPrincipalesTraducidos
    )

    return {
      id: `ex-${raw.exerciseId}`,
      exerciseId: raw.exerciseId,
      titulo: nombreTraducido,
      nombreIngles: raw.name,
      grupoMuscular: grupo,
      duracion: 'Loop GIF',
      formato: 'GIF',
      nivel: 'Técnica estricta',
      equipo: equipo,
      videoUrl: raw.gifUrl,
      gifUrl: raw.gifUrl,
      descripcion: descripcion,
      musculosPrincipales: musculosPrincipalesTraducidos,
      musculosSecundarios: musculosSecundariosTraducidos,
      consejosClave: instruccionesTraducidas.slice(0, 3),
      instruccionesPasoAPaso: instruccionesTraducidas,
    }
  })

/**
 * Catálogo completo unificado de más de 1.500 ejercicios con demostraciones en bucle (GIF).
 */
export const CATALOGO_EJERCICIOS_GIF: EjercicioCatalogo[] = [
  ...CLASICOS_CURADOS,
  ...EJERCICIOS_RESTANTES,
]
