'use client'

import { useState, useMemo } from 'react'
import {
  Bell,
  Plus,
  Search,
  Check,
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

function AvisoCardAlumno({
  aviso,
  esLeido,
  onMarcarLeido,
}: {
  aviso: Aviso
  esLeido: boolean
  onMarcarLeido: () => void
}) {
  const whatsappMensaje = `${CONTACTO_ATLAS.whatsappUrl}?text=${encodeURIComponent(
    `Hola Atlas Gym! Tengo una consulta sobre el aviso: "${aviso.titulo}"`
  )}`

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <CategoriaBadge categoria={aviso.categoria} />
          {!esLeido && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              Nuevo
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-slate-400">{aviso.fecha}</span>
      </div>

      <div className="mt-3">
        <h3 className="text-lg font-bold text-slate-900">{aviso.titulo}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
          {aviso.mensaje}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onMarcarLeido}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
            esLeido
              ? 'bg-slate-100 text-slate-500'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
        >
          {esLeido ? (
            <>
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              Leído
            </>
          ) : (
            <>
              <Check className="size-3.5" />
              Marcar como leído
            </>
          )}
        </button>

        <a
          href={whatsappMensaje}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          <MessageCircle className="size-3.5 text-emerald-600" />
          Consultar por WhatsApp
        </a>
      </div>
    </article>
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
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <CategoriaBadge categoria={aviso.categoria} />
          {aviso.paraTodos ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
              <Users className="size-3" />
              Todos los alumnos
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
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
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <h3 className="text-lg font-bold text-slate-900">{aviso.titulo}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
          {aviso.mensaje}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 font-medium">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="size-3.5 text-emerald-500" />
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
          className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-4 text-xs font-medium text-slate-200 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
        return (
          <AvisoCardAlumno
            key={aviso.id}
            aviso={aviso}
            esLeido={aviso.leidoPor.includes(usuarioActualId)}
            onMarcarLeido={() => onMarcarLeido(aviso.id)}
          />
        )
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
    eliminarAviso,
    getCantidadAvisosNoLeidos,
  } = useAppData()

  const [modalAbierto, setModalAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS')

  const esAdmin = usuarioActual.rol === 'ADMIN'
  const avisosVisibles = getAvisosParaUsuario(usuarioActual)
  const cantidadNoLeidos = getCantidadAvisosNoLeidos(usuarioActual)

  const alumnosMap = useMemo(() => {
    return new Map(alumnos.map((a) => [a.id, a.nombre]))
  }, [alumnos])

  const avisosFiltrados = useMemo(() => {
    return filtrarAvisos(avisosVisibles, filtroCategoria, busqueda, usuarioActual.id)
  }, [avisosVisibles, filtroCategoria, busqueda, usuarioActual.id])

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Cabecera Principal */}
      <header className="border-b border-slate-800/80 bg-slate-950 px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
              <Bell className="size-4" />
              {esAdmin ? 'Centro de Comunicación' : 'Avisos y Comunicados'}
            </div>
            <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">
              {esAdmin ? 'Avisos del Gimnasio' : 'Novedades y Notificaciones'}
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
              Nuevo Aviso
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
