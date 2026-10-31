// app/alumnos/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Users,
  UserCheck,
  UserX,
  AlertCircle,
  Clock,
  Dumbbell,
  Plus,
  Search,
  Trash2,
  Pencil,
  ChevronRight,
  Download,
  Upload,
  X,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useAppData } from "@/lib/store";
import { formatDiasIngreso } from "@/lib/date-utils";
import { ModalNuevoAlumno } from "@/components/modal-nuevo-alumno";
import { ModalEditarAlumno } from "@/components/modal-editar-alumno";
import { AccesoRestringido } from "@/components/acceso-restringido";
import { MetricCard } from "@/components/ui/metric-card";
import { WhatsAppIcon } from "@/components/icons/brand-icons";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/lib/use-debounce";
import { descargarCSV } from "@/lib/export-utils";
import {
  PLANTILLA_CSV_DIA_CERO,
  parsearCsvPadronAlumnos,
  FilaImportacionAlumno,
} from "@/lib/csv-import";
import {
  construirUrlWaMe,
  mensajeCredencialesBienvenidaWhatsapp,
  mensajeRecordatorioCuotaWhatsapp,
  tieneCelularWhatsappValido,
} from "@/lib/whatsapp-utils";
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
  const {
    alumnos,
    actualizarAlumno,
    eliminarAlumno,
    importarAlumnosMasivo,
    getEstadoCuenta,
    getPagosDeAlumno,
    planes,
    usuarioActual,
  } = useAppData();
  const { toast } = useToast();

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<EstadoCuenta | "TODOS">("TODOS");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalImportarAbierto, setModalImportarAbierto] = useState(false);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalAbierto(false);
        setModalImportarAbierto(false);
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
    eliminarAlumno(alumnoAEliminar.id);
    setAlumnoAEliminar(null);
    toast(`Alumno "${nombre}" dado de baja del padrón activo`, "info");
  };

  if (!usuarioActual || usuarioActual.rol === "ALUMNO") {
    return (
      <AccesoRestringido
        titulo="Panel de alumnos restringido"
        mensaje="La administración de fichas de alumnos, estados de cuenta y altas solo está disponible para entrenadores y administradores."
      />
    );
  }

  const urlPortal = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

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
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => setModalImportarAbierto(true)}
            title="Importar padrón masivo desde Excel / CSV"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-sm font-semibold h-11 px-4 rounded-xl border border-slate-700 transition-[color,background-color,transform] duration-200 hover:-translate-y-0.5 active:scale-95"
          >
            <Upload className="w-4 h-4 text-blue-400" />
            Importar CSV
          </button>
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
              {alumnosPaginados.map((alumno) => {
                const tieneWa = tieneCelularWhatsappValido(alumno.celular);
                const debeCuota =
                  alumno.estadoCuenta === "MOROSO" || alumno.estadoCuenta === "PENDIENTE";
                const planObj = planes.find(
                  (p) =>
                    p.id === alumno.planId ||
                    p.nombre.toLowerCase() === (alumno.plan || "").toLowerCase()
                );
                const mensajeWa = debeCuota
                  ? mensajeRecordatorioCuotaWhatsapp({
                      nombre: alumno.nombre,
                      plan: alumno.plan,
                      estadoCuenta: alumno.estadoCuenta,
                      montoTotal: planObj?.precio,
                    })
                  : mensajeCredencialesBienvenidaWhatsapp({
                      nombre: alumno.nombre,
                      usuario: alumno.usuario || alumno.dni || "-",
                      claveInicial: alumno.dni ? alumno.dni.replace(/\D/g, "") : "tu DNI",
                      urlPortal,
                    });

                return (
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
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {tieneWa && alumno.celular && (
                          <a
                            href={construirUrlWaMe(alumno.celular, mensajeWa)}
                            target="atlas_whatsapp_tab"
                            rel="noopener noreferrer"
                            title={
                              debeCuota
                                ? `Recordar cuota por WhatsApp a ${alumno.nombre}`
                                : `Enviar acceso del portal por WhatsApp a ${alumno.nombre}`
                            }
                            aria-label={`WhatsApp a ${alumno.nombre}`}
                            className={`p-2 rounded-lg transition-colors active:scale-90 ${
                              debeCuota
                                ? "text-emerald-400 hover:bg-emerald-500/15"
                                : "text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400"
                            }`}
                          >
                            <WhatsAppIcon className="w-4 h-4 fill-current" />
                          </a>
                        )}
                        <button
                          onClick={() => setAlumnoAEditar(alumno)}
                          aria-label={`Editar a ${alumno.nombre}`}
                          className="p-2 rounded-lg text-slate-400 hover:bg-blue-500/10 hover:text-blue-400 transition-colors duration-150 active:scale-90"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setAlumnoAEliminar(alumno)}
                          aria-label={`Eliminar a ${alumno.nombre}`}
                          className="p-2 rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors duration-150 active:scale-90"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {alumnosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                    {alumnos.length === 0
                      ? "Todavía no hay alumnos cargados. Podés importar tu planilla Excel en segundos con 'Importar CSV'."
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

      {modalImportarAbierto && (
        <ModalImportarAlumnosCsv
          onClose={() => setModalImportarAbierto(false)}
          onImportar={async (filas) => {
            const res = await importarAlumnosMasivo(filas);
            if (res.ok && res.resumen) {
              toast(
                `Importación completada: ${res.resumen.creados} nuevos, ${res.resumen.actualizados} actualizados y ${res.resumen.pagosInicialesRegistrados} cuotas iniciales cargadas.`,
                "success"
              );
              setModalImportarAbierto(false);
            } else {
              toast(res.error || "No se pudo completar la importación", "error");
            }
          }}
        />
      )}

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

// ---------- Modal: Importador Masivo CSV ("Día Cero") ----------
function ModalImportarAlumnosCsv({
  onClose,
  onImportar,
}: {
  onClose: () => void;
  onImportar: (filas: FilaImportacionAlumno[]) => Promise<void>;
}) {
  const [textoCsv, setTextoCsv] = useState("");
  const [importando, setImportando] = useState(false);

  const resultado = useMemo(
    () => (textoCsv.trim() ? parsearCsvPadronAlumnos(textoCsv) : null),
    [textoCsv]
  );

  const descargarPlantilla = () => {
    const blob = new Blob(["\uFEFF" + PLANTILLA_CSV_DIA_CERO], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla_dia_cero_atlas_gym.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setTextoCsv(reader.result);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const ejecutarImportacion = async () => {
    if (!resultado || resultado.filasValidas.length === 0) return;
    setImportando(true);
    try {
      await onImportar(resultado.filasValidas);
    } finally {
      setImportando(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-3xl shadow-2xl text-slate-100 border border-slate-800 w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                Importar padrón de socios (CSV / Excel)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cargá cientos de socios de una sola vez con su plan y último mes abonado. Su clave inicial será su DNI.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-white rounded-full p-1.5 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-slate-950/70 border border-slate-800 p-4">
          <div className="text-xs text-slate-300 space-y-0.5">
            <p className="font-bold text-white">Columnas soportadas (separadas por ; o ,):</p>
            <p className="text-slate-400">
              <strong>Nombre</strong> y <strong>DNI</strong> (obligatorias) · Celular · Email · Plan ·{" "}
              <strong>Ultimo_Mes_Pago</strong> (ej: <code className="text-blue-400">2026-10</code> o{" "}
              <code className="text-blue-400">10/2026</code>)
            </p>
          </div>
          <button
            type="button"
            onClick={descargarPlantilla}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-blue-300 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar plantilla
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-400 mb-1.5 block">
              1. Seleccioná tu archivo .CSV exportado de Excel o Google Sheets
            </span>
            <input
              type="file"
              accept=".csv,.txt,text/csv"
              onChange={handleArchivo}
              className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer bg-slate-950/60 border border-slate-800 rounded-xl p-2"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-400 mb-1.5 block">
              O pegá directamente las filas acá:
            </span>
            <textarea
              rows={4}
              value={textoCsv}
              onChange={(e) => setTextoCsv(e.target.value)}
              placeholder={"Nombre;DNI;Celular;Plan;Ultimo_Mes_Pago\nCamila Sosa;42111222;1144556677;Pase Libre;2026-10"}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl outline-none focus:border-blue-500 text-xs font-mono text-slate-200 placeholder-slate-600"
            />
          </label>
        </div>

        {resultado && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {resultado.filasValidas.length} socio(s) válidos listos para importar
              </span>
              {resultado.erroresFila.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                  {resultado.erroresFila.length} fila(s) con observaciones
                </span>
              )}
            </div>

            {resultado.erroresFila.length > 0 && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-200 space-y-1 max-h-28 overflow-y-auto">
                {resultado.erroresFila.slice(0, 6).map((err, idx) => (
                  <p key={idx}>• {err}</p>
                ))}
              </div>
            )}

            {resultado.filasValidas.length > 0 && (
              <div className="rounded-xl border border-slate-800 overflow-x-auto max-h-52">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 text-left border-b border-slate-800">
                      <th className="px-3 py-2 font-bold">Nombre</th>
                      <th className="px-3 py-2 font-bold">DNI</th>
                      <th className="px-3 py-2 font-bold">Celular</th>
                      <th className="px-3 py-2 font-bold">Plan</th>
                      <th className="px-3 py-2 font-bold">Últ. mes pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.filasValidas.slice(0, 8).map((f, idx) => (
                      <tr key={idx} className="border-b border-slate-800/60 last:border-0">
                        <td className="px-3 py-2 font-semibold text-white">{f.nombre}</td>
                        <td className="px-3 py-2 font-mono text-slate-300">{f.dni}</td>
                        <td className="px-3 py-2 text-slate-400">{f.celular || "-"}</td>
                        <td className="px-3 py-2 text-slate-300">{f.planNombre || "Por defecto"}</td>
                        <td className="px-3 py-2 font-mono text-emerald-400">
                          {f.ultimoPeriodoPago || "Sin pago previo"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {resultado.filasValidas.length > 8 && (
                  <p className="px-3 py-2 text-[11px] text-slate-500 bg-slate-950/50">
                    + {resultado.filasValidas.length - 8} socio(s) adicionales en el lote.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-700 bg-slate-800/50 px-5 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!resultado || resultado.filasValidas.length === 0 || importando}
            onClick={ejecutarImportacion}
            className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {importando
              ? "Importando padrón..."
              : `Importar ${resultado?.filasValidas.length ?? 0} socio(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Modal: confirmar baja ----------
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
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-3xl shadow-2xl text-slate-100 border border-slate-800 w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 mb-4">
          <Trash2 className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-white">¿Dar de baja a {alumno.nombre}?</h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Su ficha pasará a estado inactivo sin perder trazabilidad.
          {tienePagos && (
            <>
              {" "}Sus pagos históricos registrados en Finanzas se conservan intactos para la contabilidad del gimnasio.
            </>
          )}
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
            className="h-11 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-500 transition-[color,background-color] duration-200 active:scale-95"
          >
            Dar de baja
          </button>
        </div>
      </div>
    </div>
  );
}
