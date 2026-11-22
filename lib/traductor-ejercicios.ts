// lib/traductor-ejercicios.ts
// Motor de traducción y normalización biomecánica al español para ejercicios, músculos e instrucciones.

const MAPA_EQUIPOS_PREFIJO: [RegExp, string][] = [
  [/^barbell\s+/i, 'con barra'],
  [/^dumbbell\s+/i, 'con mancuerna'],
  [/^dumbbells\s+/i, 'con mancuernas'],
  [/^cable\s+/i, 'en polea'],
  [/^band\s+/i, 'con banda elástica'],
  [/^bands\s+/i, 'con bandas'],
  [/^kettlebell\s+/i, 'con pesa rusa'],
  [/^smith\s+(machine\s+)?/i, 'en máquina Smith'],
  [/^lever(age)?\s+/i, 'en máquina de palanca'],
  [/^machine\s+/i, 'en máquina'],
  [/^body weight\s+/i, 'con peso corporal'],
  [/^bodyweight\s+/i, 'con peso corporal'],
  [/^suspension\s+/i, 'en suspensión / TRX'],
  [/^stability ball\s+/i, 'en fitball'],
  [/^bosu( ball)?\s+/i, 'en bosu'],
  [/^medicine ball\s+/i, 'con balón medicinal'],
  [/^foam roll(er)?\s+/i, 'con rodillo'],
  [/^ez barbell\s+/i, 'con barra Z'],
  [/^trap bar\s+/i, 'con barra hexagonal'],
  [/^rope\s+/i, 'con soga'],
  [/^sled\s+/i, 'en prensa / trineo'],
  [/^assisted\s+/i, 'asistido'],
  [/^weighted\s+/i, 'con lastre'],
  [/^resistance band\s+/i, 'con banda elástica'],
  [/^exercise ball\s+/i, 'en fitball'],
]

const DICCIONARIO_MOVIMIENTOS: [RegExp, string][] = [
  // Presses
  [/\bincline bench press\b/gi, 'press de banca inclinado'],
  [/\bdecline bench press\b/gi, 'press de banca declinado'],
  [/\bbench press\b/gi, 'press de banca plano'],
  [/\bincline chest press\b/gi, 'press de pecho inclinado'],
  [/\bdecline chest press\b/gi, 'press de pecho declinado'],
  [/\bclose grip to skull press\b/gi, 'press francés con agarre estrecho'],
  [/\bclose grip bench press\b/gi, 'press de banca con agarre estrecho'],
  [/\bskull crusher\b/gi, 'press francés (skull crusher)'],
  [/\bskull press\b/gi, 'press francés'],
  [/\bchest press\b/gi, 'press de pecho'],
  [/\bshoulder press\b/gi, 'press militar de hombros'],
  [/\bmilitary press\b/gi, 'press militar'],
  [/\boverhead press\b/gi, 'press sobre la cabeza'],
  [/\barnold press\b/gi, 'press Arnold'],
  [/\bpress sit-up\b/gi, 'abdominales sit-up con press'],

  // Flexiones y dominadas
  [/\bpush[- ]?up(s)?\b/gi, 'flexiones de brazos'],
  [/\bpull[- ]?up(s)?\b/gi, 'dominadas pronas'],
  [/\bchin[- ]?up(s)?\b/gi, 'dominadas supinas'],
  [/\blat pulldown\b/gi, 'jalón dorsal al pecho'],
  [/\bpulldown(s)?\b/gi, 'jalón dorsal'],

  // Remos y tirones
  [/\bbent over row\b/gi, 'remo inclinado'],
  [/\bseated row\b/gi, 'remo sentado'],
  [/\bupright row\b/gi, 'remo al mentón'],
  [/\brows?\b/gi, 'remo'],
  [/\bshrugs?\b/gi, 'encogimientos de hombros'],
  [/\bface pulls?\b/gi, 'face pull al rostro'],

  // Brazos (bíceps y tríceps)
  [/\bhammer curls?\b/gi, 'curl martillo'],
  [/\bpreacher curls?\b/gi, 'curl Scott (predicador)'],
  [/\bconcentration curls?\b/gi, 'curl concentrado'],
  [/\bfinger curls?\b/gi, 'curl de antebrazos / dedos'],
  [/\breverse (one arm )?curls?\b/gi, 'curl inverso'],
  [/\bbiceps? curls?\b/gi, 'curl de bíceps'],
  [/\bcurls?\b/gi, 'curl'],
  [/\btriceps? extensions?\b/gi, 'extensión de tríceps'],
  [/\bpushdowns?\b/gi, 'extensión de tríceps en polea'],
  [/\bkickbacks?\b/gi, 'patada de tríceps'],
  [/\bdips?\b/gi, 'fondos en paralelas'],

  // Piernas y glúteos
  [/\bfront squats?\b/gi, 'sentadilla frontal'],
  [/\bback squats?\b/gi, 'sentadilla trasera'],
  [/\bgoblet squats?\b/gi, 'sentadilla goblet'],
  [/\bhack squats?\b/gi, 'sentadilla hack'],
  [/\bsplit squats?\b/gi, 'sentadilla búlgara'],
  [/\bsumo squats?\b/gi, 'sentadilla sumo'],
  [/\bsquats?\b/gi, 'sentadilla'],
  [/\bwalking lunges?\b/gi, 'estocadas caminando'],
  [/\breverse lunges?\b/gi, 'estocadas hacia atrás'],
  [/\bforward lunges?\b/gi, 'estocadas frontales'],
  [/\blunges?\b/gi, 'estocadas'],
  [/\bromanian deadlifts?\b/gi, 'peso muerto rumano'],
  [/\bstiff leg deadlifts?\b/gi, 'peso muerto piernas rígidas'],
  [/\bsumo deadlifts?\b/gi, 'peso muerto sumo'],
  [/\bdeadlifts?\b/gi, 'peso muerto'],
  [/\bleg press\b/gi, 'prensa de piernas'],
  [/\bleg extensions?\b/gi, 'sillón de cuádriceps / extensiones'],
  [/\bleg curls?\b/gi, 'camilla de femorales / curl femoral'],
  [/\bstanding calf raises?\b/gi, 'elevación de gemelos de pie'],
  [/\bseated calf raises?\b/gi, 'elevación de gemelos sentado'],
  [/\bcalf raises?\b/gi, 'elevación de gemelos'],
  [/\bhip thrust\b/gi, 'empuje de cadera (hip thrust)'],
  [/\bglute bridge\b/gi, 'puente de glúteos'],
  [/\bhang clean\b/gi, 'cargada colgante (hang clean)'],

  // Hombros
  [/\blateral raises?\b/gi, 'vuelos laterales'],
  [/\bfront raises?\b/gi, 'vuelos frontales'],
  [/\brear delt (fly|raises?)\b/gi, 'vuelos posteriores (pájaros)'],
  [/\bfly(es)?\b/gi, 'aperturas'],
  [/\bpec deck\b/gi, 'mariposa en pec deck'],

  // Core / Abdomen
  [/\bcrunches?\b/gi, 'abdominales crunch'],
  [/\bside planks?\b/gi, 'plancha lateral'],
  [/\bplanks?\b/gi, 'plancha abdominal'],
  [/\bhanging leg raises?\b/gi, 'elevación de piernas colgado'],
  [/\bleg raises?\b/gi, 'elevación de piernas'],
  [/\brussian twists?\b/gi, 'giros rusos'],
  [/\bab wheel rollout\b/gi, 'rueda abdominal'],

  // Modificadores de ejecución
  [/\bseated\b/gi, 'sentado'],
  [/\bstanding\b/gi, 'de pie'],
  [/\blying\b/gi, 'acostado'],
  [/\bkneeling\b/gi, 'arrodillado'],
  [/\bincline\b/gi, 'inclinado'],
  [/\bdecline\b/gi, 'declinado'],
  [/\bflat\b/gi, 'plano'],
  [/\bone arm\b/gi, 'a un brazo'],
  [/\bsingle arm\b/gi, 'a un brazo'],
  [/\bone leg\b/gi, 'a una pierna'],
  [/\bsingle leg\b/gi, 'a una pierna'],
  [/\balternating\b/gi, 'alternado'],
  [/\bdouble\b/gi, 'doble'],
  [/\bclose grip\b/gi, 'agarre estrecho'],
  [/\bwide grip\b/gi, 'agarre ancho'],
  [/\breverse grip\b/gi, 'agarre supino / invertido'],
  [/\bneutral grip\b/gi, 'agarre neutro'],
  [/\boverhead\b/gi, 'sobre la cabeza'],
  [/\bbehind (the )?neck\b/gi, 'tras nuca'],
  [/\bcontralateral\b/gi, 'contralateral'],
  [/\binside leg kick\b/gi, 'con patada interna'],
  [/\bagainst wall\b/gi, 'contra la pared'],
  [/\bon (stability |bosu |exercise )?ball\b/gi, 'sobre fitball'],
  [/\bwith rope( attachment)?\b/gi, 'con soga'],
  [/\bwith arm blaster\b/gi, 'con soporte de bíceps'],
  [/\bwith support\b/gi, 'con apoyo'],
  [/\btwo legs on bench\b/gi, 'apoyado en banco'],
  [/\bon (flat )?bench\b/gi, 'en banco'],
  [/\bon floor\b/gi, 'en suelo'],
  [/\bon knees\b/gi, 'de rodillas'],
  [/\bhip thrusts?\b/gi, 'empuje de cadera (hip thrust)'],
  [/\bhip abduction\b/gi, 'abducción de cadera'],
  [/\bhip adduction\b/gi, 'aducción de cadera'],
  [/\bhip extension\b/gi, 'extensión de cadera (patada de glúteo)'],
  [/\bhip lift\b/gi, 'elevación de cadera'],
  [/\bpull[- ]?through\b/gi, 'pull through de glúteos'],
  [/\breverse hyper( ?extension)?\b/gi, 'hiperextensión inversa de glúteos'],
  [/\bhyperextensions?\b/gi, 'hiperextensiones lumbares'],
  [/\bgood morning\b/gi, 'buenos días'],
  [/\bstep[- ]?ups?\b/gi, 'subida al cajón'],
  [/\bmonster walk\b/gi, 'caminata lateral con banda'],
  [/\bpelvic tilt\b/gi, 'retroversión pélvica'],
  [/\bpiriformis\b/gi, 'piriforme / glúteo'],
  [/\bpullovers?\b/gi, 'pullover'],
  [/\breverse wrist curls?\b/gi, 'curl de muñeca inverso'],
  [/\bwrist curls?\b/gi, 'curl de muñeca'],
  [/\bwrist roller\b/gi, 'rodillo de muñeca y antebrazo'],
  [/\bsit[- ]?ups?\b/gi, 'abdominales sit-up'],
  [/\bab rollerout\b/gi, 'rueda abdominal'],
  [/\bpallof press\b/gi, 'press Pallof antirrotación'],
  [/\bdead bug\b/gi, 'bicho muerto (dead bug)'],
  [/\breverse fly(es)?\b/gi, 'vuelos posteriores'],
  [/\brear lateral raises?\b/gi, 'vuelos posteriores'],
  [/\brear delt rows?\b/gi, 'remo al deltoides posterior (face pull)'],
  [/\brear delt\b/gi, 'deltoides posterior'],
  [/\bclose[- ]?grip\b/gi, 'agarre estrecho'],
  [/\bwide[- ]?grip\b/gi, 'agarre ancho'],
  [/\bnarrow[- ]?(grip|stance)\b/gi, 'posición cerrada'],
  [/\bclean[- ]?grip\b/gi, 'agarre olímpico'],
  [/\bunderhand( grip)?\b/gi, 'agarre supino'],
  [/\boverhand( grip)?\b/gi, 'agarre prono'],
  [/\brevers(e)? grip\b/gi, 'agarre invertido'],
  [/\balternate\b/gi, 'alternado'],
  [/\btwo arms?\b/gi, 'a dos brazos'],
  [/\btwo legs?\b/gi, 'a dos piernas'],
  [/\bstraight legs?\b/gi, 'piernas extendidas'],
  [/\bstraight arms?\b/gi, 'brazos extendidos'],
  [/\bbent[- ]?over\b/gi, 'inclinado'],
  [/\bbent knees?\b/gi, 'rodillas flexionadas'],
  [/\bweighted\b/gi, 'con lastre'],
  [/\bassisted\b/gi, 'asistido'],
  [/\bsuspended\b/gi, 'en suspensión'],
  [/\bresistance band\b/gi, 'con banda elástica'],
  [/\bexercise ball\b/gi, 'con fitball'],
  [/\bmedicine ball\b/gi, 'con balón medicinal'],
  [/\bstability ball\b/gi, 'con fitball'],
  [/\bstretch(es)?\b/gi, 'estiramiento'],
  [/\bjump(ing)?\b/gi, 'con salto'],
  [/\btwist(ing)?\b/gi, 'con giro'],
  [/\brotation\b/gi, 'rotación'],
  [/\bprone\b/gi, 'boca abajo'],
  [/\bsupine\b/gi, 'boca arriba'],
  [/\bparallel\b/gi, 'en paralelas'],
  [/\bouter hip abductor\b/gi, 'abductor de cadera'],
  [/\babductor\b/gi, 'abductor'],
  [/\badductor\b/gi, 'aductor'],
  [/\bglutes?\b/gi, 'glúteos'],
  [/\bgluteus\b/gi, 'glúteos'],
  [/\bhamstrings?\b/gi, 'isquiotibiales'],
  [/\bcalves\b/gi, 'gemelos'],
  [/\bcalf\b/gi, 'gemelos'],
  [/\bchest\b/gi, 'pecho'],
  [/\bshoulder(s)?\b/gi, 'hombros'],
  [/\btriceps?\b/gi, 'tríceps'],
  [/\bbiceps?\b/gi, 'bíceps'],
  [/\bforearms?\b/gi, 'antebrazos'],
  [/\babs\b/gi, 'abdominales'],
  [/\bback\b/gi, 'espalda'],
  [/\bfront\b/gi, 'frontal'],
  [/\bside\b/gi, 'lateral'],
  [/\brear\b/gi, 'posterior'],
  [/\bhigh\b/gi, 'alto'],
  [/\blow\b/gi, 'bajo'],
  [/\bwide\b/gi, 'amplio'],
  [/\bfull\b/gi, 'completo'],
  [/\bdeep\b/gi, 'profundo'],
  [/\bbridge\b/gi, 'puente'],
  [/\braises?\b/gi, 'elevaciones'],
  [/\bextensions?\b/gi, 'extensión'],
  [/\bpress\b/gi, 'press'],
  [/\bbarbell\b/gi, 'con barra'],
  [/\bdumbbells?\b/gi, 'con mancuerna'],
  [/\bcable\b/gi, 'en polea'],
  [/\bband\b/gi, 'con banda'],
  [/\bkettlebell\b/gi, 'con pesa rusa'],
  [/\blever(age)?\b/gi, 'en máquina'],
  [/\bmachine\b/gi, 'en máquina'],
  [/\bsmith\b/gi, 'en máquina Smith'],
  [/\bsled\b/gi, 'en prensa'],
  [/\bbench\b/gi, 'en banco'],
  [/\bfloor\b/gi, 'en suelo'],
  [/\bwall\b/gi, 'en pared'],
  [/\brope\b/gi, 'con soga'],
]

const DICCIONARIO_MUSCULOS: Record<string, string> = {
  pectorals: 'Pectorales',
  chest: 'Pecho',
  'upper chest': 'Pectoral superior',
  lats: 'Dorsales',
  back: 'Espalda',
  'upper back': 'Espalda alta',
  traps: 'Trapecios',
  trapezius: 'Trapecios',
  rhomboids: 'Romboides',
  'lower back': 'Zona lumbar',
  spine: 'Espalda baja',
  delts: 'Deltoides',
  shoulders: 'Hombros',
  'front delts': 'Deltoides anterior',
  'lateral delts': 'Deltoides lateral',
  'rear delts': 'Deltoides posterior',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebrazos',
  quads: 'Cuádriceps',
  quadriceps: 'Cuádriceps',
  hamstrings: 'Isquiosurales / Femorales',
  glutes: 'Glúteos',
  calves: 'Gemelos / Pantorrillas',
  abs: 'Abdomen',
  abdominals: 'Abdominales',
  core: 'Core / Zona media',
  waist: 'Abdomen / Cintura',
  obliques: 'Oblicuos',
  'hip flexors': 'Flexores de cadera',
  adductors: 'Aductores',
  abductors: 'Abductores',
  cardio: 'Cardiovascular',
  neck: 'Cuello / Trapecios',
}

const FRASES_INSTRUCCIONES: [RegExp, string][] = [
  // Postura y punto de partida
  [/stand with your feet shoulder-width apart/gi, 'Parate erguido con los pies separados al ancho de los hombros'],
  [/stand with your feet hip-width apart/gi, 'Parate con los pies separados al ancho de las caderas'],
  [/stand upright with (your )?feet/gi, 'Parate erguido con los pies'],
  [/sit on the bench with your back (flat|straight)/gi, 'Sentate en el banco con la espalda firme y apoyada'],
  [/sit on a (flat )?bench/gi, 'Sentate en un banco plano'],
  [/lie on (a|your) back on a (flat )?bench/gi, 'Acostate boca arriba en el banco plano'],
  [/lie on an incline bench/gi, 'Acostate en el banco inclinado'],
  [/lie on a decline bench with your head lower than your feet/gi, 'Acostate en el banco declinado con la cabeza más baja que los pies'],
  [/lie on a decline bench/gi, 'Acostate en el banco declinado'],
  [/lie flat on the floor|lie on the floor/gi, 'Acostate boca arriba sobre el suelo o colchoneta'],
  [/start in a push-up position/gi, 'Comenzá en posición de flexión de brazos con el cuerpo alineado'],
  [/start in a plank position/gi, 'Iniciá en posición de plancha manteniendo el abdomen firme'],
  [/set up a stability ball at an incline angle/gi, 'Ubicá el fitball apoyado de forma estable'],

  // Tomas y agarres
  [/hold a dumbbell in each hand with an? (overhand|neutral|underhand) grip/gi, 'Sostené una mancuerna en cada mano con agarre seguro'],
  [/hold a dumbbell in each hand/gi, 'Sostené una mancuerna en cada mano'],
  [/hold the dumbbell with both hands/gi, 'Sostené la mancuerna con ambas manos'],
  [/hold a barbell with a close grip/gi, 'Tomá la barra con agarre estrecho'],
  [/hold the barbell with an? (overhand|overhand grip)/gi, 'Tomá la barra con agarre prono (palmas hacia abajo)'],
  [/hold the barbell with an? (underhand|underhand grip)/gi, 'Tomá la barra con agarre supino (palmas hacia arriba)'],
  [/grasp the (bar|handles?|rope) firmly/gi, 'Tomá los agarres con firmeza y control'],
  [/attach the cable handles to the high pulleys/gi, 'Conectá los agarres a las poleas altas'],
  [/place the band under your feet/gi, 'Colocá la banda elástica debajo de los pies'],
  [/holding the ends with your hands/gi, 'sujetando los extremos firmemente con las manos'],

  // Movimiento y contracción
  [/lower your body towards the ground/gi, 'Descendé el cuerpo de forma controlada hacia el suelo'],
  [/lower your body by bending your knees/gi, 'Descendé flexionando las rodillas y llevando la cadera hacia atrás'],
  [/lower the barbell towards your (chest|forehead)/gi, 'Bajá la barra de forma controlada hacia la posición adecuada'],
  [/lower the weight(s)? slowly/gi, 'Descendé el peso lentamente controlando la bajada'],
  [/slowly lower the weight(s)?/gi, 'Bajá el peso despacio sin perder tensión'],
  [/push through your heels/gi, 'Empujá con fuerza apoyando firmemente los talones'],
  [/push the (weight|barbell|dumbbells) back up/gi, 'Empujá la carga hacia arriba con potencia'],
  [/extend your arms fully/gi, 'Extendé los brazos por completo sin bloquear bruscamente las articulaciones'],
  [/extend your arms to press the (barbell|dumbbells) back up/gi, 'Extendé los brazos para empujar el peso a la posición inicial'],
  [/bend your knees slightly and hinge forward at the hips/gi, 'Flexioná levemente las rodillas e incliná el torso hacia adelante desde la cadera'],
  [/keeping your back straight and chest up/gi, 'manteniendo la espalda recta y el pecho erguido'],
  [/keeping your back straight and your core engaged/gi, 'manteniendo la espalda neutra y el abdomen activo'],
  [/keeping your back straight/gi, 'manteniendo la espalda recta'],
  [/keeping your core engaged/gi, 'manteniendo el abdomen firme'],
  [/keeping your upper arms stationary/gi, 'manteniendo los brazos fijos'],
  [/keep your arms straight and relaxed/gi, 'Mantené los brazos rectos y relajados'],
  [/let the band hang in front of your thighs/gi, 'dejando la banda por delante de los muslos'],
  [/engage your traps by shrugging your shoulders upward/gi, 'Activá los trapecios elevando los hombros hacia arriba'],
  [/lifting the band as high as possible/gi, 'subiendo la banda lo más alto posible con control'],
  [/hold the contraction for a moment/gi, 'Mantené la contracción máxima durante un segundo'],
  [/pause for a moment( at the (top|bottom))?/gi, 'Hacé una pausa breve en el punto de máxima tensión'],
  [/slowly lower your shoulders back down to the starting position/gi, 'descendé lentamente los hombros de regreso a la posición inicial'],
  [/return to the starting position/gi, 'regresá a la posición inicial de forma controlada'],
  [/repeat for the desired number of repetitions/gi, 'Repetí la cantidad de repeticiones indicada en tu rutina.'],
  [/continue alternating leg kicks with each push-up repetition/gi, 'Continuá alternando la patada de pierna en cada flexión.'],
  [/continue alternating/gi, 'Continuá alternando de lado en cada repetición.'],
  [/inhale as you lower/gi, 'Inhalá durante la fase de descenso'],
  [/exhale as you (push|press|lift)/gi, 'Exhalá con potencia al realizar la fuerza'],
]

/**
 * Traduce el nombre de un ejercicio al español natural del gimnasio
 */
export function traducirNombre(nombreIngles: string): string {
  if (!nombreIngles) return 'Ejercicio'
  let raw = nombreIngles
    .toLowerCase()
    .replace(/в°/g, '°')
    .replace(/\((male|female|back pov|side pov)\)/gi, '')
    .replace(/\bv\.\s*\d+\b/gi, '')
    .replace(/\b(fast|sharp|fierce|micro|wall|inclined)\s+style\b/gi, '')
    .replace(/\s*-\s*(deep|expanded|blunt)\s+variation\b/gi, '')
    .replace(/\b(pointed|twisted|fierce|rough|controlled|advanced|traditional)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Extraer equipo inicial si existe para ordenarlo al final
  let equipoFinal = ''
  for (const [regex, reemplazo] of MAPA_EQUIPOS_PREFIJO) {
    if (regex.test(raw)) {
      equipoFinal = reemplazo
      raw = raw.replace(regex, '').trim()
      break
    }
  }

  // Traducir movimientos
  for (const [regex, reemplazo] of DICCIONARIO_MOVIMIENTOS) {
    raw = raw.replace(regex, reemplazo)
  }

  let final = raw.replace(/\s+/g, ' ').trim()
  if (equipoFinal) {
    // Si no contiene ya la mención del equipo, sumarlo al final
    if (!final.toLowerCase().includes(equipoFinal.toLowerCase())) {
      final = `${final} ${equipoFinal}`
    }
  }

  final = final.replace(/\s+/g, ' ').trim()
  return final.charAt(0).toUpperCase() + final.slice(1)
}

/**
 * Traduce el nombre de un músculo
 */
export function traducirMusculo(musculo: string): string {
  if (!musculo) return ''
  const m = musculo.toLowerCase().trim()
  return DICCIONARIO_MUSCULOS[m] || musculo.charAt(0).toUpperCase() + musculo.slice(1)
}

/**
 * Traduce un paso de instrucción
 */
export function traducirPasoInstruccion(pasoIngles: string, indicePaso: number): string {
  if (!pasoIngles) return ''
  let texto = pasoIngles.replace(/^Step:\s*\d+\s*/i, '').trim()

  for (const [regex, reemplazo] of FRASES_INSTRUCCIONES) {
    texto = texto.replace(regex, reemplazo)
  }

  // Reemplazos de conectores y palabras sueltas comunes
  texto = texto
    .replace(/\bwith your hands\b/gi, 'con las manos')
    .replace(/\bwith both hands\b/gi, 'con ambas manos')
    .replace(/\bwith a\b/gi, 'con un/a')
    .replace(/\bwith your\b/gi, 'con tus')
    .replace(/\bwith\b/gi, 'con')
    .replace(/\band your\b/gi, 'y tu')
    .replace(/\band\b/gi, 'y')
    .replace(/\bto your\b/gi, 'hacia tu')
    .replace(/\bto the\b/gi, 'hacia el/la')
    .replace(/\bto\b/gi, 'hacia')
    .replace(/\bthe\b/gi, 'el/la')
    .replace(/\byour\b/gi, 'tu')
    .replace(/\bhands\b/gi, 'manos')
    .replace(/\bfeet\b/gi, 'pies')
    .replace(/\bshoulders\b/gi, 'hombros')
    .replace(/\belbows\b/gi, 'codos')
    .replace(/\bknees\b/gi, 'rodillas')
    .replace(/\bstraight\b/gi, 'recto/a')
    .replace(/\bslowly\b/gi, 'lentamente')
    .replace(/\s+/g, ' ')
    .trim()

  texto = texto.charAt(0).toUpperCase() + texto.slice(1)
  if (!texto.endsWith('.')) texto += '.'

  return `Paso ${indicePaso + 1}: ${texto}`
}

/**
 * Traduce un array completo de instrucciones
 */
export function traducirInstrucciones(instruccionesIngles: string[] = []): string[] {
  if (!Array.isArray(instruccionesIngles) || instruccionesIngles.length === 0) {
    return [
      'Paso 1: Adoptá una postura firme con el abdomen activo.',
      'Paso 2: Ejecutá el movimiento con técnica estricta y rango de recorrido completo.',
      'Paso 3: Controlá la fase excéntrica y mantené la tensión muscular en cada repetición.',
    ]
  }

  return instruccionesIngles.map((paso, idx) => traducirPasoInstruccion(paso, idx))
}

/**
 * Genera una descripción técnica en español
 */
export function generarDescripcionEspanol(
  tituloTraducido: string,
  grupoMuscular: string,
  equipo: string,
  musculosPrincipales: string[]
): string {
  const musculosStr = (musculosPrincipales || []).map(traducirMusculo).slice(0, 2).join(' y ')
  return `Ejercicio para ${grupoMuscular.toLowerCase()} realizado ${equipo.toLowerCase()}, con estímulo directo sobre ${musculosStr || grupoMuscular.toLowerCase()}.`
}
