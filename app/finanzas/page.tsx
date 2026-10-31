// app/finanzas/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  DollarSign,
  AlertCircle,
  Clock,
  Users,
  Plus,
  X,
  Search,
  ChevronDown,
  Ban,
  CheckCircle2,
  MessageCircle,
  Download,
  Copy,
  Check,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useAppData } from "@/lib/store";
import {
  formatFechaAR,
  calcularVencimientoCuota,
  fechaLocalHoy,
  periodoMesActual,
  sumarMesesPeriodo,
} from "@/lib/date-utils";
import { CONTACTO_ATLAS } from "@/lib/constants";
import {
  EstadoPago,
  Pago,
  ESTADO_CUENTA_LABEL,
  ESTADO_CUENTA_STYLES,
  UsuarioSesion,
  Alumno,
  Plan,
  EstadoCuenta,
  obtenerMaxPeriodoCubiertoAlumno,
  obtenerPeriodoFinCubierto,
  obtenerMontoRecaudadoPago,
  obtenerSaldoPendientePago,
  calcularArqueoCajaLocal,
  verificarSolapamientoPeriodoPago,
} from "@/lib/types";
import { construirLinkWhatsapp } from "@/lib/validators";
import {
  construirUrlWaMe,
  mensajeRecordatorioCuotaWhatsapp,
  tieneCelularWhatsappValido,
} from "@/lib/whatsapp-utils";
import { WhatsAppIcon } from "@/components/icons/brand-icons";
import { MetricCard } from "@/components/ui/metric-card";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/lib/use-debounce";
import { descargarCSV } from "@/lib/export-utils";

const FILTROS: { label: string; value: EstadoPago | "TODOS" }[] = [
  { label: "Todos", value: "TODOS" },
  { label: "Pagados", value: "PAGADO" },
  { label: "Señas parciales", value: "PARCIAL" },
  { label: "Pendientes", value: "PENDIENTE" },
  { label: "Vencidos", value: "VENCIDO" },
  { label: "Anulados", value: "ANULADO" },
];

const OPCIONES_VIGENCIA_MESES: { value: number; label: string }[] = [
  { value: 1, label: "1 mes (Mensual)" },
  { value: 2, label: "2 meses (Bimestral)" },
  { value: 3, label: "3 meses (Trimestral)" },
  { value: 6, label: "6 meses (Semestral)" },
  { value: 12, label: "12 meses (Anual)" },
];

const ESTADO_STYLES: Record<EstadoPago, string> = {
  PAGADO: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  PARCIAL: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
  PENDIENTE: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  VENCIDO: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  ANULADO: "bg-slate-800 text-slate-400 border border-slate-700",
};

const MOTIVOS_ANULACION_RAPIDOS = [
  "Importe mal tipeado",
  "Período / mes equivocado",
  "Socio equivocado",
  "Medio de pago erróneo",
];

const NOMBRES_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function SelectorMes({
  value,
  onChange,
  disabled,
}: {
  value: string; // "YYYY-MM"
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [anioStr, mesStr] = value.split("-");
  const anioActual = new Date().getFullYear();
  const anios = Array.from({ length: 7 }, (_, i) => anioActual - 3 + i);

  return (
    <div
      className={`flex items-center h-11 rounded-full border border-slate-200 bg-white transition-opacity ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <select
        disabled={disabled}
        aria-label="Seleccionar mes"
        value={Number(mesStr) - 1}
        onChange={(e) =>
          onChange(`${anioStr}-${String(Number(e.target.value) + 1).padStart(2, "0")}`)
        }
        className="h-full pl-4 pr-2 bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer disabled:cursor-not-allowed appearance-none"
      >
        {NOMBRES_MESES.map((nombre, i) => (
          <option key={nombre} value={i}>{nombre}</option>
        ))}
      </select>
      <div className="h-5 w-px bg-slate-200 shrink-0" />
      <select
        disabled={disabled}
        aria-label="Seleccionar año"
        value={anioStr}
        onChange={(e) => onChange(`${e.target.value}-${mesStr}`)}
        className="h-full pl-2 pr-4 bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer disabled:cursor-not-allowed appearance-none"
      >
        {anios.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </div>
  );
}

function formatearMes(mesStr: string) {
  const [anio, mesNum] = mesStr.split("-").map(Number);
  if (!anio || !mesNum) return mesStr;
  const texto = new Date(anio, mesNum - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function mesActualISO() {
  return periodoMesActual();
}

// ---------- Vista dedicada para el Alumno (Mis Cuotas) ----------
function VistaCuotasAlumno({ usuario }: { usuario: UsuarioSesion }) {
  const { alumnos, getPagosDeAlumno, getEstadoCuenta, planes } = useAppData();
  const [copiado, setCopiado] = useState(false);

  const alumno = usuario.alumnoId ? alumnos.find((a) => a.id === usuario.alumnoId) : undefined;

  if (!alumno) {
    return (
      <div className="mx-auto max-w-[800px] px-5 py-16 text-center">
        <div className="mx-auto size-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <AlertCircle className="size-8" />
        </div>
        <h1 className="text-2xl font-black text-white">Ficha de alumno no vinculada</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
          Tu usuario ({usuario.email}) no tiene una ficha de socio activa asociada en el gimnasio.
          Por favor consultá en recepción para que vinculen tu cuenta.
        </p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const misPagos = getPagosDeAlumno(alumno.id).filter((p) => p.estado !== "ANULADO");
  const estadoCuenta = getEstadoCuenta(alumno.id);
  const maxPeriodoCubierto = obtenerMaxPeriodoCubiertoAlumno(misPagos);

  const ultimoPago = misPagos[0];
  const planEncontrado = planes.find(
    (p) => p.id === alumno.planId || p.nombre.toLowerCase() === alumno.plan.toLowerCase()
  );
  const planMonto = planEncontrado ? planEncontrado.precio : (ultimoPago ? ultimoPago.monto : 15000);

  const copiarAlias = () => {
    navigator.clipboard.writeText("ATLAS.GYM.MP");
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-5 py-6 sm:py-8 md:px-10 md:py-10 space-y-6 sm:space-y-8 overflow-x-hidden">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-500 mb-1">
          Portal del alumno
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          Mis cuotas y pagos
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Hola, <strong className="text-white">{usuario.nombre}</strong>. Revisá el estado de tu suscripción en Atlas Gym y consultá los datos para abonar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-slate-900/60 p-6 shadow-sm border border-slate-800 text-slate-100 backdrop-blur-md">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado de mi cuota</p>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black ${
                ESTADO_CUENTA_STYLES[estadoCuenta]
              }`}
            >
              {ESTADO_CUENTA_LABEL[estadoCuenta]}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-400 font-medium leading-relaxed">
            {estadoCuenta === "AL_DIA"
              ? "¡Estás al día! Tu acceso al gimnasio está completamente habilitado."
              : estadoCuenta === "PENDIENTE"
              ? "Tu cuota del mes figura pendiente de abono o con saldo parcial a completar."
              : estadoCuenta === "MOROSO"
              ? "Tu cuota se encuentra vencida. Por favor regularizá para seguir entrenando."
              : "Tu membresía se encuentra inactiva. Acercate a recepción para regularizar tu cuenta."}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 p-6 shadow-sm border border-slate-800 text-slate-100 backdrop-blur-md">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mi plan actual</p>
          <p className="mt-2 text-2xl font-black text-white">{alumno?.plan || "Musculación"}</p>
          <p className="mt-1 text-sm font-bold text-blue-400">
            ${planMonto.toLocaleString("es-AR")} <span className="text-xs text-slate-500 font-medium">/ mes</span>
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 p-6 shadow-sm border border-slate-800 text-slate-100 backdrop-blur-md">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Próximo vencimiento</p>
          <p className="mt-2 text-2xl font-black text-white">
            {calcularVencimientoCuota(
              estadoCuenta,
              new Date(),
              maxPeriodoCubierto
            )}
          </p>
          <p className="mt-1 text-xs text-slate-500 font-medium">Las cuotas se abonan del 1 al 10 de cada mes</p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 md:p-8 text-white shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold mb-3 border border-blue-500/30">
              Datos para abonar tu cuota
            </span>
            <h2 className="text-xl font-black">Transferencia bancaria o Mercado Pago</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Podés transferir directamente con el alias del gimnasio y enviar tu comprobante por WhatsApp para que te registremos el pago.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold">Alias:</span>
                <span className="text-sm font-mono font-black text-blue-400">ATLAS.GYM.MP</span>
                <button
                  type="button"
                  onClick={copiarAlias}
                  className="ml-2 text-xs text-slate-300 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg font-bold active:scale-95"
                >
                  {copiado ? "¡Copiado! ✓" : "Copiar"}
                </button>
              </div>
              <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-300">
                <span className="text-slate-400">Titular:</span> <strong>Atlas Gimnasio SRL</strong>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <a
              href={`${CONTACTO_ATLAS.whatsappUrl}?text=${encodeURIComponent(
                `Hola! Soy ${alumno?.nombre || "alumno"}, les adjunto mi comprobante de pago de la cuota.`
              )}`}
              target="atlas_whatsapp_tab"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-600/25 transition-[color,background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 active:scale-95 text-sm"
            >
              <WhatsAppIcon className="w-5 h-5 fill-white" />
              Enviar comprobante por WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden text-slate-100 shadow-sm backdrop-blur-md">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div>
            <h2 className="text-lg font-black text-white">Historial de mis cuotas</h2>
            <p className="text-xs text-slate-400 mt-0.5">Registro histórico de tus pagos</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-800 bg-slate-950/20">
                <th className="font-bold px-6 py-3.5">Plan / Concepto</th>
                <th className="font-bold px-6 py-3.5">Monto</th>
                <th className="font-bold px-6 py-3.5">Fecha</th>
                <th className="font-bold px-6 py-3.5">Medio de pago</th>
                <th className="font-bold px-6 py-3.5">Estado</th>
              </tr>
            </thead>
            <tbody>
              {misPagos.map((pago) => {
                const esParcial = pago.estado === "PARCIAL";
                const abonado = obtenerMontoRecaudadoPago(pago);
                const saldo = obtenerSaldoPendientePago(pago);
                return (
                  <tr key={pago.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{pago.plan}</span>
                        {(pago.cantidadMeses ?? 1) > 1 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            ×{pago.cantidadMeses} meses
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-white">
                      ${(esParcial ? abonado : pago.monto).toLocaleString("es-AR")}
                      {esParcial && (
                        <div className="text-[11px] font-bold text-amber-400">
                          Resta ${saldo.toLocaleString("es-AR")}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium">
                      {formatFechaAR(pago.fecha)}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium">{pago.metodo}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          ESTADO_STYLES[pago.estado]
                        }`}
                      >
                        {esParcial ? "SEÑA PARCIAL" : pago.estado}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {misPagos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No tenés pagos registrados en el sistema todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------- Componente principal ----------
export default function FinanzasPage() {
  const {
    alumnos,
    planes,
    pagos,
    agregarPago,
    actualizarEstadoPago,
    completarSaldoPago,
    anularPago,
    asignarCredencialesAlumno,
    getAlumno,
    getEstadoCuenta,
    usuarioActual,
  } = useAppData();
  const { toast } = useToast();

  const [mes, setMes] = useState<string>(() => mesActualISO());
  const [verTodos, setVerTodos] = useState(false);
  const [filtro, setFiltro] = useState<EstadoPago | "TODOS">("TODOS");
  const [filtroMetodo, setFiltroMetodo] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 250);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pagoAAnular, setPagoAAnular] = useState<Pago | null>(null);
  const [pagoACompletar, setPagoACompletar] = useState<Pago | null>(null);
  const [fechaArqueo, setFechaArqueo] = useState<string>(() => fechaLocalHoy());

  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina, setElementosPorPagina] = useState(15);

  const pagosDelMes = useMemo(() => {
    if (verTodos) return pagos;
    return pagos.filter((p) => (p.periodoMes || p.fecha.slice(0, 7)) === mes);
  }, [pagos, mes, verTodos]);

  const arqueoDelDia = useMemo(
    () => calcularArqueoCajaLocal(pagos, fechaArqueo),
    [pagos, fechaArqueo]
  );

  const metrica = useMemo(() => {
    const ingresosDelMes = pagosDelMes.reduce(
      (acc, p) => acc + obtenerMontoRecaudadoPago(p),
      0
    );
    const pendientesYParciales = pagosDelMes.filter(
      (p) => p.estado === "PENDIENTE" || p.estado === "PARCIAL"
    );
    const vencidos = pagosDelMes.filter((p) => p.estado === "VENCIDO");
    const morososSocios = alumnos.filter(
      (a) => a.activo && getEstadoCuenta(a.id) === "MOROSO"
    ).length;

    return {
      ingresosDelMes,
      pendientesMonto: pendientesYParciales.reduce(
        (acc, p) => acc + obtenerSaldoPendientePago(p),
        0
      ),
      pendientesCount: pendientesYParciales.length,
      vencidosMonto: vencidos.reduce(
        (acc, p) => acc + obtenerSaldoPendientePago(p),
        0
      ),
      vencidosCount: vencidos.length,
      morosos: morososSocios,
    };
  }, [pagosDelMes, alumnos, getEstadoCuenta]);

  const pagosFiltrados = useMemo(() => {
    const q = busquedaDebounced.trim().toLowerCase();
    return pagosDelMes.filter((p) => {
      const coincideFiltro = filtro === "TODOS" || p.estado === filtro;
      const coincideMetodo =
        filtroMetodo === "TODOS" || p.metodo.toLowerCase() === filtroMetodo.toLowerCase();
      const nombreAlumno = getAlumno(p.alumnoId)?.nombre ?? p.alumnoNombreHistorico ?? "";
      const coincideBusqueda =
        !q ||
        nombreAlumno.toLowerCase().includes(q) ||
        p.plan.toLowerCase().includes(q) ||
        p.metodo.toLowerCase().includes(q) ||
        (p.registradoPor && p.registradoPor.toLowerCase().includes(q));
      return coincideFiltro && coincideMetodo && coincideBusqueda;
    });
  }, [pagosDelMes, filtro, filtroMetodo, busquedaDebounced, getAlumno]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busquedaDebounced, filtro, filtroMetodo, mes, verTodos]);

  const totalPaginas = Math.ceil(pagosFiltrados.length / elementosPorPagina) || 1;
  const pagosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * elementosPorPagina;
    return pagosFiltrados.slice(inicio, inicio + elementosPorPagina);
  }, [pagosFiltrados, paginaActual, elementosPorPagina]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalAbierto(false);
        setPagoAAnular(null);
        setPagoACompletar(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!usuarioActual) {
    return null;
  }

  if (usuarioActual.rol === "ALUMNO") {
    return <VistaCuotasAlumno usuario={usuarioActual} />;
  }

  const exportarCSVFinanzas = () => {
    const encabezados = [
      "ID",
      "Alumno",
      "Plan",
      "Monto Total Cuota",
      "Monto Abonado",
      "Saldo Pendiente",
      "Fecha Pago",
      "Periodo Mes",
      "Meses Cubiertos",
      "Periodo Fin Cubierto",
      "Método",
      "Estado",
      "Cobrado Por",
      "Anulado Por",
      "Motivo Anulación",
    ];
    const filas = pagosDelMes.map((p) => {
      const alumno = getAlumno(p.alumnoId);
      const nombre = alumno?.nombre ?? p.alumnoNombreHistorico ?? "Desconocido";
      const inicioPeriodo = p.periodoMes || p.fecha.slice(0, 7);
      return [
        p.id,
        nombre,
        p.plan,
        p.monto.toString(),
        obtenerMontoRecaudadoPago(p).toString(),
        obtenerSaldoPendientePago(p).toString(),
        p.fecha,
        inicioPeriodo,
        String(p.cantidadMeses ?? 1),
        obtenerPeriodoFinCubierto(p) || inicioPeriodo,
        p.metodo,
        p.estado,
        p.registradoPor || "-",
        p.anuladoPor || "-",
        p.motivoAnulacion || "-",
      ];
    });
    const sufijo = verTodos ? "historico_completo" : mes;
    descargarCSV(`finanzas_atlas_gym_${sufijo}`, encabezados, filas);
    toast("Planilla de finanzas exportada a CSV con éxito", "success");
  };

  const handleNuevoPago = (
    nuevo: Omit<Pago, "id"> & { usuarioApp?: string; passwordApp?: string }
  ) => {
    agregarPago(nuevo);
    setModalAbierto(false);
    if (nuevo.usuarioApp && nuevo.passwordApp) {
      toast(
        `Pago registrado y credenciales activadas para "${nuevo.usuarioApp}"`,
        "success"
      );
    } else if (nuevo.estado === "PARCIAL" || (nuevo.montoAbonado && nuevo.montoAbonado < nuevo.monto)) {
      toast("Seña parcial registrada. Queda saldo pendiente a completar.", "success");
    } else {
      toast("Pago registrado con éxito", "success");
    }
  };

  const confirmarAnulacion = async (motivo: string) => {
    if (!pagoAAnular) return;
    const res = await anularPago(pagoAAnular.id, motivo);
    if (res.ok) {
      setPagoAAnular(null);
      toast("Comprobante anulado y preservado en auditoría de caja", "info");
    } else {
      toast(res.error || "No se pudo anular el comprobante", "error");
    }
  };

  const confirmarCompletarSaldo = async (metodo: string) => {
    if (!pagoACompletar) return;
    const res = await completarSaldoPago(pagoACompletar.id, metodo);
    if (res.ok) {
      setPagoACompletar(null);
      toast("Saldo completado: cuota acreditada como PAGADA", "success");
    } else {
      toast(res.error || "No se pudo completar el saldo", "error");
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 sm:px-5 py-6 sm:py-8 md:px-10 md:py-10 space-y-6 sm:space-y-8 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Finanzas y Caja</h1>
            <p className="text-sm text-slate-400 mt-1">
              {verTodos
                ? "Viendo el historial completo auditado de cobros, señas y anulaciones."
                : `Viendo ${formatearMes(mes)} — caja trazable con señas parciales y anulaciones auditadas.`}
            </p>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap w-full sm:w-auto">
            <button
              onClick={exportarCSVFinanzas}
              title="Exportar planilla actual a archivo CSV / Excel"
              className="flex-1 sm:flex-none justify-center flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold h-11 px-3 sm:px-4 rounded-xl border border-slate-700 transition-[color,background-color,transform] duration-200 hover:-translate-y-0.5 active:scale-95"
            >
              <Download className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">Exportar CSV</span>
            </button>
            <button
              onClick={() => setModalAbierto(true)}
              className="flex-1 sm:flex-none justify-center flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold h-11 px-4 sm:px-6 rounded-xl shadow-lg shadow-blue-600/20 transition-[color,background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-blue-500/30 active:scale-95"
            >
              <Plus className="w-5 h-5 shrink-0" />
              <span className="truncate">Registrar pago</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SelectorMes
            value={mes}
            disabled={verTodos}
            onChange={(v) => {
              setMes(v);
              setVerTodos(false);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setMes(mesActualISO());
              setVerTodos(false);
            }}
            className="h-11 px-4 rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition-[color,background-color] duration-200 active:scale-95"
          >
            Mes actual
          </button>
          <button
            type="button"
            onClick={() => setVerTodos((v) => !v)}
            className={`h-11 px-4 rounded-full text-sm font-bold transition-[color,background-color] duration-200 active:scale-95 ${
              verTodos
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Ver todos
          </button>
        </div>
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={<DollarSign className="size-6" />}
          label={verTodos ? "Ingresos netos totales" : "Ingresos del mes"}
          value={`$${metrica.ingresosDelMes.toLocaleString("es-AR")}`}
          tint={{ bg: "bg-blue-500/15 border border-blue-500/30", text: "text-blue-400", bar: "bg-blue-500" }}
        />
        <MetricCard
          icon={<Clock className="size-6" />}
          label="Saldos y cuotas pendientes"
          value={`$${metrica.pendientesMonto.toLocaleString("es-AR")}`}
          sub={`${metrica.pendientesCount} comprobantes`}
          tint={{ bg: "bg-amber-500/15 border border-amber-500/30", text: "text-amber-400", bar: "bg-amber-500" }}
        />
        <MetricCard
          icon={<AlertCircle className="size-6" />}
          label="Cuotas vencidas"
          value={`$${metrica.vencidosMonto.toLocaleString("es-AR")}`}
          sub={`${metrica.vencidosCount} cuotas`}
          tint={{ bg: "bg-rose-500/15 border border-rose-500/30", text: "text-rose-400", bar: "bg-rose-500" }}
        />
        <MetricCard
          icon={<Users className="size-6" />}
          label="Socios morosos hoy"
          value={`${metrica.morosos}`}
          tint={{ bg: "bg-slate-800 border border-slate-700", text: "text-slate-400", bar: "bg-slate-600" }}
        />
      </div>

      {/* Panel de Arqueo de Caja del Día */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 sm:p-6 text-slate-100 shadow-sm backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Arqueo de Caja del Día
              </h2>
              <p className="text-xs text-slate-400">
                Efectivo físico en cajón, transferencias y desglose nominal por operador ({formatFechaAR(fechaArqueo)}).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="Fecha de arqueo de caja"
              value={fechaArqueo}
              onChange={(e) => e.target.value && setFechaArqueo(e.target.value)}
              className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-slate-200 outline-none focus:border-blue-500"
            />
            {fechaArqueo !== fechaLocalHoy() && (
              <button
                type="button"
                onClick={() => setFechaArqueo(fechaLocalHoy())}
                className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700"
              >
                Hoy
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Efectivo en cajón
            </p>
            <p className="mt-1 text-xl font-black text-white">
              ${arqueoDelDia.totalEfectivo.toLocaleString("es-AR")}
            </p>
          </div>
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/25 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
              Transferencias / MP
            </p>
            <p className="mt-1 text-xl font-black text-white">
              ${arqueoDelDia.totalTransferencia.toLocaleString("es-AR")}
            </p>
          </div>
          <div className="rounded-xl bg-purple-500/10 border border-purple-500/25 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
              Tarjeta
            </p>
            <p className="mt-1 text-xl font-black text-white">
              ${arqueoDelDia.totalTarjeta.toLocaleString("es-AR")}
            </p>
          </div>
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total recaudado ({arqueoDelDia.cantidadCobros})
            </p>
            <p className="mt-1 text-xl font-black text-white">
              ${arqueoDelDia.totalRecaudado.toLocaleString("es-AR")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Por operador:
            </span>
            {arqueoDelDia.porOperador.length === 0 ? (
              <span className="text-slate-500 italic">Sin cobros registrados en esta fecha</span>
            ) : (
              arqueoDelDia.porOperador.map((op) => (
                <span
                  key={op.operador}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-semibold"
                >
                  {op.operador}:{" "}
                  <strong className="text-emerald-400">
                    ${op.totalRecaudado.toLocaleString("es-AR")}
                  </strong>{" "}
                  ({op.cantidadOperaciones})
                </span>
              ))
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {arqueoDelDia.cantidadParciales > 0 && (
              <span className="text-sky-300 font-semibold">
                {arqueoDelDia.cantidadParciales} seña(s) con $
                {arqueoDelDia.saldoPendienteParciales.toLocaleString("es-AR")} por completar
              </span>
            )}
            {arqueoDelDia.cantidadAnulados > 0 && (
              <span className="text-rose-400 font-semibold">
                {arqueoDelDia.cantidadAnulados} anulado(s) ($
                {arqueoDelDia.montoAnulado.toLocaleString("es-AR")} excluidos de caja)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tarjeta principal: filtros + tabla */}
      <div className="bg-slate-900/60 rounded-2xl shadow-sm border border-slate-800 overflow-hidden text-slate-100 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-slate-800 bg-slate-950/40">
          <div className="flex gap-4 flex-wrap items-center">
            <div className="flex gap-2 flex-wrap">
              {FILTROS.map((f) => (
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

            <div className="h-5 w-px bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-400 mr-1">Método:</span>
              {["TODOS", "Efectivo", "Transferencia", "Tarjeta"].map((met) => (
                <button
                  key={met}
                  onClick={() => setFiltroMetodo(met)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                    filtroMetodo === met
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-800/60 text-slate-300 border border-slate-700/60 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {met === "TODOS" ? "Todos" : met}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="buscar-finanzas"
              aria-label="Buscar alumno"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar socio u operador..."
              className="pl-9 pr-4 h-10 text-sm bg-slate-800/80 text-white placeholder:text-slate-500 border border-slate-700 rounded-full outline-none transition-[border-color,box-shadow] duration-200 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-800">
                <th className="font-bold px-6 py-3.5">Alumno</th>
                <th className="font-bold px-6 py-3.5">Plan / Período</th>
                <th className="font-bold px-6 py-3.5">Importe</th>
                <th className="font-bold px-6 py-3.5">Fecha</th>
                <th className="font-bold px-6 py-3.5">Método / Operador</th>
                <th className="font-bold px-6 py-3.5">Estado</th>
                <th className="font-bold px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagosPaginados.map((pago) => {
                const alumno = getAlumno(pago.alumnoId);
                const esAnulado = pago.estado === "ANULADO";
                const esParcial = pago.estado === "PARCIAL";
                const abonado = obtenerMontoRecaudadoPago(pago);
                const saldo = obtenerSaldoPendientePago(pago);
                const requiereRecordatorio =
                  pago.estado === "PARCIAL" ||
                  pago.estado === "PENDIENTE" ||
                  pago.estado === "VENCIDO";
                const puedeWhatsapp =
                  requiereRecordatorio && alumno && tieneCelularWhatsappValido(alumno.celular);

                return (
                  <tr
                    key={pago.id}
                    className={`border-b border-slate-800/50 last:border-0 hover:bg-slate-800/40 transition-colors ${
                      esAnulado ? "opacity-60 bg-slate-950/30" : ""
                    }`}
                  >
                    <td className="px-6 py-4 font-bold text-white">
                      {alumno ? (
                        <Link href={`/alumnos/${alumno.id}`} className="hover:text-blue-400 hover:underline underline-offset-2">
                          {alumno.nombre}
                        </Link>
                      ) : (
                        <span className="text-slate-500 italic font-medium">
                          {pago.alumnoNombreHistorico || "Alumno Atlas"} (Baja)
                        </span>
                      )}
                      {esAnulado && pago.motivoAnulacion && (
                        <div className="text-[11px] font-medium text-rose-400/90 mt-0.5">
                          Anulado{pago.anuladoPor ? ` por ${pago.anuladoPor}` : ""}: {pago.motivoAnulacion}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{pago.plan}</span>
                        {(pago.cantidadMeses ?? 1) > 1 && (
                          <span
                            title={`Cubre hasta ${obtenerPeriodoFinCubierto(pago) || ""}`}
                            className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-400 border border-blue-500/30"
                          >
                            ×{pago.cantidadMeses} meses
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Período: {pago.periodoMes || pago.fecha.slice(0, 7)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-white">
                      <span className={esAnulado ? "line-through text-slate-500" : ""}>
                        ${(esParcial ? abonado : pago.monto).toLocaleString("es-AR")}
                      </span>
                      {esParcial && (
                        <div className="text-[11px] font-bold text-amber-400 mt-0.5">
                          Resta ${saldo.toLocaleString("es-AR")} (total ${pago.monto.toLocaleString("es-AR")})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium">
                      {formatFechaAR(pago.fecha)}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium">
                      <div>{pago.metodo}</div>
                      {pago.registradoPor && (
                        <div className="text-[11px] text-slate-500">
                          Por: {pago.registradoPor}
                        </div>
                      )}
                      {pago.comprobante && (
                        <div className="text-[11px] text-sky-400/90 truncate max-w-[180px]" title={pago.comprobante}>
                          {pago.comprobante}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {esAnulado || esParcial ? (
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${ESTADO_STYLES[pago.estado]}`}
                        >
                          {esParcial ? "SEÑA PARCIAL" : "ANULADO"}
                        </span>
                      ) : (
                        <div className="relative inline-block">
                          <select
                            aria-label="Cambiar estado del pago"
                            value={pago.estado}
                            onChange={(e) =>
                              actualizarEstadoPago(pago.id, e.target.value as EstadoPago)
                            }
                            className={`appearance-none cursor-pointer pl-2.5 pr-6 py-1 rounded-full text-xs font-bold outline-none transition-colors ${ESTADO_STYLES[pago.estado]}`}
                          >
                            <option value="PAGADO" className="bg-slate-900 text-white">PAGADO</option>
                            <option value="PENDIENTE" className="bg-slate-900 text-white">PENDIENTE</option>
                            <option value="VENCIDO" className="bg-slate-900 text-white">VENCIDO</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {esParcial && (
                          <button
                            type="button"
                            onClick={() => setPagoACompletar(pago)}
                            title={`Completar saldo restante ($${saldo.toLocaleString("es-AR")})`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 text-xs font-bold transition-colors active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Completar</span>
                          </button>
                        )}
                        {puedeWhatsapp && alumno?.celular && (
                          <a
                            href={construirUrlWaMe(
                              alumno.celular,
                              mensajeRecordatorioCuotaWhatsapp({
                                nombre: alumno.nombre,
                                plan: pago.plan,
                                estadoPago: pago.estado,
                                saldoPendiente: saldo,
                                montoTotal: pago.monto,
                                periodoMes: pago.periodoMes || pago.fecha.slice(0, 7),
                              })
                            )}
                            target="atlas_whatsapp_tab"
                            rel="noopener noreferrer"
                            title={`Enviar recordatorio 1-clic por WhatsApp a ${alumno.nombre}`}
                            aria-label={`Recordar por WhatsApp a ${alumno.nombre}`}
                            className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/15 transition-colors active:scale-90"
                          >
                            <WhatsAppIcon className="w-4 h-4 fill-current" />
                          </a>
                        )}
                        {!esAnulado && (
                          <button
                            type="button"
                            onClick={() => setPagoAAnular(pago)}
                            title="Anular comprobante con motivo auditado"
                            aria-label={`Anular comprobante de ${alumno?.nombre ?? "alumno"}`}
                            className="p-2 rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors duration-150 active:scale-90"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pagosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">
                    {verTodos
                      ? "No se encontraron pagos con ese criterio."
                      : `Todavía no hay pagos registrados en ${formatearMes(mes)}. Arrancá agregando el primero.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pagosFiltrados.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-800 text-xs font-semibold text-slate-400 bg-slate-950/40">
            <div className="flex items-center gap-2">
              <span>Mostrar</span>
              <select
                aria-label="Pagos por página"
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
                {Math.min(paginaActual * elementosPorPagina, pagosFiltrados.length)} de{" "}
                {pagosFiltrados.length} pagos
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

      {modalAbierto && (
        <ModalRegistrarPago
          alumnos={alumnos}
          planes={planes}
          pagos={pagos}
          getEstadoCuenta={getEstadoCuenta}
          onClose={() => setModalAbierto(false)}
          onSubmit={handleNuevoPago}
          onAsignarCredenciales={asignarCredencialesAlumno}
        />
      )}

      {pagoAAnular && (
        <ModalAnularPago
          pago={pagoAAnular}
          nombreAlumno={getAlumno(pagoAAnular.alumnoId)?.nombre ?? pagoAAnular.alumnoNombreHistorico ?? "este socio"}
          onCancel={() => setPagoAAnular(null)}
          onConfirm={confirmarAnulacion}
        />
      )}

      {pagoACompletar && (
        <ModalCompletarSaldo
          pago={pagoACompletar}
          nombreAlumno={getAlumno(pagoACompletar.alumnoId)?.nombre ?? pagoACompletar.alumnoNombreHistorico ?? "este socio"}
          onCancel={() => setPagoACompletar(null)}
          onConfirm={confirmarCompletarSaldo}
        />
      )}
    </div>
  );
}

// ---------- Modal: Anulación auditada con motivo obligatorio ----------
function ModalAnularPago({
  pago,
  nombreAlumno,
  onCancel,
  onConfirm,
}: {
  pago: Pago;
  nombreAlumno: string;
  onCancel: () => void;
  onConfirm: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (motivo.trim().length < 4) {
      setError("Indicá brevemente el motivo de anulación para la auditoría de caja.");
      return;
    }
    onConfirm(motivo.trim());
  };

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-3xl shadow-2xl text-slate-100 border border-slate-800 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200 space-y-4"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <Ban className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white">Anular comprobante de caja</h2>
          <p className="mt-1 text-sm text-slate-400">
            El comprobante de <span className="font-semibold text-white">{nombreAlumno}</span> por{" "}
            <span className="font-semibold text-emerald-400">
              ${obtenerMontoRecaudadoPago(pago).toLocaleString("es-AR")}
            </span>{" "}
            no se borrará: quedará registrado como <strong>ANULADO</strong> con tu usuario, fecha y motivo, descontándose de la recaudación y habilitando recobrar ese período.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {MOTIVOS_ANULACION_RAPIDOS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setMotivo(preset);
                setError("");
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>

        <Field label="Motivo de anulación (obligatorio)">
          <input
            aria-label="Motivo de anulación"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              if (error) setError("");
            }}
            placeholder="Ej: Importe mal tipeado, se recobra por monto real"
            className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-rose-500 text-white placeholder-slate-500 text-sm"
            autoFocus
          />
        </Field>

        {error && (
          <p className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-xl border border-slate-700 bg-slate-800/50 px-5 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="h-11 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-500 transition-colors"
          >
            Confirmar anulación
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Modal: Completar saldo de seña parcial ----------
function ModalCompletarSaldo({
  pago,
  nombreAlumno,
  onCancel,
  onConfirm,
}: {
  pago: Pago;
  nombreAlumno: string;
  onCancel: () => void;
  onConfirm: (metodo: string) => void;
}) {
  const [metodo, setMetodo] = useState(pago.metodo || "Efectivo");
  const abonado = obtenerMontoRecaudadoPago(pago);
  const saldo = obtenerSaldoPendientePago(pago);

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-3xl shadow-2xl text-slate-100 border border-slate-800 w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200 space-y-4"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white">Completar saldo pendiente</h2>
          <p className="mt-1 text-sm text-slate-400">
            <span className="font-semibold text-white">{nombreAlumno}</span> dejó una seña de{" "}
            <strong className="text-slate-200">${abonado.toLocaleString("es-AR")}</strong>. Resta cobrar{" "}
            <strong className="text-emerald-400">${saldo.toLocaleString("es-AR")}</strong> para acreditar la cuota de{" "}
            <strong>{pago.periodoMes || pago.fecha.slice(0, 7)}</strong> como <strong>PAGADA</strong>.
          </p>
        </div>

        <Field label="Medio de pago del saldo restante">
          <select
            aria-label="Medio de pago del saldo"
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 text-white text-sm"
          >
            <option className="bg-slate-900 text-white">Efectivo</option>
            <option className="bg-slate-900 text-white">Transferencia</option>
            <option className="bg-slate-900 text-white">Tarjeta</option>
          </select>
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-xl border border-slate-700 bg-slate-800/50 px-5 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(metodo)}
            className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-colors"
          >
            Acreditar ${saldo.toLocaleString("es-AR")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Helpers de WhatsApp ----------
function mensajePagoTemplate(nombre: string, plan: string, monto: string, cantidadMeses: number = 1) {
  const montoFmt = monto ? `$${Number(monto).toLocaleString("es-AR")}` : "$0";
  const sufijoMeses = cantidadMeses > 1 ? ` (${cantidadMeses} meses)` : "";
  return `Hola ${nombre || "!"}! ✅ Registramos tu pago de ${montoFmt} correspondiente al plan ${plan || "tu plan"}${sufijoMeses} en ATLAS. ¡Gracias por seguir entrenando con nosotros! 💪`;
}

function mensajeBienvenidaTemplate(nombre: string, usuario: string, password: string) {
  return `Hola ${nombre || "!"}! 🎉 Ya sos parte de ATLAS. Estos son tus datos de acceso a la app:\n\nUsuario: ${usuario || "-"}\nContraseña: ${password || "-"}\n\nPor seguridad te recomendamos cambiarla apenas ingreses. ¡Nos vemos en el gym! 💪`;
}

function generarPassword() {
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = lower + upper + digits + symbols;

  const rnd = new Uint8Array(10);
  crypto.getRandomValues(rnd);

  const chars = [
    upper[rnd[0] % upper.length],
    lower[rnd[1] % lower.length],
    digits[rnd[2] % digits.length],
    symbols[rnd[3] % symbols.length],
    ...Array.from(rnd.slice(4), (b) => all[b % all.length]),
  ];

  const shuffleBytes = new Uint8Array(chars.length);
  crypto.getRandomValues(shuffleBytes);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }

  return chars.join("");
}

function sugerirUsuarioAlumno(alumno?: Alumno): string {
  if (!alumno) return "";
  if (alumno.usuario && !alumno.usuario.includes("@")) {
    return alumno.usuario;
  }
  const baseNombre = alumno.nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)[0]
    .replace(/[^a-z0-9]/g, "");
  const sufijoDni = alumno.dni ? alumno.dni.replace(/\D/g, "").slice(-3) : "";
  return `${baseNombre}${sufijoDni}`;
}

// ---------- Modal: registrar pago ----------
function ModalRegistrarPago({
  alumnos,
  planes,
  pagos,
  getEstadoCuenta,
  onClose,
  onSubmit,
  onAsignarCredenciales,
}: {
  alumnos: Alumno[];
  planes: Plan[];
  pagos: Pago[];
  getEstadoCuenta: (alumnoId: string) => EstadoCuenta;
  onClose: () => void;
  onSubmit: (pago: Omit<Pago, "id"> & { usuarioApp?: string; passwordApp?: string }) => void;
  onAsignarCredenciales: (alumnoId: string, usuario: string, password: string) => Promise<void>;
}) {
  const primerAlumno = alumnos[0];
  const obtenerPlanYPrecio = (alumno?: Alumno) => {
    if (!alumno) return { planNombre: "", planPrecio: "" };
    const planObj = planes.find(
      (p) =>
        (alumno.planId && p.id === alumno.planId) ||
        (alumno.plan && p.nombre.trim().toLowerCase() === alumno.plan.trim().toLowerCase())
    );
    return {
      planNombre: planObj?.nombre ?? alumno.plan ?? "",
      planPrecio: planObj ? String(planObj.precio) : "",
    };
  };

  const inicial = obtenerPlanYPrecio(primerAlumno);

  const [busquedaAlumno, setBusquedaAlumno] = useState("");
  const [esSeniaParcial, setEsSeniaParcial] = useState(false);
  const [montoSenia, setMontoSenia] = useState("");
  const [form, setForm] = useState({
    alumnoId: primerAlumno?.id ?? "",
    plan: inicial.planNombre,
    monto: inicial.planPrecio,
    fecha: fechaLocalHoy(),
    periodoMes: mesActualISO(),
    cantidadMeses: 1,
    metodo: "Efectivo",
    estado: "PAGADO" as EstadoPago,
  });

  const [celular, setCelular] = useState(primerAlumno?.celular ?? "");
  const [tipoMensaje, setTipoMensaje] = useState<"pago" | "bienvenida">("pago");
  const [usuarioApp, setUsuarioApp] = useState(() => sugerirUsuarioAlumno(primerAlumno));
  const [passwordApp, setPasswordApp] = useState("");
  const [errorValidacion, setErrorValidacion] = useState("");

  const alumnosFiltrados = alumnos.filter(
    (a) =>
      !busquedaAlumno.trim() ||
      a.nombre.toLowerCase().includes(busquedaAlumno.trim().toLowerCase()) ||
      (a.dni && a.dni.includes(busquedaAlumno.trim()))
  );
  const alumnoSeleccionado = alumnos.find((a) => a.id === form.alumnoId);
  const estadoCuentaSeleccionado = form.alumnoId ? getEstadoCuenta(form.alumnoId) : "AL_DIA";

  const mesActual = mesActualISO();
  const mesAnterior = sumarMesesPeriodo(mesActual, -1);

  const periodoInicioEfectivo = form.periodoMes || form.fecha.slice(0, 7);
  const periodoFinEfectivo =
    form.cantidadMeses > 1 && /^\d{4}-\d{2}$/.test(periodoInicioEfectivo)
      ? sumarMesesPeriodo(periodoInicioEfectivo, form.cantidadMeses - 1)
      : periodoInicioEfectivo;

  const pagoSolapado = useMemo(
    () =>
      verificarSolapamientoPeriodoPago(
        form.alumnoId,
        periodoInicioEfectivo,
        form.cantidadMeses,
        pagos
      ),
    [form.alumnoId, periodoInicioEfectivo, form.cantidadMeses, pagos]
  );

  const handleAlumnoChange = (nuevoId: string) => {
    const alumno = alumnos.find((a) => a.id === nuevoId);
    if (!alumno) {
      setForm((prev) => ({ ...prev, alumnoId: nuevoId }));
      return;
    }
    const infoPlan = obtenerPlanYPrecio(alumno);
    setForm((prev) => ({
      ...prev,
      alumnoId: nuevoId,
      plan: infoPlan.planNombre,
      monto: infoPlan.planPrecio,
      cantidadMeses: 1,
    }));
    setEsSeniaParcial(false);
    setMontoSenia("");
    setCelular(alumno.celular ?? "");
    setUsuarioApp(sugerirUsuarioAlumno(alumno));
    setErrorValidacion("");
  };

  const aplicarImputacionMoroso = (periodo: string, meses: number) => {
    const planObj = planes.find(
      (p) =>
        (alumnoSeleccionado?.planId && p.id === alumnoSeleccionado.planId) ||
        p.nombre.trim().toLowerCase() === form.plan.trim().toLowerCase()
    );
    setForm((prev) => ({
      ...prev,
      periodoMes: periodo,
      cantidadMeses: meses,
      monto: planObj && planObj.precio > 0 ? String(planObj.precio * meses) : prev.monto,
    }));
    setErrorValidacion("");
  };

  const handleCantidadMesesChange = (nuevosMeses: number) => {
    const planObj = planes.find(
      (p) =>
        (alumnoSeleccionado?.planId && p.id === alumnoSeleccionado.planId) ||
        p.nombre.trim().toLowerCase() === form.plan.trim().toLowerCase()
    );
    setForm((prev) => {
      let nuevoMonto = prev.monto;
      if (planObj && planObj.precio > 0) {
        const montoActual = Number(prev.monto);
        if (!prev.monto || montoActual === planObj.precio * prev.cantidadMeses) {
          nuevoMonto = String(planObj.precio * nuevosMeses);
        }
      }
      return {
        ...prev,
        cantidadMeses: nuevosMeses,
        monto: nuevoMonto,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = Number(form.monto);
    if (!form.alumnoId) {
      setErrorValidacion("Seleccioná un alumno");
      return;
    }
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorValidacion("El monto total de la cuota debe ser mayor a $0");
      return;
    }
    if (!form.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(form.fecha)) {
      setErrorValidacion("Ingresá una fecha válida (YYYY-MM-DD)");
      return;
    }
    if (pagoSolapado) {
      setErrorValidacion(
        pagoSolapado.estado === "PARCIAL"
          ? `Este socio ya tiene una seña parcial en ${pagoSolapado.periodoMes}. Usá "Completar" en la tabla o anulala primero.`
          : `Este socio ya tiene acreditado el período ${pagoSolapado.periodoMes}. Si necesitás corregirlo, anulá primero el comprobante anterior.`
      );
      return;
    }

    let montoAbonadoNum: number | undefined = undefined;
    let estadoFinal: EstadoPago = form.estado;
    if (esSeniaParcial) {
      const seniaNum = Number(montoSenia);
      if (isNaN(seniaNum) || seniaNum <= 0 || seniaNum >= montoNum) {
        setErrorValidacion(
          "El importe de la seña parcial debe ser mayor a $0 y menor al valor total de la cuota."
        );
        return;
      }
      montoAbonadoNum = seniaNum;
      estadoFinal = "PARCIAL";
    }

    if (tipoMensaje === "bienvenida" && (!usuarioApp.trim() || !passwordApp.trim())) {
      setErrorValidacion(
        "Para Primera inscripción, completá el Usuario y generá una Contraseña segura."
      );
      return;
    }
    setErrorValidacion("");
    const planObj = planes.find(
      (p) =>
        (alumnoSeleccionado?.planId && p.id === alumnoSeleccionado.planId) ||
        p.nombre.trim().toLowerCase() === form.plan.trim().toLowerCase()
    );
    const incluyeCredenciales =
      tipoMensaje === "bienvenida" && usuarioApp.trim() && passwordApp.trim();

    onSubmit({
      ...form,
      estado: estadoFinal,
      planId: planObj?.id ?? alumnoSeleccionado?.planId,
      monto: montoNum,
      ...(montoAbonadoNum !== undefined ? { montoAbonado: montoAbonadoNum } : {}),
      periodoMes: periodoInicioEfectivo,
      cantidadMeses: form.cantidadMeses,
      ...(incluyeCredenciales
        ? {
            usuarioApp: usuarioApp.trim(),
            passwordApp: passwordApp.trim(),
          }
        : {}),
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-3xl shadow-2xl text-slate-100 border border-slate-800 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-white">Registrar pago</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-white rounded-full p-1.5 hover:bg-slate-800 transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {alumnos.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-400">
              Todavía no hay alumnos cargados. Agregá un alumno primero para poder registrarle un pago.
            </p>
            <Link
              href="/alumnos"
              className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold h-10 px-5 rounded-xl transition-colors shadow-lg shadow-blue-600/20"
            >
              Ir a Alumnos
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Alumno">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busquedaAlumno}
                  onChange={(e) => setBusquedaAlumno(e.target.value)}
                  placeholder="Buscar alumno por nombre o DNI..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white placeholder-slate-500 text-sm"
                />
              </div>
              {alumnosFiltrados.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 italic text-center">No se encontraron alumnos con ese nombre o DNI</p>
              ) : (
                <select
                  aria-label="Alumno"
                  value={form.alumnoId}
                  onChange={(e) => handleAlumnoChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-sm mt-1.5 cursor-pointer"
                  required
                  size={Math.min(Math.max(alumnosFiltrados.length, 2), 5)}
                >
                  {alumnosFiltrados.map((a) => (
                    <option key={a.id} value={a.id} className="py-1 bg-slate-900 text-white">
                      {a.nombre} {a.dni ? `(${a.dni})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            {/* Asistente de imputación para socios MOROSOS */}
            {estadoCuentaSeleccionado === "MOROSO" && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 space-y-2">
                <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Socio moroso: elegí cómo imputar este cobro
                </p>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => aplicarImputacionMoroso(mesAnterior, 1)}
                    className={`text-left px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      form.periodoMes === mesAnterior && form.cantidadMeses === 1
                        ? "bg-amber-500/25 border-amber-400 text-white"
                        : "bg-slate-900/70 border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    1. Saldar solo mes adeudado ({mesAnterior})
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarImputacionMoroso(mesAnterior, 2)}
                    className={`text-left px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      form.periodoMes === mesAnterior && form.cantidadMeses === 2
                        ? "bg-amber-500/25 border-amber-400 text-white"
                        : "bg-slate-900/70 border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    2. Ponerse al día: deuda + mes actual (2 meses)
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarImputacionMoroso(mesActual, 1)}
                    className={`text-left px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      form.periodoMes === mesActual && form.cantidadMeses === 1
                        ? "bg-amber-500/25 border-amber-400 text-white"
                        : "bg-slate-900/70 border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    3. Reactivar desde mes actual ({mesActual})
                  </button>
                </div>
              </div>
            )}

            <Field label="Plan">
              <input
                aria-label="Plan"
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white placeholder-slate-500 text-sm"
                placeholder="Ej: Musculación"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Valor total cuota ($)">
                <input
                  aria-label="Monto"
                  type="number"
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white placeholder-slate-500 text-sm"
                  placeholder="$"
                  required
                />
              </Field>
              <Field label="Fecha de pago">
                <input
                  aria-label="Fecha"
                  type="date"
                  value={form.fecha}
                  onChange={(e) => {
                    const nuevaFecha = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      fecha: nuevaFecha,
                      periodoMes: prev.periodoMes || nuevaFecha.slice(0, 7),
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-sm"
                />
              </Field>
            </div>

            {/* Opción de Seña / Entrega Parcial */}
            <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-3.5 space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={esSeniaParcial}
                  onChange={(e) => setEsSeniaParcial(e.target.checked)}
                  className="size-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-200">
                  Dejó una seña / entrega parcial (resta completar saldo)
                </span>
              </label>

              {esSeniaParcial && (
                <div className="space-y-1.5 pt-1">
                  <Field label="Importe entregado hoy ($)">
                    <input
                      aria-label="Importe entregado hoy"
                      type="number"
                      value={montoSenia}
                      onChange={(e) => setMontoSenia(e.target.value)}
                      placeholder="Ej: 10000"
                      className="w-full px-3.5 py-2 bg-slate-800/80 border border-sky-500/40 rounded-xl outline-none focus:border-sky-400 text-white text-sm"
                    />
                  </Field>
                  {Number(form.monto) > 0 && Number(montoSenia) > 0 && Number(montoSenia) < Number(form.monto) && (
                    <p className="text-[11px] font-bold text-sky-300">
                      Quedará un saldo pendiente de $
                      {(Number(form.monto) - Number(montoSenia)).toLocaleString("es-AR")}.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Mes que abona (Período)">
                <input
                  aria-label="Mes que abona"
                  type="month"
                  value={form.periodoMes}
                  onChange={(e) => setForm({ ...form, periodoMes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-sm"
                  required
                />
              </Field>
              <Field label="Vigencia / Meses">
                <select
                  aria-label="Vigencia / Meses"
                  value={form.cantidadMeses}
                  onChange={(e) => handleCantidadMesesChange(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-sm"
                >
                  {OPCIONES_VIGENCIA_MESES.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {pagoSolapado && (
              <p className="text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                ⚠️ Este socio ya registra un comprobante ({pagoSolapado.estado}) que cubre{" "}
                <strong>{pagoSolapado.periodoMes}</strong>. Para evitar cobros duplicados, seleccioná otro período o anulá el anterior.
              </p>
            )}

            {form.cantidadMeses > 1 && /^\d{4}-\d{2}$/.test(periodoInicioEfectivo) && (
              <p className="text-[11px] font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/25 rounded-xl px-3 py-2">
                Cubre {form.cantidadMeses} meses: {formatearMes(periodoInicioEfectivo)} hasta{" "}
                {formatearMes(periodoFinEfectivo)} (próximo vencimiento:{" "}
                {calcularVencimientoCuota("AL_DIA", new Date(), periodoFinEfectivo)}).
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Método">
                <select
                  value={form.metodo}
                  onChange={(e) => setForm({ ...form, metodo: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-sm"
                >
                  <option className="bg-slate-900 text-white">Efectivo</option>
                  <option className="bg-slate-900 text-white">Transferencia</option>
                  <option className="bg-slate-900 text-white">Tarjeta</option>
                </select>
              </Field>
              <Field label="Estado">
                <select
                  disabled={esSeniaParcial}
                  value={esSeniaParcial ? "PARCIAL" : form.estado}
                  onChange={(e) =>
                    setForm({ ...form, estado: e.target.value as EstadoPago })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-sm disabled:opacity-60"
                >
                  <option value="PAGADO" className="bg-slate-900 text-white">Pagado</option>
                  {esSeniaParcial && (
                    <option value="PARCIAL" className="bg-slate-900 text-white">Seña parcial</option>
                  )}
                  <option value="PENDIENTE" className="bg-slate-900 text-white">Pendiente</option>
                  <option value="VENCIDO" className="bg-slate-900 text-white">Vencido</option>
                </select>
              </Field>
            </div>

            {errorValidacion && (
              <p className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                {errorValidacion}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-[color,background-color,transform] duration-200 active:scale-95"
            >
              {esSeniaParcial ? "Guardar seña parcial" : "Guardar pago"}
            </button>

            <SeccionNotificarWhatsapp
              alumnoId={form.alumnoId}
              alumnoNombre={alumnoSeleccionado?.nombre ?? ""}
              plan={form.plan}
              monto={esSeniaParcial && montoSenia ? montoSenia : form.monto}
              cantidadMeses={form.cantidadMeses}
              celular={celular}
              onCelularChange={setCelular}
              tipoMensaje={tipoMensaje}
              onTipoMensajeChange={(nuevoTipo) => {
                setTipoMensaje(nuevoTipo);
                if (nuevoTipo === "bienvenida") {
                  if (!usuarioApp.trim() && alumnoSeleccionado) {
                    setUsuarioApp(sugerirUsuarioAlumno(alumnoSeleccionado));
                  }
                  if (!passwordApp.trim()) {
                    setPasswordApp(generarPassword());
                  }
                }
              }}
              usuarioApp={usuarioApp}
              onUsuarioAppChange={setUsuarioApp}
              passwordApp={passwordApp}
              onPasswordAppChange={setPasswordApp}
              onAsignarCredenciales={onAsignarCredenciales}
            />
          </form>
        )}
      </div>
    </div>
  );
}

// ---------- Subcomponente: Notificación por WhatsApp ----------
function SeccionNotificarWhatsapp({
  alumnoId,
  alumnoNombre,
  plan,
  monto,
  cantidadMeses,
  celular,
  onCelularChange,
  tipoMensaje,
  onTipoMensajeChange,
  usuarioApp,
  onUsuarioAppChange,
  passwordApp,
  onPasswordAppChange,
  onAsignarCredenciales,
}: {
  alumnoId: string;
  alumnoNombre: string;
  plan: string;
  monto: string;
  cantidadMeses: number;
  celular: string;
  onCelularChange: (cel: string) => void;
  tipoMensaje: "pago" | "bienvenida";
  onTipoMensajeChange: (tipo: "pago" | "bienvenida") => void;
  usuarioApp: string;
  onUsuarioAppChange: (u: string) => void;
  passwordApp: string;
  onPasswordAppChange: (p: string) => void;
  onAsignarCredenciales: (alumnoId: string, usuario: string, password: string) => Promise<void>;
}) {
  const [mensaje, setMensaje] = useState("");
  const [credencialesGuardadas, setCredencialesGuardadas] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const copiarMensaje = async () => {
    if (!mensaje.trim()) return;
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {}
  };

  const generarMensaje = () => {
    const texto =
      tipoMensaje === "pago"
        ? mensajePagoTemplate(alumnoNombre, plan, monto, cantidadMeses)
        : mensajeBienvenidaTemplate(alumnoNombre, usuarioApp, passwordApp);
    setMensaje(texto);
    if (tipoMensaje === "bienvenida" && alumnoId && usuarioApp.trim() && passwordApp.trim()) {
      onAsignarCredenciales(alumnoId, usuarioApp.trim(), passwordApp.trim())
        .then(() => setCredencialesGuardadas(true))
        .catch(() => {});
    }
  };

  const puedeEnviar = celular.replace(/\D/g, "").length >= 10 && mensaje.trim().length > 0;

  const enviarWhatsapp = () => {
    if (!puedeEnviar) return;
    if (tipoMensaje === "bienvenida" && alumnoId && usuarioApp.trim() && passwordApp.trim()) {
      onAsignarCredenciales(alumnoId, usuarioApp.trim(), passwordApp.trim())
        .then(() => setCredencialesGuardadas(true))
        .catch(() => {});
    }
    try {
      navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {}
    const url = construirLinkWhatsapp(celular, mensaje, "app");
    const ventana = window.open(url, "atlas_whatsapp_tab");
    if (ventana) ventana.focus();
  };

  return (
    <div className="border-t border-slate-800/80 pt-4 mt-2 space-y-4">
      <p className="text-sm font-bold text-slate-300 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-emerald-400" />
        Notificar por WhatsApp (opcional)
      </p>

      <Field label="Celular del alumno">
        <input
          aria-label="Celular del alumno"
          type="tel"
          inputMode="numeric"
          value={celular}
          onChange={(e) => onCelularChange(soloNumerosLocal(e.target.value).slice(0, 13))}
          maxLength={13}
          className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white placeholder-slate-500 text-sm"
          placeholder="Ej. 2611234567 o 5492611234567"
        />
      </Field>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onTipoMensajeChange("pago")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-[color,background-color] duration-200 ${
            tipoMensaje === "pago"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          Confirmación de pago
        </button>
        <button
          type="button"
          onClick={() => onTipoMensajeChange("bienvenida")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-[color,background-color] duration-200 ${
            tipoMensaje === "bienvenida"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          Primera inscripción
        </button>
      </div>

      {tipoMensaje === "bienvenida" && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Usuario">
              <input
                aria-label="Usuario"
                value={usuarioApp}
                onChange={(e) => {
                  onUsuarioAppChange(e.target.value);
                  setCredencialesGuardadas(false);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white placeholder-slate-500 text-sm"
                placeholder="Ej. lucia910"
              />
            </Field>
            <Field label="Contraseña">
              <div className="flex gap-1.5">
                <input
                  aria-label="Contraseña"
                  value={passwordApp}
                  onChange={(e) => {
                    onPasswordAppChange(e.target.value);
                    setCredencialesGuardadas(false);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white placeholder-slate-500 text-sm font-mono"
                  placeholder="Generala"
                />
                <button
                  type="button"
                  onClick={() => {
                    onPasswordAppChange(generarPassword());
                    setCredencialesGuardadas(false);
                  }}
                  className="px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-700 hover:text-white transition-colors active:scale-95 shrink-0"
                >
                  Generar
                </button>
              </div>
            </Field>
          </div>
          <p className="text-[11px] text-slate-400">
            {credencialesGuardadas ? (
              <span className="text-emerald-400 font-semibold">
                ✓ Credenciales activadas en el sistema para el ingreso del alumno.
              </span>
            ) : (
              "Al guardar el pago o generar el mensaje, se activará esta cuenta para el portal del alumno."
            )}
          </p>
        </div>
      )}

      <Field label="Mensaje">
        <textarea
          aria-label="Mensaje"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={4}
          className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white placeholder-slate-500 text-sm resize-none"
          placeholder="Generá el mensaje o escribí uno propio..."
        />
      </Field>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={generarMensaje}
          className="py-2.5 px-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs font-semibold hover:bg-slate-800 hover:text-white transition-[color,background-color] duration-200 active:scale-95 cursor-pointer"
        >
          Generar mensaje
        </button>
        <button
          type="button"
          onClick={copiarMensaje}
          disabled={!mensaje.trim()}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-700 hover:text-white transition-[color,background-color] duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title="Copiar texto para pegar si ya tenés WhatsApp Web abierto"
        >
          {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiado ? "¡Copiado!" : "Copiar texto"}</span>
        </button>
        <button
          type="button"
          onClick={enviarWhatsapp}
          disabled={!puedeEnviar}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-[color,background-color] duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-950/20 cursor-pointer"
        >
          <MessageCircle className="w-4 h-4" />
          Enviar por WhatsApp
        </button>
      </div>
    </div>
  );
}

function soloNumerosLocal(valor: string) {
  return valor.replace(/[^0-9]/g, "");
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-400 mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}
