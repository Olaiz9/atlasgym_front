// app/alumnos/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Users, UserCheck, UserX, AlertCircle, Clock, Dumbbell, Plus, X, Search, Trash2, Pencil, ChevronRight, Download, Check } from "lucide-react";
import Link from "next/link";
import { useAppData } from "@/lib/store";
import { soloLetras, soloNumeros, validarDatosAlumno } from "@/lib/validators";
import { formatDiasIngreso } from "@/lib/date-utils";
import { filtrarPlanesDisponibles } from "@/lib/plan-utils";
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
  Plan,
} from "@/lib/types";

const FILTROS_ALUMNOS: { label: string; value: EstadoCuenta | "TODOS" }[] = [
  { label: "Todos", value: "TODOS" },
  { label: "Al día", value: "AL_DIA" },
  { label: "Pendientes", value: "PENDIENTE" },
  { label: "Morosos", value: "MOROSO" },
  { label: "Inactivos", value: "INACTIVO" },
];

export default function AlumnosPage() {
  const { alumnos, agregarAlumno, actualizarAlumno, eliminarAlumno, marcarAsistenciaAlumno, getEstadoCuenta, getPagosDeAlumno, planes, usuarioActual } =
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
      const coincideFiltro = filtro === "TODOS" || a.estadoCuenta === filtro;
      const coincideBusqueda =
        !q ||
        a.nombre.toLowerCase().includes(q) ||
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

  const handleNuevoAlumno = (nuevo: Omit<Alumno, "id">) => {
    agregarAlumno(nuevo);
    setModalAbierto(false);
    toast(`Alumno "${nuevo.nombre}" dado de alta con éxito`, "success");
  };

  const confirmarEliminar = () => {
    if (!alumnoAEliminar) return;
    const nombre = alumnoAEliminar.nombre;
    eliminarAlumno(alumnoAEliminar.id);
    setAlumnoAEliminar(null);
    toast(`Alumno "${nombre}" eliminado del sistema`, "info");
  };

  if (!usuarioActual || usuarioActual.rol === "ALUMNO") {
    return (
      <AccesoRestringido
        titulo="Panel de Alumnos Restringido"
        mensaje="La administración de fichas de alumnos, estados de cuenta y altas solo está disponible para entrenadores y administradores."
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10 md:py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Alumnos</h1>
          <p className="text-sm text-slate-400 mt-1">
            El estado de cuenta e inactividad se calculan automáticamente según los pagos en Finanzas.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
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
          tint={{ bg: "bg-blue-50", text: "text-blue-600", bar: "bg-blue-600" }}
        />
        <MetricCard
          icon={<UserCheck className="size-6" />}
          label="Al día"
          value={`${metrica.alDia}`}
          tint={{ bg: "bg-emerald-50", text: "text-emerald-600", bar: "bg-emerald-500" }}
        />
        <MetricCard
          icon={<AlertCircle className="size-6" />}
          label="Morosos"
          value={`${metrica.morosos}`}
          tint={{ bg: "bg-rose-50", text: "text-rose-500", bar: "bg-rose-500" }}
        />
        <MetricCard
          icon={<UserX className="size-6" />}
          label="Inactivos"
          value={`${metrica.inactivos}`}
          tint={{ bg: "bg-slate-100", text: "text-slate-500", bar: "bg-slate-400" }}
        />
      </div>

      {/* Tarjeta principal: filtros + tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-slate-100 bg-slate-50/60">
          <div className="flex gap-2 flex-wrap">
            {FILTROS_ALUMNOS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltro(f.value)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-[color,background-color] duration-200 active:scale-95 ${
                  filtro === f.value
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
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
              className="pl-9 pr-4 h-10 text-sm bg-white border border-slate-200 rounded-full outline-none transition-[border-color,box-shadow] duration-200 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
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
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 font-bold text-slate-900">
                    <Link
                      href={`/alumnos/${alumno.id}`}
                      className="hover:text-blue-600 hover:underline underline-offset-2 flex items-center gap-1.5"
                    >
                      {alumno.nombre}
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{alumno.plan}</td>
                  <td className="px-6 py-4">
                    {alumno.tieneRutina ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Dumbbell className="w-3 h-3" />
                        Asignada
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-400">
                        Sin rutina
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {alumno.ultimaAsistencia ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDiasIngreso(alumno.ultimaAsistencia)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Sin registros</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${ESTADO_CUENTA_STYLES[alumno.estadoCuenta]}`}
                    >
                      {ESTADO_CUENTA_LABEL[alumno.estadoCuenta]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        marcarAsistenciaAlumno(alumno.id);
                        toast(`Asistencia registrada hoy para ${alumno.nombre}`, "success");
                      }}
                      title="Marcar asistencia hoy"
                      aria-label={`Marcar asistencia hoy para ${alumno.nombre}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors duration-150 active:scale-95 mr-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Presente
                    </button>
                    <button
                      onClick={() => setAlumnoAEditar(alumno)}
                      aria-label={`Editar a ${alumno.nombre}`}
                      className="p-2 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150 active:scale-90"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setAlumnoAEliminar(alumno)}
                      aria-label={`Eliminar a ${alumno.nombre}`}
                      className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors duration-150 active:scale-90"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {alumnosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 text-xs font-semibold text-slate-500 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span>Mostrar</span>
              <select
                aria-label="Alumnos por página"
                value={elementosPorPagina}
                onChange={(e) => {
                  setElementosPorPagina(Number(e.target.value));
                  setPaginaActual(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 outline-none"
              >
                <option value={15}>15 por página</option>
                <option value={30}>30 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
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
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <span className="px-2 font-bold text-slate-700">
                Página {paginaActual} de {totalPaginas}
              </span>
              <button
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
          tienePagos={getPagosDeAlumno(alumnoAEliminar.id).length > 0}
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
  tienePagos,
  onCancel,
  onConfirm,
}: {
  alumno: Alumno;
  tienePagos: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl text-slate-900 border border-slate-200 w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4">
          <Trash2 className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">¿Eliminar a {alumno.nombre}?</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Esta acción no se puede deshacer.
          {tienePagos && (
            <>
              {" "}Este alumno tiene pagos registrados en Finanzas — no se van a borrar, pero van a
              quedar sin un alumno asociado.
            </>
          )}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-[color,background-color] duration-200 active:scale-95"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="h-11 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-500 transition-[color,background-color] duration-200 active:scale-95"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}


