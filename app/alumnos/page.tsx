// app/alumnos/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Users, UserCheck, UserX, AlertCircle, Clock, Dumbbell, Plus, Search, Trash2, Pencil, ChevronRight, Download, Check } from "lucide-react";
import Link from "next/link";
import { useAppData } from "@/lib/store";
import { formatDiasIngreso } from "@/lib/date-utils";
import { ModalNuevoAlumno } from "@/components/modal-nuevo-alumno";
import { ModalEditarAlumno } from "@/components/modal-editar-alumno";
import { AccesoRestringido } from "@/components/acceso-restringido";
import { MetricCard } from "@/components/ui/metric-card";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/lib/use-debounce";
import { descargarCSV } from "@/lib/export-utils";
import {
  Alumno,
  EstadoCuenta,
  ESTADO_CUENTA_LABEL,
  ESTADO_CUENTA_STYLES,
} from "@/lib/types";

const FILTROS_ALUMNOS: { label: string; value: EstadoCuenta | "TODOS" }[] = [
  { label: "Todos", value: "TODOS" },
  { label: "Al día", value: "AL_DIA" },
  { label: "Pendientes", value: "PENDIENTE" },
  { label: "Morosos", value: "MOROSO" },
  { label: "Inactivos", value: "INACTIVO" },
];

export default function AlumnosPage() {
  const { alumnos, actualizarAlumno, eliminarAlumno, getEstadoCuenta, getPagosDeAlumno, planes, usuarioActual } =
    useAppData();
  const { toast } = useToast();

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<EstadoCuenta | "TODOS">("TODOS");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [alumnoAEditar, setAlumnoAEditar] = useState<Alumno | null>(null);
  const [alumnoAEliminar, setAlumnoAEliminar] = useState<Alumno | null>(null);

  const alumnosConEstado = useMemo(
    () => alumnos.map((a) => ({ ...a, estadoCuenta: getEstadoCuenta(a.id) })),
    [alumnos, getEstadoCuenta]
  );

  const metrica = useMemo(() => {
    const alDia = alumnosConEstado.filter((a) => a.activo && a.estadoCuenta === "AL_DIA").length;
    const morosos = alumnosConEstado.filter((a) => a.activo && a.estadoCuenta === "MOROSO").length;
    const inactivos = alumnosConEstado.filter((a) => !a.activo || a.estadoCuenta === "INACTIVO").length;
    return { total: alumnosConEstado.length, alDia, morosos, inactivos };
  }, [alumnosConEstado]);

  const busquedaDebounced = useDebounce(busqueda, 250);
  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina, setElementosPorPagina] = useState(15);

  const alumnosFiltrados = useMemo(() => {
    const q = busquedaDebounced.trim().toLowerCase();
    return alumnosConEstado.filter((a) => {
      const coincideFiltro =
        filtro === "TODOS"
          ? a.activo !== false && a.estadoCuenta !== "INACTIVO"
          : filtro === "INACTIVO"
          ? a.activo === false || a.estadoCuenta === "INACTIVO"
          : a.activo !== false && a.estadoCuenta === filtro;
      const coincideBusqueda =
        !q ||
        a.nombre.toLowerCase().includes(q) ||
        (a.usuario && a.usuario.toLowerCase().includes(q)) ||
        (a.dni && a.dni.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.celular && a.celular.includes(q)) ||
        (a.plan && a.plan.toLowerCase().includes(q));
      return coincideFiltro && coincideBusqueda;
    });
  }, [alumnosConEstado, filtro, busquedaDebounced]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busquedaDebounced, filtro]);

  const totalPaginas = Math.ceil(alumnosFiltrados.length / elementosPorPagina) || 1;
  const alumnosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * elementosPorPagina;
    return alumnosFiltrados.slice(inicio, inicio + elementosPorPagina);
  }, [alumnosFiltrados, paginaActual, elementosPorPagina]);

  // Soporte para cerrar modales con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalAbierto(false);
        setAlumnoAEditar(null);
        setAlumnoAEliminar(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const exportarCSVAlumnos = () => {
    const encabezados = [
      "ID",
      "Nombre",
      "Usuario",
      "DNI",
      "Email",
      "Celular",
      "Plan",
      "Estado de Cuenta",
      "Fecha de Alta",
      "Última Asistencia",
      "Tiene Rutina",
    ];
    const filas = alumnosConEstado.map((a) => [
      a.id,
      a.nombre,
      a.usuario || "-",
      a.dni || "-",
      a.email || "-",
      a.celular || "-",
      a.plan,
      ESTADO_CUENTA_LABEL[a.estadoCuenta],
      a.fechaAlta,
      a.ultimaAsistencia || "Sin registros",
      a.tieneRutina ? "Sí" : "No",
    ]);
    descargarCSV("alumnos_atlas_gym", encabezados, filas);
    toast("Lista de alumnos exportada a CSV con éxito", "success");
  };

  const confirmarEliminar = () => {
    if (!alumnoAEliminar) return;
    const nombre = alumnoAEliminar.nombre;
    const esInactivo =
      alumnoAEliminar.activo === false || getEstadoCuenta(alumnoAEliminar.id) === "INACTIVO";
    eliminarAlumno(alumnoAEliminar.id, esInactivo);
    setAlumnoAEliminar(null);
    if (esInactivo) {
      toast(`Alumno "${nombre}" eliminado definitivamente del sistema`, "info");
    } else {
      toast(`Alumno "${nombre}" dado de baja (movido a Inactivos)`, "info");
    }
  };

  if (!usuarioActual || usuarioActual.rol === "ALUMNO") {
    return (
      <AccesoRestringido
        titulo="Panel de alumnos restringido"
        mensaje="La administración de fichas de alumnos, estados de cuenta y altas solo está disponible para entrenadores y administradores."
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10 md:py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Alumnos</h1>
          <p className="text-sm text-slate-400 mt-1">
            El estado de cuenta e inactividad se calculan automáticamente según los pagos en Finanzas.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={exportarCSVAlumnos}
            title="Exportar listado a archivo CSV / Excel"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-sm font-semibold h-11 px-4 rounded-xl border border-slate-700 transition-[color,background-color,transform] duration-200 hover:-translate-y-0.5 active:scale-95"
          >
            <Download className="w-4 h-4 text-slate-400" />
            Exportar CSV
          </button>
          <button
            onClick={() => setModalAbierto(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20 transition-[color,background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-blue-500/30 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Agregar alumno
          </button>
        </div>
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={<Users className="size-6" />}
          label="Total de alumnos"
          value={`${metrica.total}`}
          tint={{ bg: "bg-blue-500/15 border border-blue-500/30", text: "text-blue-400", bar: "bg-blue-500" }}
        />
        <MetricCard
          icon={<UserCheck className="size-6" />}
          label="Al día"
          value={`${metrica.alDia}`}
          tint={{ bg: "bg-emerald-500/15 border border-emerald-500/30", text: "text-emerald-400", bar: "bg-emerald-500" }}
        />
        <MetricCard
          icon={<AlertCircle className="size-6" />}
          label="Morosos"
          value={`${metrica.morosos}`}
          tint={{ bg: "bg-rose-500/15 border border-rose-500/30", text: "text-rose-400", bar: "bg-rose-500" }}
        />
        <MetricCard
          icon={<UserX className="size-6" />}
          label="Inactivos"
          value={`${metrica.inactivos}`}
          tint={{ bg: "bg-slate-800 border border-slate-700", text: "text-slate-400", bar: "bg-slate-600" }}
        />
      </div>

      {/* Tarjeta principal: filtros + tabla */}
      <div className="bg-slate-900/60 rounded-2xl shadow-sm border border-slate-800 overflow-hidden text-slate-100 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-slate-800 bg-slate-950/40">
          <div className="flex gap-2 flex-wrap">
            {FILTROS_ALUMNOS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltro(f.value)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-[color,background-color] duration-200 active:scale-95 ${
                  filtro === f.value
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                    : "bg-slate-800/60 text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="buscar-alumnos"
              aria-label="Buscar alumno"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar alumno..."
              className="pl-9 pr-4 h-10 text-sm bg-slate-800/80 text-white placeholder:text-slate-500 border border-slate-700 rounded-full outline-none transition-[border-color,box-shadow] duration-200 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-800">
                <th className="font-bold px-6 py-3.5">Alumno</th>
                <th className="font-bold px-6 py-3.5">Plan</th>
                <th className="font-bold px-6 py-3.5">Rutina</th>
                <th className="font-bold px-6 py-3.5">Último ingreso</th>
                <th className="font-bold px-6 py-3.5">Estado de cuenta</th>
                <th className="font-bold px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alumnosPaginados.map((alumno) => (
                <tr
                  key={alumno.id}
                  className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-6 py-4 font-bold text-white">
                    <Link
                      href={`/alumnos/${alumno.id}`}
                      className="hover:text-blue-400 hover:underline underline-offset-2 flex items-center gap-1.5"
                    >
                      {alumno.nombre}
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </Link>
                    {(alumno.usuario || alumno.dni) && (
                      <div className="flex items-center gap-2 mt-1 text-xs font-medium text-slate-400">
                        {alumno.usuario && (
                          <span className="font-mono text-blue-400">@{alumno.usuario}</span>
                        )}
                        {alumno.dni && <span>DNI: {alumno.dni}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-medium">{alumno.plan}</td>
                  <td className="px-6 py-4">
                    {alumno.tieneRutina ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        <Dumbbell className="w-3 h-3" />
                        Asignada
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700/60">
                        Sin rutina
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-medium">
                    {alumno.ultimaAsistencia ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDiasIngreso(alumno.ultimaAsistencia)}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs italic">Sin registros</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${ESTADO_CUENTA_STYLES[alumno.estadoCuenta]}`}
                    >
                      {ESTADO_CUENTA_LABEL[alumno.estadoCuenta]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-1.5">
                    {(alumno.activo === false || alumno.estadoCuenta === "INACTIVO") && (
                      <button
                        onClick={() => {
                          actualizarAlumno(alumno.id, { activo: true });
                          toast(`Alumno "${alumno.nombre}" reactivado con éxito`, "success");
                        }}
                        title={`Reactivar a ${alumno.nombre}`}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors duration-150 active:scale-95"
                      >
                        Reactivar
                      </button>
                    )}
                    <button
                      onClick={() => setAlumnoAEditar(alumno)}
                      aria-label={`Editar a ${alumno.nombre}`}
                      title="Editar ficha"
                      className="p-2 rounded-lg text-slate-400 hover:bg-blue-500/10 hover:text-blue-400 transition-colors duration-150 active:scale-90"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setAlumnoAEliminar(alumno)}
                      aria-label={
                        alumno.activo === false || alumno.estadoCuenta === "INACTIVO"
                          ? `Eliminar definitivamente a ${alumno.nombre}`
                          : `Dar de baja a ${alumno.nombre}`
                      }
                      title={
                        alumno.activo === false || alumno.estadoCuenta === "INACTIVO"
                          ? "Eliminar definitivamente del sistema"
                          : "Dar de baja (enviar a Inactivos)"
                      }
                      className="p-2 rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors duration-150 active:scale-90"
                    >
                      {alumno.activo === false || alumno.estadoCuenta === "INACTIVO" ? (
                        <Trash2 className="w-4 h-4" />
                      ) : (
                        <UserX className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {alumnosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                    {alumnos.length === 0
                      ? "Todavía no hay alumnos cargados. Arrancá agregando el primero."
                      : "No se encontraron alumnos con ese criterio."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {alumnosFiltrados.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-800 text-xs font-semibold text-slate-400 bg-slate-950/40">
            <div className="flex items-center gap-2">
              <span>Mostrar</span>
              <select
                aria-label="Alumnos por página"
                value={elementosPorPagina}
                onChange={(e) => {
                  setElementosPorPagina(Number(e.target.value));
                  setPaginaActual(1);
                }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 outline-none"
              >
                <option value={15} className="bg-slate-900 text-white">15 por página</option>
                <option value={30} className="bg-slate-900 text-white">30 por página</option>
                <option value={50} className="bg-slate-900 text-white">50 por página</option>
                <option value={100} className="bg-slate-900 text-white">100 por página</option>
              </select>
              <span>
                Mostrando {(paginaActual - 1) * elementosPorPagina + 1} a{" "}
                {Math.min(paginaActual * elementosPorPagina, alumnosFiltrados.length)} de{" "}
                {alumnosFiltrados.length} alumnos
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <span className="px-2 font-bold text-slate-300">
                Página {paginaActual} de {totalPaginas}
              </span>
              <button
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <ModalNuevoAlumno
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
      />

      {alumnoAEditar && (
        <ModalEditarAlumno
          alumno={alumnoAEditar}
          alumnos={alumnos}
          planes={planes}
          onClose={() => setAlumnoAEditar(null)}
          onSubmit={(cambios) => {
            actualizarAlumno(alumnoAEditar.id, cambios);
            setAlumnoAEditar(null);
          }}
        />
      )}

      {alumnoAEliminar && (
        <ModalConfirmarEliminar
          alumno={alumnoAEliminar}
          esInactivo={
            alumnoAEliminar.activo === false || getEstadoCuenta(alumnoAEliminar.id) === "INACTIVO"
          }
          onCancel={() => setAlumnoAEliminar(null)}
          onConfirm={confirmarEliminar}
        />
      )}
    </div>
  );
}


// ---------- Modal: confirmar eliminación ----------
function ModalConfirmarEliminar({
  alumno,
  esInactivo,
  onCancel,
  onConfirm,
}: {
  alumno: Alumno;
  esInactivo: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-3xl shadow-2xl text-slate-100 border border-slate-800 w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200"
      >
        <div
          className={`flex size-12 items-center justify-center rounded-2xl mb-4 ${
            esInactivo
              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
          }`}
        >
          {esInactivo ? <Trash2 className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
        </div>
        <h2 className="text-lg font-black text-white">
          {esInactivo ? `¿Eliminar definitivamente a ${alumno.nombre}?` : `¿Dar de baja a ${alumno.nombre}?`}
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          {esInactivo
            ? "Esta acción eliminará al alumno de forma permanente del sistema y no volverá a aparecer en Inactivos. Sus pagos históricos se conservarán intactos en Finanzas."
            : "El socio pasará a la pestaña de Inactivos por si regresa en el futuro. Si más adelante querés eliminarlo de forma permanente, podrás hacerlo desde Inactivos."}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="h-11 rounded-xl border border-slate-700 bg-slate-800/50 px-5 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-[color,background-color] duration-200 active:scale-95"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`h-11 rounded-xl px-5 text-sm font-bold text-white shadow-lg transition-[color,background-color] duration-200 active:scale-95 ${
              esInactivo
                ? "bg-rose-600 shadow-rose-600/20 hover:bg-rose-500"
                : "bg-amber-600 shadow-amber-600/20 hover:bg-amber-500"
            }`}
          >
            {esInactivo ? "Eliminar definitivamente" : "Dar de baja"}
          </button>
        </div>
      </div>
    </div>
  );
}



