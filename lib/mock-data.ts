// lib/mock-data.ts
// Datos de ejemplo. Cuando exista el backend, esto se reemplaza por fetch
// y los ids pasan a ser los que devuelva la base de datos real.
import { Alumno, Pago, Rutina, VideoTecnica } from "./types";

export const ALUMNOS_MOCK: Alumno[] = [
  { id: "a1", nombre: "Lucía Fernández", email: "lucia.fernandez@mail.com", celular: "2611234567", plan: "Musculación", fechaAlta: "2026-03-14", activo: true, ultimaAsistencia: "2026-08-29", tieneRutina: true, rutinaId: "r1" },
  { id: "a2", nombre: "Martín Torres", email: "martin.torres@mail.com", celular: "2612345678", plan: "Full Access", fechaAlta: "2026-01-08", activo: true, ultimaAsistencia: "2026-08-30", tieneRutina: true, rutinaId: "r1" },
  { id: "a3", nombre: "Sofía Ramírez", email: "sofia.ramirez@mail.com", celular: "2613456789", plan: "Funcional", fechaAlta: "2026-05-22", activo: true, ultimaAsistencia: "2026-08-10", tieneRutina: false },
  { id: "a4", nombre: "Diego Castro", email: "diego.castro@mail.com", celular: "2614567890", plan: "Musculación", fechaAlta: "2026-07-01", activo: true, ultimaAsistencia: "2026-08-27", tieneRutina: true, rutinaId: "r2" },
  { id: "a5", nombre: "Valentina Ríos", email: "valentina.rios@mail.com", celular: "2615678901", plan: "Full Access", fechaAlta: "2026-06-15", activo: true, ultimaAsistencia: undefined, tieneRutina: false },
  { id: "a6", nombre: "Esteban Morales", email: "esteban.m@mail.com", celular: "2619876543", plan: "Musculación", fechaAlta: "2026-02-10", activo: false, ultimaAsistencia: "2026-05-12", tieneRutina: false },
];

export const PAGOS_MOCK: Pago[] = [
  { id: "1", alumnoId: "a1", plan: "Musculación", monto: 15000, fecha: "2026-08-20", metodo: "Transferencia", estado: "PAGADO" },
  { id: "2", alumnoId: "a2", plan: "Full Access", monto: 22000, fecha: "2026-08-18", metodo: "Efectivo", estado: "PAGADO" },
  { id: "3", alumnoId: "a3", plan: "Funcional", monto: 18000, fecha: "2026-08-05", metodo: "Tarjeta", estado: "VENCIDO" },
  { id: "4", alumnoId: "a4", plan: "Musculación", monto: 15000, fecha: "2026-08-25", metodo: "-", estado: "PENDIENTE" },
  { id: "5", alumnoId: "a5", plan: "Full Access", monto: 22000, fecha: "2026-08-25", metodo: "-", estado: "PENDIENTE" },
  { id: "6", alumnoId: "a1", plan: "Musculación", monto: 15000, fecha: "2026-07-19", metodo: "Transferencia", estado: "PAGADO" },
  { id: "7", alumnoId: "a2", plan: "Full Access", monto: 22000, fecha: "2026-07-17", metodo: "Efectivo", estado: "PAGADO" },
  { id: "8", alumnoId: "a6", plan: "Musculación", monto: 15000, fecha: "2026-05-10", metodo: "Efectivo", estado: "PAGADO" },
];

export const RUTINAS_MOCK: Rutina[] = [
  {
    id: "r1",
    nombre: "Hipertrofia Nivel 2",
    descripcion: "Rutina orientada a ganancia de masa muscular y fuerza en 3 días semanales.",
    objetivo: "Hipertrofia",
    esGenerica: true,
    dias: [
      {
        id: "d1",
        nombre: "Día 1 — Pecho, Hombros y Tríceps",
        ejercicios: [
          { id: "e1", nombre: "Press de Banca Plano", series: 4, repeticiones: "8-10", descansoSegundos: 90, notas: "Controlar la bajada, retracción escapular" },
          { id: "e2", nombre: "Press Inclinado con Mancuernas", series: 3, repeticiones: "10-12", descansoSegundos: 60, notas: "Inclinación a 30°" },
          { id: "e3", nombre: "Aperturas en Polea / Peck Deck", series: 3, repeticiones: "12-15", descansoSegundos: 45, notas: "Pico de contracción 1 seg" },
          { id: "e4", nombre: "Elevaciones Laterales", series: 4, repeticiones: "12-15", descansoSegundos: 45, notas: "Codos semiflexionados" },
          { id: "e5", nombre: "Extensiones de Tríceps en Polea", series: 4, repeticiones: "10-12", descansoSegundos: 60, notas: "Codos pegados al cuerpo" },
        ],
      },
      {
        id: "d2",
        nombre: "Día 2 — Espalda y Bíceps",
        ejercicios: [
          { id: "e6", nombre: "Jalón al Pecho en Polea", series: 4, repeticiones: "10", descansoSegundos: 75, notas: "Llevar la barra al esternón" },
          { id: "e7", nombre: "Remo con Barra Agarre Prono", series: 4, repeticiones: "8-10", descansoSegundos: 90, notas: "Torso a 45 grados" },
          { id: "e8", nombre: "Remo Unilateral con Mancuerna", series: 3, repeticiones: "10 por lado", descansoSegundos: 60 },
          { id: "e9", nombre: "Curl de Bíceps con Barra Z", series: 3, repeticiones: "10-12", descansoSegundos: 60 },
          { id: "e10", nombre: "Curl Martillo con Mancuernas", series: 3, repeticiones: "12", descansoSegundos: 45, notas: "Énfasis en braquial" },
        ],
      },
      {
        id: "d3",
        nombre: "Día 3 — Piernas y Core",
        ejercicios: [
          { id: "e11", nombre: "Sentadilla Libre con Barra", series: 4, repeticiones: "8-10", descansoSegundos: 120, notas: "Profundidad paralela" },
          { id: "e12", nombre: "Prensa 45°", series: 4, repeticiones: "10-12", descansoSegundos: 90 },
          { id: "e13", nombre: "Sillón de Cuádriceps", series: 3, repeticiones: "12-15", descansoSegundos: 45 },
          { id: "e14", nombre: "Camilla Femoral Tumbado", series: 4, repeticiones: "10-12", descansoSegundos: 60 },
          { id: "e15", nombre: "Plancha Abdominal Isométrica", series: 3, repeticiones: "45 seg", descansoSegundos: 45 },
        ],
      },
    ],
  },
  {
    id: "r2",
    nombre: "Fuerza & Potencia (4 Días)",
    descripcion: "Enfoque en levantamientos básicos pesados y transferencia de potencia.",
    objetivo: "Fuerza",
    esGenerica: true,
    dias: [
      {
        id: "d4",
        nombre: "Día 1 — Sentadilla y Accesorios",
        ejercicios: [
          { id: "e16", nombre: "Sentadilla Trasera Pesada", series: 5, repeticiones: "5", descansoSegundos: 180, notas: "RPE 8" },
          { id: "e17", nombre: "Prensa Inclinada Pesada", series: 4, repeticiones: "8", descansoSegundos: 120 },
        ],
      },
      {
        id: "d5",
        nombre: "Día 2 — Press Banca y Torso",
        ejercicios: [
          { id: "e18", nombre: "Press de Banca Plano", series: 5, repeticiones: "5", descansoSegundos: 180 },
          { id: "e19", nombre: "Press Militar de Pie", series: 4, repeticiones: "6-8", descansoSegundos: 120 },
        ],
      },
    ],
  },
  {
    id: "r3",
    nombre: "Adaptación e Iniciación",
    descripcion: "Circuito general para alumnos que recién comienzan en el gimnasio.",
    objetivo: "Adaptación",
    esGenerica: true,
    dias: [
      {
        id: "d6",
        nombre: "Día 1 — Fullbody Inicial A",
        ejercicios: [
          { id: "e20", nombre: "Prensa de Piernas Guiada", series: 3, repeticiones: "12", descansoSegundos: 60 },
          { id: "e21", nombre: "Jalón al Pecho en Máquina", series: 3, repeticiones: "12", descansoSegundos: 60 },
          { id: "e22", nombre: "Press de Pecho en Máquina", series: 3, repeticiones: "12", descansoSegundos: 60 },
          { id: "e23", nombre: "Cinta / Bici de calentamiento", series: 1, repeticiones: "10 min", descansoSegundos: 0 },
        ],
      },
    ],
  },
];

export const VIDEOS_TECNICA_MOCK: VideoTecnica[] = [
  {
    id: "v1",
    titulo: "Press de Banca con Mancuernas",
    grupoMuscular: "Pecho",
    duracion: "01:45",
    nivel: "Técnica estricta",
    videoUrl: "https://www.youtube.com/embed/VmB1G1K7v94",
    descripcion: "Aprende el arco lumbar seguro, la retracción escapular y el recorrido completo para maximizar el estímulo en el pectoral mayor evitando el estrés articular en hombros.",
    consejosClave: [
      "Junta tus omóplatos contra el banco durante toda la serie.",
      "Baja las mancuernas a 45 grados respecto al torso (no a 90°).",
      "Pies firmes en el suelo empujando para mantener estabilidad (leg drive).",
    ],
  },
  {
    id: "v2",
    titulo: "Sentadilla Libre Profunda y Biomecánica",
    grupoMuscular: "Piernas",
    duracion: "02:10",
    nivel: "Biomecánica",
    videoUrl: "https://www.youtube.com/embed/gcNh17Ckjgg",
    descripcion: "Desglose de la postura de pies, respiración diafragmática (valsalva) y profundidad adecuada según tu movilidad de tobillo y cadera.",
    consejosClave: [
      "Inhala profundo inflando el abdomen antes de iniciar el descenso.",
      "Empuja las rodillas hacia afuera en la misma dirección de las puntas de tus pies.",
      "El peso debe sentirse distribuido en todo el trípode del pie.",
    ],
  },
  {
    id: "v3",
    titulo: "Remo con Barra Agarre Prono",
    grupoMuscular: "Espalda",
    duracion: "01:30",
    nivel: "Activación dorsal",
    videoUrl: "https://www.youtube.com/embed/FWJR5Ve8gkQ",
    descripcion: "Técnica fundamental para densidad de espalda. Mantén la espalda neutra y aprende a traccionar con los codos sin tirar con los lumbares.",
    consejosClave: [
      "Inclina el torso a 45° bloqueando la cadera hacia atrás.",
      "Tira de la barra hacia el ombligo pensando en llevar los codos hacia el techo.",
      "Evita dar tirones con el pecho o hiperextender el cuello.",
    ],
  },
  {
    id: "v4",
    titulo: "Press Militar con Barra de Pie (Overhead Press)",
    grupoMuscular: "Hombros",
    duracion: "01:55",
    nivel: "Fuerza básica",
    videoUrl: "https://www.youtube.com/embed/2yjwXTZQDDI",
    descripcion: "El rey de los ejercicios de hombro. Alineación vertical, bloqueo de glúteos y abdomen para no sobrecargar la zona lumbar.",
    consejosClave: [
      "Aprieta glúteos y cuádriceps para crear una base sólida como una roca.",
      "Pasa la cabeza hacia adelante una vez que la barra supera la frente.",
      "Bloquea la barra sobre la coronilla en el punto más alto.",
    ],
  },
  {
    id: "v5",
    titulo: "Curl Martillo con Mancuernas",
    grupoMuscular: "Brazos",
    duracion: "01:15",
    nivel: "Aislamiento",
    videoUrl: "https://www.youtube.com/embed/zC3nLlEvin4",
    descripcion: "Excelente variante para el desarrollo del braquial anterior y braquiorradial, aportando volumen y grosor al brazo.",
    consejosClave: [
      "Mantén los codos fijados al costado del cuerpo sin balancear el torso.",
      "Las palmas se miran entre sí durante todo el movimiento.",
      "Controla 2 segundos la fase excéntrica (bajada).",
    ],
  },
  {
    id: "v6",
    titulo: "Plancha Abdominal y Tensión Global",
    grupoMuscular: "Core",
    duracion: "01:20",
    nivel: "Postura",
    videoUrl: "https://www.youtube.com/embed/ASdvN_XEl_c",
    descripcion: "No se trata de aguantar 5 minutos flojo, sino 45 segundos con máxima tensión en glúteos, abdomen y dorsales.",
    consejosClave: [
      "Retroversión pélvica: mete la cola como si quisieras juntar el pubis con el esternón.",
      "Empuja el suelo con los antebrazos separando las escápulas.",
      "Mantén la respiración corta y controlada sin soltar la panza.",
    ],
  },
];

