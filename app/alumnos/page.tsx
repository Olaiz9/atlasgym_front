// app/alumnos/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dumbbell,
  Plus,
  Search,
  Pencil,
  Download,
  Upload,
  UserX,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useAppData } from "@/lib/store";
import { calcularDiasDesde, fechaLocalHoy, formatDiasIngreso } from "@/lib/date-utils";
import { extraerLimiteDiasSemana, filtrarAsistenciasActivas } from "@/lib/asistencia-utils";
import { inicialesDe } from "@/lib/utils";
import { ModalNuevoAlumno } from "@/components/modal-nuevo-alumno";
import { ModalEditarAlumno } from "@/components/modal-editar-alumno";
import { ModalConfirmarBaja } from "@/components/modal-confirmar-baja";
import { AccesoRestringido } from "@/components/acceso-restringido";
import { EstadoCuentaEtiqueta } from "@/components/estado-cuenta-etiqueta";
import { WhatsAppIcon } from "@/components/icons/brand-icons";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/lib/use-debounce";
import { descargarCSV } from "@/lib/export-utils";
import {
  apiSimularImportacionAlumnos,
  RespuestaImportacionMasivaDto,
} from "@/lib/api-client";
import {
  ORDEN_ESTADOS_REVISION,
  resumirRevisionImportacion,
} from "@/lib/importacion-revision";
import {
  PLANTILLA_CSV_DIA_CERO,
  decodificarArchivoCsv,
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
  mesesAdeudados,
  RegistroAsistencia,
  saldosDeSeniaPorAlumno,
} from "@/lib/types";

type FiltroAlumnos = EstadoCuenta | "TODOS" | "SENIA";
type AlumnoConEstado = Alumno & { estadoCuenta: EstadoCuenta };

const claseIcono =
  "flex size-11 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-white";
const claseReactivar =
  "h-11 shrink-0 rounded-xl border border-[#2A4677] px-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-800";

function Separador() {
  return <span aria-hidden="true" className="mx-1.5 text-slate-600">|</span>;
}

function Avatar({ nombre }: { nombre: string }) {
  return (
    <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#1E3663] text-sm font-bold text-blue-200">
      {inicialesDe(nombre)}
    </span>
  );
}

export default function AlumnosPage() {
  const {
    alumnos,
    actualizarAlumno,
    eliminarAlumno,
    importarAlumnosMasivo,
    getEstadoCuenta,
    pagos,
    asistencias,
    planes,
    usuarioActual,
    datosCobro,
  } = useAppData();
  const { toast } = useToast();

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroAlumnos>("TODOS");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalImportarAbierto, setModalImportarAbierto] = useState(false);
  const [alumnoAEditar, setAlumnoAEditar] = useState<Alumno | null>(null);
  const [alumnoAEliminar, setAlumnoAEliminar] = useState<Alumno | null>(null);

  const alumnosConEstado = useMemo(
    () => alumnos.map((a) => ({ ...a, estadoCuenta: getEstadoCuenta(a.id) })),
    [alumnos, getEstadoCuenta]
  );

  const saldosSenia = useMemo(() => saldosDeSeniaPorAlumno(pagos), [pagos]);

  // Último ingreso de hoy por socio, para el detalle de cada fila
  const ingresosHoy = useMemo(() => {
    const hoy = fechaLocalHoy();
    const porSocio = new Map<string, RegistroAsistencia>();
    for (const a of asistencias) {
      if (a.fecha !== hoy) continue;
      const previo = porSocio.get(a.alumnoId);
      if (!previo || a.timestamp > previo.timestamp) porSocio.set(a.alumnoId, a);
    }
    return porSocio;
  }, [asistencias]);

  const metrica = useMemo(() => {
    const activos = alumnosConEstado.filter((a) => a.activo && a.estadoCuenta !== "INACTIVO");
    const contar = (estado: EstadoCuenta) => activos.filter((a) => a.estadoCuenta === estado).length;
    return {
      total: alumnosConEstado.length,
      alDia: contar("AL_DIA"),
      pendientes: contar("PENDIENTE"),
      morosos: contar("MOROSO"),
      senias: activos.filter((a) => saldosSenia.has(a.id)).length,
      inactivos: alumnosConEstado.length - activos.length,
    };
  }, [alumnosConEstado, saldosSenia]);

  const busquedaDebounced = useDebounce(busqueda, 250);
  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina, setElementosPorPagina] = useState(15);

  const alumnosFiltrados = useMemo(() => {
    const q = busquedaDebounced.trim().toLowerCase();
    return alumnosConEstado.filter((a) => {
      const activo = a.activo !== false && a.estadoCuenta !== "INACTIVO";
      const coincideFiltro =
        filtro === "TODOS"
          ? activo
          : filtro === "INACTIVO"
          ? !activo
          : filtro === "SENIA"
          ? activo && saldosSenia.has(a.id)
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
  }, [alumnosConEstado, filtro, busquedaDebounced, saldosSenia]);

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
    toast(`Alumno "${nombre}" dado de baja (movido a Inactivos)`, "info");
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

  const reactivar = (alumno: Alumno) => {
    actualizarAlumno(alumno.id, { activo: true });
    toast(`Alumno "${alumno.nombre}" reactivado con éxito`, "success");
  };

  const planDe = (alumno: Alumno) =>
    planes.find(
      (p) => p.id === alumno.planId || p.nombre.toLowerCase() === (alumno.plan || "").toLowerCase()
    );

  const whatsappDe = (alumno: AlumnoConEstado) => {
    if (!alumno.celular || !tieneCelularWhatsappValido(alumno.celular)) return null;
    const debe = alumno.estadoCuenta === "MOROSO" || alumno.estadoCuenta === "PENDIENTE";
    const mensaje = debe
      ? mensajeRecordatorioCuotaWhatsapp({
          nombre: alumno.nombre,
          plan: alumno.plan,
          estadoCuenta: alumno.estadoCuenta,
          montoTotal: planDe(alumno)?.precio,
          aliasPago: datosCobro.alias,
        })
      : mensajeCredencialesBienvenidaWhatsapp({
          nombre: alumno.nombre,
          usuario: alumno.usuario || alumno.dni || "-",
          claveInicial: alumno.dni ? alumno.dni.replace(/\D/g, "") : "tu DNI",
          urlPortal,
        });
    return { debe, href: construirUrlWaMe(alumno.celular, mensaje) };
  };

  const situacionDe = (alumno: AlumnoConEstado) => {
    if (alumno.activo === false) return "dado de baja";
    const saldo = saldosSenia.get(alumno.id);
    if (saldo) return `falta $${saldo.toLocaleString("es-AR")}`;
    if (alumno.estadoCuenta === "MOROSO" || alumno.estadoCuenta === "PENDIENTE") {
      const meses = mesesAdeudados(alumno.id, pagos, alumno.fechaAlta).length;
      if (meses > 0) return `debe ${meses} ${meses === 1 ? "mes" : "meses"}`;
    }
    const ingreso = ingresosHoy.get(alumno.id);
    if (ingreso) {
      return filtrarAsistenciasActivas([ingreso]).length > 0
        ? "en sala ahora"
        : `vino hoy ${ingreso.hora.slice(0, 5)}`;
    }
    if (!alumno.ultimaAsistencia) return "sin ingresos";
    const dias = calcularDiasDesde(alumno.ultimaAsistencia);
    return dias > 7 ? `sin ingresos en ${dias} días` : formatDiasIngreso(alumno.ultimaAsistencia).toLowerCase();
  };

  const detalleAlumno = (alumno: AlumnoConEstado) => {
    const plan = planDe(alumno);
    const limite = plan ? extraerLimiteDiasSemana(plan.diasPorSemana) : null;
    const frecuencia = !plan ? alumno.plan || "Sin plan" : limite ? `${limite} ${limite === 1 ? "día" : "días"}` : "Libre";
    return (
      <>
        {frecuencia}
        <Separador />
        {situacionDe(alumno)}
      </>
    );
  };

  const filtrosAlumnos: { label: string; value: FiltroAlumnos; cantidad?: number; soloEscritorio?: boolean }[] = [
    { label: "Todos", value: "TODOS" },
    { label: "Al día", value: "AL_DIA", cantidad: metrica.alDia, soloEscritorio: true },
    { label: "Seña", value: "SENIA", cantidad: metrica.senias },
    { label: "Pendientes", value: "PENDIENTE", cantidad: metrica.pendientes },
    { label: "Vencidos", value: "MOROSO", cantidad: metrica.morosos },
    { label: "Inactivos", value: "INACTIVO", cantidad: metrica.inactivos, soloEscritorio: true },
  ];


  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-5 pb-28 pt-5 md:gap-8 md:px-14 md:pb-16 md:pt-12">
      <header className="flex flex-col gap-3 md:gap-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[34px] font-extrabold uppercase leading-[.95] text-white md:text-[40px]">
            Alumnos <span className="text-2xl text-slate-500 md:text-[28px]">{metrica.total - metrica.inactivos}</span>
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setModalImportarAbierto(true)}
              aria-label="Importar CSV"
              title="Importar padrón masivo desde Excel / CSV"
              className="flex size-11 items-center justify-center gap-2 rounded-xl bg-[#162A50] text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-800 md:w-auto md:px-4"
            >
              <Download className="size-5 md:size-4" />
              <span className="hidden md:inline">Importar CSV</span>
            </button>
            <button
              type="button"
              onClick={exportarCSVAlumnos}
              title="Exportar listado a archivo CSV / Excel"
              className="hidden h-11 items-center gap-2 rounded-xl bg-[#162A50] px-4 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-800 md:flex"
            >
              <Upload className="size-4" />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              aria-label="Agregar alumno"
              className="flex size-11 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-500 md:w-auto md:px-5"
            >
              <Plus className="size-5" />
              <span className="hidden md:inline">Agregar alumno</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row-reverse md:items-center md:justify-between">
          <label className="flex h-12 items-center gap-2 rounded-xl border border-[#2A4677] bg-[#162A50] px-3.5 focus-within:border-blue-400 md:h-11 md:w-80">
            <Search className="size-[18px] shrink-0 text-slate-500" />
            <input
              id="buscar-alumnos"
              type="search"
              aria-label="Buscar alumno"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, DNI o celular"
              className="min-w-0 flex-1 bg-transparent text-base text-slate-100 outline-none placeholder:text-slate-500 md:text-sm"
            />
          </label>

          <div role="group" aria-label="Filtrar por estado" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0">
            {filtrosAlumnos.map((f) => {
              const activo = filtro === f.value
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setFiltro(f.value)}
                  className={`flex h-11 shrink-0 items-center rounded-full px-3.5 text-sm transition-colors ${
                    activo
                      ? 'bg-slate-100 font-bold text-[#0E1B36]'
                      : 'border border-[#2A4677] font-semibold text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  {f.label}
                  {f.cantidad !== undefined && (
                    <span
                      className={`ml-2 h-[22px] min-w-[22px] items-center justify-center rounded-full bg-slate-600/30 px-1.5 text-xs font-bold ${
                        f.soloEscritorio ? 'hidden md:inline-flex' : 'inline-flex'
                      }`}
                    >
                      {f.cantidad}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {alumnosFiltrados.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 px-5 py-10 text-center text-sm text-slate-500">
          {alumnos.length === 0
            ? "Todavía no hay alumnos cargados. Podés importar tu planilla Excel en segundos con 'Importar CSV'."
            : 'No se encontraron alumnos con ese criterio.'}
        </p>
      ) : (
        <>
          {/* La tabla va primero: en escritorio es la visible y las búsquedas por texto dan con ella. */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-800 md:block">
            <table className="w-full min-w-[860px] border-collapse text-[15px]">
              <thead>
                <tr className="bg-slate-900/60 text-left text-[13px] text-slate-500">
                  <th className="px-5 py-3 font-medium">Alumno</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Rutina</th>
                  <th className="px-5 py-3 font-medium">Último ingreso</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {alumnosPaginados.map((alumno) => {
                  const wa = whatsappDe(alumno)
                  return (
                    <tr key={alumno.id} className="border-t border-slate-800 transition-colors hover:bg-slate-900/40">
                      <td className="px-5 py-3">
                        <Link href={`/alumnos/${alumno.id}`} className="flex items-center gap-3 font-semibold text-white hover:text-blue-300">
                          <Avatar nombre={alumno.nombre} />
                          <span className="min-w-0">
                            <span className="block">{alumno.nombre}</span>
                            {(alumno.usuario || alumno.dni) && (
                              <span className="block text-[13px] font-normal text-slate-500">
                                {alumno.usuario && `@${alumno.usuario}`}
                                {alumno.usuario && alumno.dni && <Separador />}
                                {alumno.dni && `DNI ${alumno.dni}`}
                              </span>
                            )}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-300">{alumno.plan}</td>
                      <td className="px-5 py-3 text-slate-300">
                        {alumno.tieneRutina ? (
                          <span className="inline-flex items-center gap-1.5"><Dumbbell className="size-3.5 text-slate-500" />Asignada</span>
                        ) : (
                          <span className="text-slate-500">Sin rutina</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-300">
                        {alumno.ultimaAsistencia ? formatDiasIngreso(alumno.ultimaAsistencia) : <span className="text-slate-500">Sin registros</span>}
                      </td>
                      <td className="px-5 py-3">
                        <EstadoCuentaEtiqueta estado={alumno.estadoCuenta} conSenia={saldosSenia.has(alumno.id)} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {wa && (
                            <a
                              href={wa.href}
                              target="atlas_whatsapp_tab"
                              rel="noopener noreferrer"
                              title={wa.debe ? `Recordar cuota por WhatsApp a ${alumno.nombre}` : `Enviar acceso del portal por WhatsApp a ${alumno.nombre}`}
                              aria-label={`WhatsApp a ${alumno.nombre}`}
                              className={claseIcono}
                            >
                              <WhatsAppIcon className="size-[18px] fill-current" />
                            </a>
                          )}
                          {alumno.activo === false && (
                            <button type="button" onClick={() => reactivar(alumno)} aria-label={`Reactivar a ${alumno.nombre}`} className={claseReactivar}>
                              Reactivar
                            </button>
                          )}
                          <button type="button" onClick={() => setAlumnoAEditar(alumno)} aria-label={`Editar a ${alumno.nombre}`} title="Editar ficha" className={claseIcono}>
                            <Pencil className="size-[18px]" />
                          </button>
                          {alumno.activo !== false && (
                            <button type="button" onClick={() => setAlumnoAEliminar(alumno)} aria-label={`Dar de baja a ${alumno.nombre}`} title="Dar de baja (enviar a Inactivos)" className={claseIcono}>
                              <UserX className="size-[18px]" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Celular: filas simples; editar y dar de baja están en la ficha del socio. */}
          <ul className="md:hidden">
            {alumnosPaginados.map((alumno) => {
              const wa = whatsappDe(alumno)
              return (
                <li key={alumno.id} className="flex items-center gap-3 border-b border-slate-800 py-3 last:border-0">
                  <Avatar nombre={alumno.nombre} />
                  <Link href={`/alumnos/${alumno.id}`} className="min-w-0 flex-1 text-white">
                    <span className="block truncate font-semibold">{alumno.nombre}</span>
                    <span className="block truncate text-[13px] text-slate-400">{detalleAlumno(alumno)}</span>
                  </Link>
                  {wa?.debe && (
                    <a
                      href={wa.href}
                      target="atlas_whatsapp_tab"
                      rel="noopener noreferrer"
                      aria-label={`WhatsApp a ${alumno.nombre}`}
                      className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-[#2A4677] text-slate-200"
                    >
                      <WhatsAppIcon className="size-[18px] fill-current" />
                    </a>
                  )}
                  {alumno.activo === false ? (
                    <button type="button" onClick={() => reactivar(alumno)} aria-label={`Reactivar a ${alumno.nombre}`} className={claseReactivar}>
                      Reactivar
                    </button>
                  ) : (
                    <EstadoCuentaEtiqueta estado={alumno.estadoCuenta} conSenia={saldosSenia.has(alumno.id)} />
                  )}
                </li>
              )
            })}
          </ul>

          <div className="flex flex-col items-center justify-between gap-3 text-[13px] text-slate-500 md:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <select
                aria-label="Alumnos por página"
                value={elementosPorPagina}
                onChange={(e) => {
                  setElementosPorPagina(Number(e.target.value))
                  setPaginaActual(1)
                }}
                className="h-11 rounded-xl border border-slate-800 bg-slate-950 px-2.5 text-slate-200 outline-none"
              >
                {[15, 30, 50, 100].map((n) => (
                  <option key={n} value={n}>{n} por página</option>
                ))}
              </select>
              <span>
                {(paginaActual - 1) * elementosPorPagina + 1} a {Math.min(paginaActual * elementosPorPagina, alumnosFiltrados.length)} de {alumnosFiltrados.length}
              </span>
              <button type="button" onClick={exportarCSVAlumnos} className="flex h-11 items-center gap-2 px-1 font-medium text-blue-300 md:hidden">
                <Upload className="size-4" />
                Exportar CSV
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="h-11 rounded-xl border border-slate-800 px-3.5 text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="px-1 text-slate-300">Página {paginaActual} de {totalPaginas}</span>
              <button
                type="button"
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                className="h-11 rounded-xl border border-slate-800 px-3.5 text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}

      <ModalNuevoAlumno
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
      />

      {modalImportarAbierto && (
        <ModalImportarAlumnosCsv
          onClose={() => setModalImportarAbierto(false)}
          onSimular={async (filas) => {
            try {
              return await apiSimularImportacionAlumnos(filas);
            } catch (err: unknown) {
              const detalle = err instanceof Error ? err.message : "";
              toast(`No se pudo revisar la planilla${detalle ? `: ${detalle}` : ""}`, "error");
              return null;
            }
          }}
          onImportar={async (filas) => {
            const res = await importarAlumnosMasivo(filas);
            if (res.ok && res.resumen) {
              toast(
                `Importación completada: ${res.resumen.creados} nuevos, ${res.resumen.actualizados} actualizados y ${res.resumen.pagosInicialesRegistrados} cuotas iniciales cargadas.`,
                "success"
              );
              // Si el servidor dejó avisos (plan inexistente, email inválido...), el modal queda
              // abierto para mostrarlos: si se cerrara, el titular nunca se enteraría.
              const advertencias = res.resumen.advertencias ?? [];
              if (advertencias.length === 0) {
                setModalImportarAbierto(false);
              }
              return advertencias;
            }
            toast(res.error || "No se pudo completar la importación", "error");
            return null;
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
        <ModalConfirmarBaja
          alumno={alumnoAEliminar}
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
  onSimular,
  onImportar,
}: {
  onClose: () => void;
  /** Simulacro en el servidor: devuelve cómo quedaría el padrón sin guardar nada, o null si falló. */
  onSimular: (filas: FilaImportacionAlumno[]) => Promise<RespuestaImportacionMasivaDto | null>;
  /** Devuelve las advertencias del servidor si la importación salió bien, o null si falló. */
  onImportar: (filas: FilaImportacionAlumno[]) => Promise<string[] | null>;
}) {
  const [textoCsv, setTextoCsv] = useState("");
  const [importando, setImportando] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [advertenciasServidor, setAdvertenciasServidor] = useState<string[] | null>(null);
  // Simulacro de la planilla actual. Si cambia el texto, hay que volver a revisar antes de importar.
  const [simulacro, setSimulacro] = useState<RespuestaImportacionMasivaDto | null>(null);

  const resultado = useMemo(
    () => (textoCsv.trim() ? parsearCsvPadronAlumnos(textoCsv) : null),
    [textoCsv]
  );
  const revision = useMemo(
    () => (simulacro ? resumirRevisionImportacion(simulacro) : null),
    [simulacro]
  );

  const cambiarTexto = (texto: string) => {
    setTextoCsv(texto);
    setSimulacro(null);
  };

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
      if (!(reader.result instanceof ArrayBuffer)) return;
      // Leemos bytes (no texto) para detectar si Excel lo guardó en Windows-1252 o si es un .xlsx
      const decodificado = decodificarArchivoCsv(new Uint8Array(reader.result));
      if (decodificado.ok) {
        setErrorArchivo(null);
        cambiarTexto(decodificado.texto);
      } else {
        setErrorArchivo(decodificado.error);
        cambiarTexto("");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const revisarPlanilla = async () => {
    if (!resultado || resultado.filasValidas.length === 0) return;
    setRevisando(true);
    try {
      setSimulacro(await onSimular(resultado.filasValidas));
    } finally {
      setRevisando(false);
    }
  };

  const ejecutarImportacion = async () => {
    if (!resultado || resultado.filasValidas.length === 0 || !simulacro) return;
    setImportando(true);
    try {
      const advertencias = await onImportar(resultado.filasValidas);
      if (advertencias && advertencias.length > 0) {
        setAdvertenciasServidor(advertencias);
      }
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
              <h2 className="text-3xl font-black text-white">
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
              onChange={(e) => cambiarTexto(e.target.value)}
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
                {resultado.erroresFila.map((err, idx) => (
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
                  <p className="px-3 py-2 text-xs text-slate-500 bg-slate-950/50">
                    + {resultado.filasValidas.length - 8} socio(s) adicionales en el lote.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {simulacro && revision && !advertenciasServidor && (
          <section
            aria-label="Revisión antes de importar"
            className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3 text-xs"
          >
            <div>
              <p className="text-sm font-bold text-white">Así quedaría el padrón</p>
              <p className="text-slate-400">
                Es un simulacro con las reglas reales de cobro: todavía no se guardó nada.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                {simulacro.creados} nuevos
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                {simulacro.actualizados} ya existían
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                {simulacro.pagosInicialesRegistrados} cuotas cargadas
              </span>
              {simulacro.omitidos > 0 && (
                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                  {simulacro.omitidos} filas omitidas
                </span>
              )}
            </div>

            {revision.conEstados && (
              <div className="flex flex-wrap gap-2" aria-label="Estado de cuenta con que quedan">
                {ORDEN_ESTADOS_REVISION.map((estado) => (
                  <span
                    key={estado}
                    className={`px-3 py-1 rounded-full font-bold ${ESTADO_CUENTA_STYLES[estado]}`}
                  >
                    {ESTADO_CUENTA_LABEL[estado]}: {revision.porEstado[estado]}
                  </span>
                ))}
              </div>
            )}

            {revision.morosos.length > 0 && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 space-y-2">
                <p className="flex items-start gap-2 text-rose-100">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-rose-400" />
                  <span>
                    <strong>{revision.morosos.length} socio(s) quedarían morosos.</strong> Revisalos con
                    los titulares: si alguno pagó, corregí su Ultimo_Mes_Pago en el Excel y volvé a revisar.
                  </span>
                </p>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-rose-500/20">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-rose-200/80 bg-slate-950/60">
                        <th className="px-3 py-1.5 font-bold">Fila</th>
                        <th className="px-3 py-1.5 font-bold">Nombre</th>
                        <th className="px-3 py-1.5 font-bold">DNI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revision.morosos.map((s) => (
                        <tr key={s.dni} className="border-t border-rose-500/10">
                          <td className="px-3 py-1.5 font-mono text-rose-200">{s.fila}</td>
                          <td className="px-3 py-1.5 font-semibold text-white">{s.nombre}</td>
                          <td className="px-3 py-1.5 font-mono text-slate-300">{s.dni}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {simulacro.advertencias.length > 0 && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-amber-200 space-y-1 max-h-40 overflow-y-auto">
                <p className="font-bold text-amber-100">Avisos ({simulacro.advertencias.length}):</p>
                {simulacro.advertencias.map((adv, idx) => (
                  <p key={idx}>• {adv}</p>
                ))}
              </div>
            )}
          </section>
        )}

        {errorArchivo && (
          <div role="alert" className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-200">
            {errorArchivo}
          </div>
        )}

        {advertenciasServidor && (
          <div role="status" className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-200 space-y-1 max-h-48 overflow-y-auto">
            <p className="font-bold text-amber-100">
              La importación se completó, pero revisá estos {advertenciasServidor.length} aviso(s):
            </p>
            {advertenciasServidor.map((adv, idx) => (
              <p key={idx}>• {adv}</p>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-700 bg-slate-800/50 px-5 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {advertenciasServidor ? "Cerrar" : "Cancelar"}
          </button>
          {simulacro ? (
            <button
              type="button"
              disabled={!resultado || resultado.filasValidas.length === 0 || importando || advertenciasServidor !== null}
              onClick={ejecutarImportacion}
              className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {importando
                ? "Importando padrón..."
                : `Confirmar importación (${resultado?.filasValidas.length ?? 0})`}
            </button>
          ) : (
            <button
              type="button"
              disabled={!resultado || resultado.filasValidas.length === 0 || revisando || advertenciasServidor !== null}
              onClick={revisarPlanilla}
              className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {revisando
                ? "Revisando planilla..."
                : `Revisar ${resultado?.filasValidas.length ?? 0} socio(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

