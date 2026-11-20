'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Bell,
  Plus,
  Search,
  MessageCircle,
  Trash2,
  Users,
  User,
  AlertCircle,
  Info,
  Clock,
  CheckCircle2,
  Inbox,
} from 'lucide-react'
import { useAppData } from '@/lib/store'
import { Aviso, CATEGORIA_AVISO_STYLES, CategoriaAviso, CATEGORIA_AVISO_LABEL } from '@/lib/types'
import { CONTACTO_ATLAS } from '@/lib/constants'
import { ModalNuevoAviso } from '@/components/modal-nuevo-aviso'
import { Button } from '@/components/ui/button'

function CategoriaBadge({ categoria }: { categoria: CategoriaAviso }) {
  const estilo = CATEGORIA_AVISO_STYLES[categoria]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${estilo.badge}`}
    >
      {categoria === 'IMPORTANTE' && <AlertCircle className="size-3 text-rose-600" />}
      {categoria === 'NOVEDAD' && <Info className="size-3 text-blue-600" />}
      {categoria === 'HORARIO' && <Clock className="size-3 text-emerald-600" />}
      {estilo.label}
    </span>
  )
}

function AvisoCardAdmin({
  aviso,
  nombreAlumno,
  onEliminar,
}: {
  aviso: Aviso
  nombreAlumno?: string
  onEliminar: () => void
}) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/70 p-6 shadow-lg shadow-slate-950/40 transition-[transform,border-color] duration-200 hover:shadow-xl hover:border-slate-600">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <CategoriaBadge categoria={aviso.categoria} />
          {aviso.paraTodos ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-300">
              <Users className="size-3" />
              Todos los alumnos
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-xs font-bold text-indigo-300">
              <User className="size-3" />
              Para: {nombreAlumno || 'Alumno'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400">{aviso.fecha}</span>
          <button
            type="button"
            onClick={onEliminar}
            aria-label="Eliminar aviso"
            title="Eliminar aviso"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-500/20 hover:text-rose-400"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <h3 className="text-lg font-bold text-white">{aviso.titulo}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-300 whitespace-pre-line">
          {aviso.mensaje}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-400 font-medium">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="size-3.5 text-emerald-400" />
          Leído por {aviso.leidoPor.length} {aviso.leidoPor.length === 1 ? 'persona' : 'personas'}
        </span>
      </div>
    </article>
  )
}

function filtrarAvisos(
  avisos: Aviso[],
  filtro: string,
  busqueda: string,
  usuarioId: string
): Aviso[] {
  const q = busqueda.trim().toLowerCase()
  return avisos.filter((av) => {
    if (filtro === 'NO_LEIDOS' && av.leidoPor.includes(usuarioId)) return false
    if (filtro === 'GENERALES' && !av.paraTodos) return false
    if (filtro === 'PRIVADOS' && av.paraTodos) return false
    if (filtro !== 'TODOS' && filtro !== 'NO_LEIDOS' && filtro !== 'GENERALES' && filtro !== 'PRIVADOS') {
      if (av.categoria !== filtro) return false
    }

    if (!q) return true
    return av.titulo.toLowerCase().includes(q) || av.mensaje.toLowerCase().includes(q)
  })
}

function AvisosFiltrosBar({
  esAdmin,
  filtroCategoria,
  setFiltroCategoria,
  totalAvisos,
  cantidadNoLeidos,
  busqueda,
  setBusqueda,
}: {
  esAdmin: boolean
  filtroCategoria: string
  setFiltroCategoria: (cat: string) => void
  totalAvisos: number
  cantidadNoLeidos: number
  busqueda: string
  setBusqueda: (q: string) => void
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFiltroCategoria('TODOS')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
            filtroCategoria === 'TODOS'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Todos ({totalAvisos})
        </button>

        {!esAdmin && cantidadNoLeidos > 0 && (
          <button
            type="button"
            onClick={() => setFiltroCategoria('NO_LEIDOS')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
              filtroCategoria === 'NO_LEIDOS'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/20 hover:bg-rose-500/25'
            }`}
          >
            No leídos ({cantidadNoLeidos})
          </button>
        )}

        {esAdmin && (
          <>
            <button
              type="button"
              onClick={() => setFiltroCategoria('GENERALES')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
                filtroCategoria === 'GENERALES'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Generales
            </button>
            <button
              type="button"
              onClick={() => setFiltroCategoria('PRIVADOS')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
                filtroCategoria === 'PRIVADOS'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Individuales
            </button>
          </>
        )}

        {(['IMPORTANTE', 'NOVEDAD', 'HORARIO'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFiltroCategoria(cat)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
              filtroCategoria === cat
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {CATEGORIA_AVISO_LABEL[cat]}
          </button>
        ))}
      </div>

      <div className="relative w-full md:w-64">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar aviso..."
          aria-label="Buscar aviso"
          className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-4 text-xs font-medium text-slate-200 outline-none transition-[border-color] duration-200 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
    </div>
  )
}

function AvisosList({
  esAdmin,
  avisos,
  alumnosMap,
  usuarioActualId,
  onEliminar,
  onMarcarLeido,
}: {
  esAdmin: boolean
  avisos: Aviso[]
  alumnosMap: Map<string, string>
  usuarioActualId: string
  onEliminar: (id: string) => void
  onMarcarLeido: (id: string) => void
}) {
  if (avisos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-950/60 p-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 text-slate-500">
          <Inbox className="size-7" />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-200">No hay avisos para mostrar</h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          No encontramos publicaciones que coincidan con los filtros o la búsqueda seleccionada.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {avisos.map((aviso) => {
        if (esAdmin) {
          return (
            <AvisoCardAdmin
              key={aviso.id}
              aviso={aviso}
              nombreAlumno={aviso.alumnoId ? alumnosMap.get(aviso.alumnoId) : undefined}
              onEliminar={() => onEliminar(aviso.id)}
            />
          )
        }
        return null
      })}
    </div>
  )
}

export default function AvisosPage() {
  const {
    usuarioActual,
    alumnos,
    getAvisosParaUsuario,
    marcarAvisoLeido,
    marcarTodosAvisosLeidos,
    eliminarAviso,
    getCantidadAvisosNoLeidos,
  } = useAppData()

  // Se toma antes de marcarlos: "Nuevos" muestra lo que no había leído al entrar.
  const [nuevosAlEntrar] = useState(
    () => new Set(getAvisosParaUsuario(usuarioActual).filter((a) => !a.leidoPor.includes(usuarioActual?.id ?? '')).map((a) => a.id))
  )

  const cantidadNoLeidos = getCantidadAvisosNoLeidos(usuarioActual)

  // Depende de la cantidad: una recarga del servidor puede traer avisos sin leer con la pantalla abierta.
  useEffect(() => {
    if (usuarioActual?.id && cantidadNoLeidos > 0) {
      marcarTodosAvisosLeidos(usuarioActual.id)
    }
  }, [cantidadNoLeidos, marcarTodosAvisosLeidos, usuarioActual?.id])

  const [modalAbierto, setModalAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS')

  const esAdmin = usuarioActual?.rol === 'ADMIN'
  const avisosVisibles = getAvisosParaUsuario(usuarioActual)

  const alumnosMap = useMemo(() => {
    return new Map(alumnos.map((a) => [a.id, a.nombre]))
  }, [alumnos])

  const avisosFiltrados = useMemo(() => {
    if (!usuarioActual) return []
    return filtrarAvisos(avisosVisibles, filtroCategoria, busqueda, usuarioActual.id)
  }, [avisosVisibles, filtroCategoria, busqueda, usuarioActual])

  if (!usuarioActual) {
    return null
  }

  if (!esAdmin) {
    const nuevos = avisosFiltrados.filter((a) => nuevosAlEntrar.has(a.id))
    const anteriores = avisosFiltrados.filter((a) => !nuevosAlEntrar.has(a.id))
    const filtros = [
      { valor: 'TODOS', label: 'Todos' },
      ...(['IMPORTANTE', 'NOVEDAD', 'HORARIO'] as const).map((c) => ({ valor: c, label: CATEGORIA_AVISO_LABEL[c] })),
    ]
    const claseSeccion = 'text-[13px] font-bold uppercase tracking-[.06em] text-slate-500'
    const encabezado = (aviso: Aviso) => (
      <div className="flex items-center gap-2 text-[13px]">
        {nuevosAlEntrar.has(aviso.id) && <span aria-hidden="true" className="size-[9px] rounded-full bg-blue-400" />}
        {aviso.paraTodos ? (
          <span className="font-semibold text-amber-400">{CATEGORIA_AVISO_LABEL[aviso.categoria]}</span>
        ) : (
          <span className="rounded-full bg-blue-400 px-2 py-0.5 text-xs font-bold text-[#0E1B36]">Para vos</span>
        )}
        <span className="ml-auto text-slate-500">{aviso.fecha}</span>
      </div>
    )
    const consulta = (aviso: Aviso) => (
      <a
        href={`${CONTACTO_ATLAS.whatsappUrl}?text=${encodeURIComponent(`Hola Atlas Gym! Tengo una consulta sobre el aviso: "${aviso.titulo}"`)}`}
        target="atlas_whatsapp_tab"
        rel="noopener noreferrer"
        className="flex h-11 items-center gap-1.5 text-sm font-semibold text-blue-400 hover:text-blue-300"
      >
        <MessageCircle className="size-4" />
        Consultar
      </a>
    )

    return (
      <div className="mx-auto flex max-w-[720px] flex-col gap-3.5 px-5 pb-28 pt-[22px] md:pb-16 md:pt-12">
        <h1 className="text-[34px] font-extrabold uppercase leading-[.95] text-white md:text-[40px]">Avisos</h1>

        {avisosVisibles.length > 4 && (
          <>
            <label className="flex h-12 items-center gap-2 rounded-xl border border-[#2A4677] bg-[#162A50] px-3.5 focus-within:border-blue-400">
              <Search className="size-[18px] shrink-0 text-slate-500" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar aviso..."
                aria-label="Buscar aviso"
                className="min-w-0 flex-1 bg-transparent text-base text-slate-100 outline-none placeholder:text-slate-500"
              />
            </label>
            <div role="group" aria-label="Filtrar avisos" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0">
              {filtros.map((f) => (
                <button
                  key={f.valor}
                  type="button"
                  aria-pressed={filtroCategoria === f.valor}
                  onClick={() => setFiltroCategoria(f.valor)}
                  className={`h-11 shrink-0 rounded-full px-3.5 text-sm ${
                    filtroCategoria === f.valor ? 'bg-slate-100 font-bold text-[#0E1B36]' : 'border border-[#2A4677] font-semibold text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}

        {avisosFiltrados.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">No hay avisos para mostrar.</p>
        )}

        {nuevos.length > 0 && (
          <h2 className={`${claseSeccion} mt-1`}>
            Nuevos <span aria-hidden="true" className="mx-1 text-slate-600">|</span> {nuevos.length}
          </h2>
        )}
        {nuevos.map((aviso) => (
          <article key={aviso.id} className="flex flex-col gap-2 rounded-2xl border border-slate-700 bg-[#162A50] p-4">
            {encabezado(aviso)}
            <h3 className="text-lg font-bold text-white">{aviso.titulo}</h3>
            <p className="whitespace-pre-line text-[15px] leading-normal text-slate-300">{aviso.mensaje}</p>
            <div className="self-end">{consulta(aviso)}</div>
          </article>
        ))}

        {anteriores.length > 0 && <h2 className={`${claseSeccion} mt-2`}>Anteriores</h2>}
        {anteriores.map((aviso) => (
          <article key={aviso.id} className="flex flex-col gap-1.5 rounded-2xl bg-[#13254A] p-4">
            {encabezado(aviso)}
            <h3 className="font-semibold text-slate-200">{aviso.titulo}</h3>
            <p className="whitespace-pre-line text-sm text-slate-400">{aviso.mensaje}</p>
            <div className="self-end">{consulta(aviso)}</div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Cabecera Principal */}
      <header className="border-b border-slate-800/80 bg-slate-950 px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
              <Bell className="size-4" />
              {esAdmin ? 'Centro de comunicación' : 'Avisos y comunicados'}
            </div>
            <h1 className="mt-1 text-5xl font-black text-white md:text-6xl">
              {esAdmin ? 'Avisos del gimnasio' : 'Novedades y notificaciones'}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {esAdmin
                ? 'Publicá anuncios generales para toda la comunidad o mensajes directos para alumnos particulares.'
                : 'Mantenete al día con feriados, cambios de horario, nuevo equipamiento y el estado de tu cuota.'}
            </p>
          </div>

          {esAdmin && (
            <Button
              onClick={() => setModalAbierto(true)}
              className="h-11 rounded-xl bg-blue-600 px-5 font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 active:scale-95 self-start md:self-auto"
            >
              <Plus className="mr-2 size-4" />
              Nuevo aviso
            </Button>
          )}
        </div>
      </header>

      {/* Contenido */}
      <main className="mx-auto max-w-5xl px-5 py-8 md:px-10">
        <AvisosFiltrosBar
          esAdmin={esAdmin}
          filtroCategoria={filtroCategoria}
          setFiltroCategoria={setFiltroCategoria}
          totalAvisos={avisosVisibles.length}
          cantidadNoLeidos={cantidadNoLeidos}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
        />

        <AvisosList
          esAdmin={esAdmin}
          avisos={avisosFiltrados}
          alumnosMap={alumnosMap}
          usuarioActualId={usuarioActual.id}
          onEliminar={(id) => eliminarAviso(id)}
          onMarcarLeido={(id) => marcarAvisoLeido(id, usuarioActual.id)}
        />
      </main>

      {esAdmin && (
        <ModalNuevoAviso
          isOpen={modalAbierto}
          onClose={() => setModalAbierto(false)}
        />
      )}
    </div>
  )
}
