// app/finanzas/page.tsx
"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Clock,
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
  Landmark,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { type ResultadoAgregarPago, useAppData } from "@/lib/store";
import { coincideBusqueda, inicialesDe } from "@/lib/utils";
import {
  formatFechaAR,
  formatearMes,
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
  ESTADO_PAGO_STYLES,
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
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/lib/use-debounce";
import { alumnoDePagoEstaDeBaja, nombreDelPago } from "@/lib/pago-historial";
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

const ESTADO_STYLES = ESTADO_PAGO_STYLES;

const MOTIVO_OTRO = "Otro motivo";
const MOTIVOS_ANULACION_RAPIDOS = ["Cargado por error", "Monto incorrecto", "Socio equivocado", MOTIVO_OTRO];

type CobroPreseleccionado = { alumnoId: string; periodo?: string; meses?: number };

// Hoja inferior en celular, ventana centrada en escritorio
const claseFondoHoja =
  "fixed inset-0 z-50 flex items-end justify-center bg-[#060D1F]/80 backdrop-blur-sm md:items-center md:p-4";
const claseHoja =
  "flex max-h-[92dvh] w-full min-w-0 flex-col rounded-t-3xl bg-[#13254A] text-slate-100 shadow-2xl md:max-h-[90vh] md:max-w-md md:rounded-3xl";
const claseCampoHoja =
  "h-11 w-full rounded-xl border border-[#2A4677] bg-[#0E1B36] px-3 text-[15px] text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-400";
const claseMontoGrande =
  "min-w-0 flex-1 bg-transparent font-display text-4xl font-bold text-slate-100 outline-none";

function Separador() {
  return <span aria-hidden="true" className="mx-1.5 text-slate-600">|</span>;
}

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
      className={`flex items-center h-11 rounded-full border border-slate-800 bg-slate-900 transition-opacity ${
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
        className="h-full pl-4 pr-2 bg-transparent text-sm font-medium text-slate-200 outline-none cursor-pointer disabled:cursor-not-allowed appearance-none"
      >
        {NOMBRES_MESES.map((nombre, i) => (
          <option key={nombre} value={i} className="bg-slate-900 text-white">{nombre}</option>
        ))}
      </select>
      <div className="h-5 w-px bg-slate-700 shrink-0" />
      <select
        disabled={disabled}
        aria-label="Seleccionar año"
        value={anioStr}
        onChange={(e) => onChange(`${e.target.value}-${mesStr}`)}
        className="h-full pl-2 pr-4 bg-transparent text-sm font-medium text-slate-200 outline-none cursor-pointer disabled:cursor-not-allowed appearance-none"
      >
        {anios.map((a) => (
          <option key={a} value={a} className="bg-slate-900 text-white">{a}</option>
        ))}
      </select>
    </div>
  );
}

function mesActualISO() {
  return periodoMesActual();
}

// ---------- Vista dedicada para el Alumno (Mis Cuotas) ----------
function VistaCuotasAlumno({ usuario }: { usuario: UsuarioSesion }) {
  const { alumnos, getPagosDeAlumno, getEstadoCuenta, planes, datosCobro } = useAppData();
  const [copiado, setCopiado] = useState(false);

  const alumno = usuario.alumnoId ? alumnos.find((a) => a.id === usuario.alumnoId) : undefined;

  if (!alumno) {
    return (
      <div className="mx-auto max-w-[800px] px-5 py-16 text-center">
        <div className="mx-auto size-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <AlertCircle className="size-8" />
        </div>
        <h1 className="text-4xl font-black text-white">Ficha de alumno no vinculada</h1>
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
    if (!datosCobro.alias) return;
    navigator.clipboard.writeText(datosCobro.alias);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const heroe = {
    AL_DIA: {
      caja: "border-[#2E6B57] bg-[#0F3B2B]",
      texto: "text-[#C8F5DD]",
      Icono: Check,
      icono: "text-[#5BE3A0]",
      estado: "Estás al día",
      titulo: maxPeriodoCubierto
        ? `${formatearMes(maxPeriodoCubierto).replace(` de ${new Date().getFullYear()}`, "")} pagado`
        : "Acceso habilitado",
    },
    PENDIENTE: {
      caja: "border-amber-500/40 bg-amber-500/10",
      texto: "text-amber-300",
      Icono: Clock,
      icono: "text-amber-400",
      estado: "Tenés un pago pendiente",
      titulo: "Cuota pendiente",
    },
    MOROSO: {
      caja: "border-rose-400/40 bg-rose-500/10",
      texto: "text-rose-300",
      Icono: AlertCircle,
      icono: "text-rose-400",
      estado: "Regularizá para seguir entrenando",
      titulo: "Cuota vencida",
    },
    INACTIVO: {
      caja: "border-slate-700 bg-[#162A50]",
      texto: "text-slate-300",
      Icono: AlertCircle,
      icono: "text-slate-400",
      estado: "Acercate a recepción",
      titulo: "Membresía inactiva",
    },
  }[estadoCuenta];
  const etiquetaPago = (pago: Pago) =>
    ({ PAGADO: "Pagado", PARCIAL: "Seña", PENDIENTE: "Pendiente", VENCIDO: "Vencido", ANULADO: "Anulado" })[pago.estado];
  const IconoPago = (pago: Pago) => (pago.estado === "PAGADO" ? Check : pago.estado === "VENCIDO" ? AlertCircle : Clock);

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-3.5 px-5 pb-28 pt-[22px] md:gap-5 md:pb-16 md:pt-12">
      <h1 className="text-[34px] font-extrabold uppercase leading-[.95] text-white md:text-[40px]">Mis cuotas</h1>

      <section aria-labelledby="estado-cuota" className={`flex flex-col gap-1.5 rounded-[18px] border p-[18px] ${heroe.caja}`}>
        <h2 id="estado-cuota" className={`flex items-center gap-2 text-sm font-bold ${heroe.texto}`}>
          <heroe.Icono className={`size-[18px] ${heroe.icono}`} aria-hidden="true" />
          {heroe.estado}
        </h2>
        <p className="font-display text-[34px] font-extrabold uppercase leading-none text-white">{heroe.titulo}</p>
        <p className={`text-sm ${heroe.texto}`}>
          Próximo vencimiento: {calcularVencimientoCuota(estadoCuenta, new Date(), maxPeriodoCubierto)}
          <Separador />
          se abona del 1 al 10
        </p>
      </section>

      <section aria-label="Mi plan" className="rounded-2xl bg-[#162A50] px-4 py-1">
        <div className="flex justify-between gap-4 border-b border-[#22396A] py-3 text-[15px]">
          <span className="text-slate-400">Mi plan</span>
          <span className="text-right text-slate-100">{alumno.plan || "Musculación"}</span>
        </div>
        <div className="flex items-center justify-between gap-4 py-3 text-[15px]">
          <span className="text-slate-400">Valor</span>
          <span className="font-display text-xl font-bold text-slate-100">${planMonto.toLocaleString("es-AR")} / mes</span>
        </div>
      </section>

      <section aria-labelledby="como-pagar" className="flex flex-col gap-3 rounded-2xl bg-[#162A50] p-4">
        <h2 id="como-pagar" className="text-[17px] font-bold text-white">Cómo pagar</h2>
        {datosCobro.alias ? (
          <div className="flex items-center gap-3 rounded-xl bg-[#0E1B36] p-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-slate-400">
                Transferencia o Mercado Pago
                <Separador />
                Alias
              </p>
              <p className="mt-0.5 break-words font-bold text-white">{datosCobro.alias}</p>
              {datosCobro.titular && <p className="mt-0.5 text-[13px] text-slate-500">Titular: {datosCobro.titular}</p>}
            </div>
            <button type="button" onClick={copiarAlias} className="h-11 shrink-0 rounded-[10px] bg-blue-600 px-3.5 text-sm font-bold text-white hover:bg-blue-500">
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        ) : null}
        <p className="text-sm text-slate-400">
          {datosCobro.alias
            ? "También podés abonar en recepción, en efectivo o con tarjeta."
            : "Abonás en recepción, en efectivo, con transferencia o con tarjeta."}
        </p>
        <a
          href={`${CONTACTO_ATLAS.whatsappUrl}?text=${encodeURIComponent(
            `Hola! Soy ${alumno.nombre || "alumno"}, les adjunto mi comprobante de pago de la cuota.`
          )}`}
          target="atlas_whatsapp_tab"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#2A4677] px-3 text-sm font-semibold text-slate-100 hover:bg-slate-900"
        >
          <WhatsAppIcon className="size-[18px] fill-current" />
          Enviar comprobante por WhatsApp
        </a>
      </section>

      <section aria-labelledby="historial-cuotas" className="rounded-2xl bg-[#162A50] px-4 py-1.5">
        <h2 id="historial-cuotas" className="pb-1.5 pt-2.5 text-[17px] font-bold text-white">Historial</h2>
        {misPagos.length === 0 ? (
          <p className="border-t border-[#22396A] py-6 text-center text-sm text-slate-500">No tenés pagos registrados en el sistema todavía.</p>
        ) : (
          <ul>
            {misPagos.map((pago) => {
              const esParcial = pago.estado === "PARCIAL";
              const Icono = IconoPago(pago);
              return (
                <li key={pago.id} className="flex items-center gap-2.5 border-t border-[#22396A] py-[11px] text-[15px]">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">
                      {formatearMes(pago.periodoMes || pago.fecha.slice(0, 7)).replace(` de ${new Date().getFullYear()}`, "")}
                      {(pago.cantidadMeses ?? 1) > 1 && <span className="ml-1 font-normal text-slate-500">({pago.cantidadMeses} meses)</span>}
                    </p>
                    <p className="text-[13px] text-slate-500">
                      {formatFechaAR(pago.fecha)}
                      <Separador />
                      {pago.metodo}
                    </p>
                    {esParcial && <p className="text-[13px] text-amber-400">Resta ${obtenerSaldoPendientePago(pago).toLocaleString("es-AR")}</p>}
                  </div>
                  <span className="tabular-nums text-slate-100">${(esParcial ? obtenerMontoRecaudadoPago(pago) : pago.monto).toLocaleString("es-AR")}</span>
                  <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold ${ESTADO_STYLES[pago.estado]}`}>
                    <Icono className="size-3.5" aria-hidden="true" />
                    {etiquetaPago(pago)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------- Componente principal ----------
function CobrarPorParametro({
  alumnos,
  onSeleccionar,
}: {
  alumnos: Alumno[];
  onSeleccionar: (dni: string) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const procesadoRef = useRef<string | null>(null);
  const cobrarDni = searchParams.get("cobrar");

  useEffect(() => {
    if (!cobrarDni || procesadoRef.current === cobrarDni) return;
    // Esperamos a que el socio tenga ID numérico del servidor (mientras está en alta optimista tiene UUID).
    const socio = alumnos.find((a) => a.dni === cobrarDni && /^\d+$/.test(a.id));
    if (!socio) return;
    procesadoRef.current = cobrarDni;
    onSeleccionar(cobrarDni);
    router.replace("/finanzas", { scroll: false });
  }, [cobrarDni, alumnos, onSeleccionar, router]);

  return null;
}

export default function FinanzasPage() {
  const {
    alumnos,
    planes,
    pagos,
    agregarPago,
    refrescarPagos,
    actualizarEstadoPago,
    completarSaldoPago,
    anularPago,
    asignarCredencialesAlumno,
    getAlumno,
    getEstadoCuenta,
    usuarioActual,
    datosCobro,
    guardarDatosCobro,
  } = useAppData();
  const { toast } = useToast();
  const [modalDatosCobro, setModalDatosCobro] = useState(false);

  const [mes, setMes] = useState<string>(() => mesActualISO());
  const [verTodos, setVerTodos] = useState(false);
  const [filtro, setFiltro] = useState<EstadoPago | "TODOS">("TODOS");
  const [filtroMetodo, setFiltroMetodo] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 250);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cobroPreseleccionado, setCobroPreseleccionado] = useState<CobroPreseleccionado | null>(null);
  const [dniPreseleccionado, setDniPreseleccionado] = useState<string | null>(null);
  const [pagoAAnular, setPagoAAnular] = useState<Pago | null>(null);
  const [pagoACompletar, setPagoACompletar] = useState<Pago | null>(null);
  // Un toque mal en la tabla movía plata de la caja sin aviso: el cambio de estado se confirma antes.
  const [cambioEstado, setCambioEstado] = useState<{ pago: Pago; estado: EstadoPago } | null>(null);
  const [fechaArqueo, setFechaArqueo] = useState<string>(() => fechaLocalHoy());

  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina, setElementosPorPagina] = useState(15);

  const pagosDelMes = useMemo(() => {
    if (verTodos) return pagos;
    return pagos.filter((p) => (p.periodoMes || p.fecha.slice(0, 7)) === mes);
  }, [pagos, mes, verTodos]);

  const arqueoCaja = useMemo(
    () => (verTodos ? calcularArqueoCajaLocal(pagos) : calcularArqueoCajaLocal(pagos, fechaArqueo)),
    [pagos, fechaArqueo, verTodos]
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
    const q = busquedaDebounced;
    return pagosDelMes.filter((p) => {
      const coincideFiltro = filtro === "TODOS" || p.estado === filtro;
      const coincideMetodo = filtroMetodo === "TODOS" || p.metodo.toLowerCase() === filtroMetodo.toLowerCase();
      const nombreAlumno = nombreDelPago(p, getAlumno(p.alumnoId));
      const coincideTexto = coincideBusqueda(q, nombreAlumno, p.alumnoNombreHistorico, p.plan, p.metodo, p.registradoPor);
      return coincideFiltro && coincideMetodo && coincideTexto;
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
        setModalAbierto(false); setDniPreseleccionado(null);
        setPagoAAnular(null);
        setPagoACompletar(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // La ficha del socio llega con ?cobrarSocio=<id>&periodo=YYYY-MM&meses=N o ?completar=<idPago>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const alumnoId = params.get("cobrarSocio");
    const pagoId = params.get("completar");
    if (!alumnoId && !pagoId) return;
    if (alumnoId) {
      const periodo = params.get("periodo") ?? "";
      const meses = Number(params.get("meses"));
      setCobroPreseleccionado({
        alumnoId,
        periodo: /^\d{4}-\d{2}$/.test(periodo) ? periodo : undefined,
        meses: Number.isInteger(meses) && meses >= 1 && meses <= 24 ? meses : undefined,
      });
      setModalAbierto(true);
    }
    const pago = pagos.find((p) => p.id === pagoId && p.estado === "PARCIAL");
    if (pago) setPagoACompletar(pago);
    window.history.replaceState(null, "", "/finanzas");
    // Solo al entrar: después el modal ya vive por su cuenta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const nombre = nombreDelPago(p, alumno) + (alumnoDePagoEstaDeBaja(p, alumno) ? " (Alumno dado de baja)" : "");
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

  const handleNuevoPago = async (
    nuevo: Omit<Pago, "id"> & { usuarioApp?: string; passwordApp?: string }
  ) => {
    const resultado = await agregarPago(nuevo);
    if (!resultado.ok) return resultado;
    setModalAbierto(false); setDniPreseleccionado(null);
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
    return resultado;
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
    <div className="mx-auto flex max-w-[1280px] flex-col gap-10 overflow-x-hidden px-4 pb-28 pt-6 sm:px-5 md:gap-12 md:px-14 md:pb-16 md:pt-12">
      {/* ENCABEZADO */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm text-slate-500">{verTodos ? "Historial completo" : formatearMes(mes)}</p>
            <h1 className="text-4xl font-bold uppercase text-white md:text-[40px]">Finanzas y caja</h1>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <button
              onClick={() => setModalDatosCobro(true)}
              title={
                datosCobro.alias
                  ? `Alias vigente: ${datosCobro.alias}. Tocá para cambiarlo.`
                  : "Cargá el alias de transferencia que ven los alumnos"
              }
              className={`flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium ${
                datosCobro.alias
                  ? "border-slate-800 text-slate-300 hover:bg-slate-900"
                  : "border-amber-400/50 text-amber-300 hover:bg-amber-500/10"
              }`}
            >
              <Landmark className="size-4 shrink-0" />
              {datosCobro.alias ? "Datos de cobro" : "Cargar alias"}
            </button>
            <button
              onClick={exportarCSVFinanzas}
              title="Exportar planilla actual a archivo CSV / Excel"
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-800 px-4 text-sm font-medium text-slate-300 hover:bg-slate-900"
            >
              <Download className="size-4 shrink-0" />
              Exportar CSV
            </button>
            <button
              onClick={() => {
                setCobroPreseleccionado(null);
                setModalAbierto(true);
              }}
              className="flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <Plus className="size-4 shrink-0" />
              Registrar pago
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
            className="h-11 rounded-full border border-slate-800 px-4 text-sm font-medium text-slate-300 hover:bg-slate-900"
          >
            Mes actual
          </button>
          <button
            type="button"
            aria-pressed={verTodos}
            onClick={() => setVerTodos((v) => !v)}
            className={`h-11 rounded-full px-4 text-sm font-medium ${
              verTodos ? "bg-slate-200 text-slate-950" : "border border-slate-800 text-slate-300 hover:bg-slate-900"
            }`}
          >
            Ver todos
          </button>
        </div>
      </div>

      {/* CAJA: franja con el total y el desglose (del día o acumulado de todos los meses) */}
      <section aria-labelledby="titulo-caja" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="titulo-caja" className="text-base font-semibold text-slate-300">
            {verTodos
              ? "Caja acumulada (todos los meses)"
              : fechaArqueo === fechaLocalHoy()
              ? "Caja de hoy"
              : `Caja del ${formatFechaAR(fechaArqueo)}`}
          </h2>
          {!verTodos && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-[13px] text-slate-500">
                Ver otro día
                <input
                  type="date"
                  aria-label="Fecha de arqueo de caja"
                  value={fechaArqueo}
                  onChange={(e) => e.target.value && setFechaArqueo(e.target.value)}
                  className="h-11 rounded-xl border border-slate-800 bg-slate-900 px-3 text-sm text-slate-200 outline-none focus:border-blue-500"
                />
              </label>
              {fechaArqueo !== fechaLocalHoy() && (
                <button
                  type="button"
                  onClick={() => setFechaArqueo(fechaLocalHoy())}
                  className="h-11 rounded-xl border border-slate-800 px-3 text-sm text-slate-300 hover:bg-slate-900"
                >
                  Hoy
                </button>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 border-y border-slate-800 lg:grid-cols-4">
          <div className="flex flex-col gap-1 py-4 pr-4 md:py-5">
            <span className="text-[13px] text-slate-500">Total cobrado ({arqueoCaja.cantidadCobros})</span>
            <span className="text-xl font-semibold text-white md:text-2xl">${arqueoCaja.totalRecaudado.toLocaleString("es-AR")}</span>
          </div>
          {[
            { label: "Efectivo", valor: arqueoCaja.totalEfectivo },
            { label: "Transferencia / MP", valor: arqueoCaja.totalTransferencia },
            { label: "Tarjeta", valor: arqueoCaja.totalTarjeta },
          ].map((m, i) => (
            <div
              key={m.label}
              className={`flex flex-col gap-1 border-slate-800 py-4 md:py-5 ${
                i === 0 ? "border-l pl-4 md:pl-6" : i === 1 ? "border-t pr-4 lg:border-l lg:border-t-0 lg:pl-6" : "border-l border-t pl-4 md:pl-6 lg:border-t-0"
              }`}
            >
              <span className="text-[13px] text-slate-500">{m.label}</span>
              <span className="text-lg font-medium text-slate-200 md:text-xl">${m.valor.toLocaleString("es-AR")}</span>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-slate-500">
          {arqueoCaja.porOperador.length === 0
            ? verTodos
              ? "Sin cobros registrados."
              : "Sin cobros registrados en esta fecha."
            : `Por titular: ${arqueoCaja.porOperador
                .map((op) => `${op.operador} $${op.totalRecaudado.toLocaleString("es-AR")} (${op.cantidadOperaciones})`)
                .join(", ")}.`}
          {arqueoCaja.cantidadParciales > 0 &&
            ` ${arqueoCaja.cantidadParciales} seña(s) con $${arqueoCaja.saldoPendienteParciales.toLocaleString("es-AR")} por completar.`}
          {arqueoCaja.cantidadAnulados > 0 &&
            ` ${arqueoCaja.cantidadAnulados} anulado(s) por $${arqueoCaja.montoAnulado.toLocaleString("es-AR")}, fuera de la caja.`}
        </p>
      </section>

      {/* MOVIMIENTOS: la tabla es lo principal */}
      <section aria-labelledby="titulo-movimientos" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="titulo-movimientos" className="text-xl font-semibold text-white">
            {verTodos ? "Todos los movimientos" : "Movimientos del mes"}
          </h2>
          <label className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              id="buscar-finanzas"
              aria-label="Buscar alumno"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar socio u operador..."
              className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500/60"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por estado">
          {FILTROS.map((f) => {
            const cantidad = f.value === "TODOS" ? pagosDelMes.length : pagosDelMes.filter((p) => p.estado === f.value).length;
            const activo = filtro === f.value;
            return (
              <button
                key={f.value}
                aria-pressed={activo}
                onClick={() => setFiltro(f.value)}
                className={`flex h-11 items-center gap-2 rounded-full px-4 text-sm ${
                  activo ? "bg-slate-200 font-semibold text-slate-950" : "border border-slate-800 text-slate-300 hover:bg-slate-900"
                }`}
              >
                {f.label}
                <span className={activo ? "font-normal" : "text-slate-500"}>{cantidad}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por medio de pago">
          <span className="text-[13px] text-slate-500">Medio de pago:</span>
          {["TODOS", "Efectivo", "Transferencia", "Tarjeta"].map((met) => (
            <button
              key={met}
              aria-pressed={filtroMetodo === met}
              onClick={() => setFiltroMetodo(met)}
              className={`h-9 rounded-lg px-3 text-[13px] ${
                filtroMetodo === met ? "bg-slate-800 font-semibold text-white" : "text-slate-400 hover:bg-slate-900"
              }`}
            >
              {met === "TODOS" ? "Todos" : met}
            </button>
          ))}
        </div>

        <div className="relative overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full min-w-[860px] border-collapse text-[15px]">
            <thead>
              <tr className="bg-slate-900/60 text-left text-[13px] text-slate-500">
                <th className="px-5 py-3 font-medium">Alumno</th>
                <th className="px-5 py-3 font-medium">Período</th>
                <th className="px-5 py-3 text-right font-medium">Importe</th>
                <th className="px-5 py-3 font-medium">Cobro</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3"><span className="sr-only">Acciones</span></th>
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
                  pago.estado === "PARCIAL" || pago.estado === "PENDIENTE" || pago.estado === "VENCIDO";
                const puedeWhatsapp = requiereRecordatorio && alumno && tieneCelularWhatsappValido(alumno.celular);

                return (
                  <tr key={pago.id} className={`border-t border-slate-800 ${esAnulado ? "text-slate-500" : ""}`}>
                    <td className="px-5 py-4">
                      {alumno ? (
                        <Link
                          href={`/alumnos/${alumno.id}`}
                          className={`block font-semibold hover:underline ${esAnulado ? "text-slate-500 line-through" : "text-white"}`}
                        >
                          {nombreDelPago(pago, alumno)}
                        </Link>
                      ) : (
                        <span className="block italic text-slate-500">{nombreDelPago(pago, alumno)}</span>
                      )}
                      {alumno?.dni && <span className="mt-0.5 block text-[13px] text-slate-500">DNI {alumno.dni}</span>}
                      {alumnoDePagoEstaDeBaja(pago, alumno) && (
                        <span className="mt-0.5 block text-[13px] text-amber-400">Alumno dado de baja</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {pago.periodoMes || pago.fecha.slice(0, 7)}
                      <span className="mt-0.5 block text-[13px] text-slate-500">
                        {pago.plan}
                        {(pago.cantidadMeses ?? 1) > 1 && (
                          <span title={`Cubre hasta ${obtenerPeriodoFinCubierto(pago) || ""}`}>, {pago.cantidadMeses} meses</span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums">
                      <span className={esAnulado ? "line-through" : "text-white"}>
                        ${(esParcial ? abonado : pago.monto).toLocaleString("es-AR")}
                      </span>
                      {esParcial && (
                        <span className="mt-0.5 block text-[13px] text-slate-500">resta ${saldo.toLocaleString("es-AR")}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {esAnulado ? `Anulado${pago.anuladoPor ? ` por ${pago.anuladoPor}` : ""}` : pago.metodo}
                      <span className="mt-0.5 block text-[13px] text-slate-500">
                        {esAnulado && pago.motivoAnulacion
                          ? `Motivo: ${pago.motivoAnulacion}`
                          : [pago.registradoPor, formatFechaAR(pago.fecha)].filter(Boolean).join(", ")}
                      </span>
                      {pago.comprobante && (
                        <span className="block max-w-[180px] truncate text-[13px] text-slate-500" title={pago.comprobante}>
                          {pago.comprobante}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {esAnulado ? (
                        <span className="text-sm text-slate-500">Anulado</span>
                      ) : esParcial ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-amber-400">
                          <Clock className="size-3.5" />Seña parcial
                        </span>
                      ) : (
                        <span className="relative inline-flex items-center gap-1.5">
                          {pago.estado === "PAGADO" ? null : pago.estado === "VENCIDO" ? (
                            <AlertCircle className="size-3.5 text-rose-400" />
                          ) : (
                            <Clock className="size-3.5 text-amber-400" />
                          )}
                          <select
                            aria-label="Cambiar estado del pago"
                            value={pago.estado}
                            onChange={(e) => setCambioEstado({ pago, estado: e.target.value as EstadoPago })}
                            className={`cursor-pointer appearance-none bg-transparent pr-5 text-sm outline-none ${ESTADO_STYLES[pago.estado]}`}
                          >
                            <option value="PAGADO" className="bg-slate-900 text-white">Pagado</option>
                            <option value="PENDIENTE" className="bg-slate-900 text-white">Pendiente</option>
                            <option value="VENCIDO" className="bg-slate-900 text-white">Vencido</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-0 size-3.5 opacity-60" />
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {esParcial && (
                          <button
                            type="button"
                            onClick={() => setPagoACompletar(pago)}
                            title={`Completar saldo restante ($${saldo.toLocaleString("es-AR")})`}
                            className="h-11 whitespace-nowrap rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500"
                          >
                            Completar saldo
                          </button>
                        )}
                        {!esAnulado && (
                          <details className="relative">
                            <summary
                              aria-label={`Más acciones para ${alumno?.nombre ?? "este pago"}`}
                              className="flex size-11 cursor-pointer list-none items-center justify-center rounded-xl text-slate-400 hover:bg-slate-900 [&::-webkit-details-marker]:hidden"
                            >
                              <MoreHorizontal className="size-5" />
                            </summary>
                            <div className="absolute right-0 z-20 mt-1 flex w-56 flex-col rounded-xl border border-slate-700 bg-slate-900 py-1 text-left shadow-xl">
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
                                      aliasPago: datosCobro.alias,
                                    })
                                  )}
                                  target="atlas_whatsapp_tab"
                                  rel="noopener noreferrer"
                                  className="flex min-h-11 items-center gap-2.5 px-4 text-sm text-slate-200 hover:bg-slate-800"
                                >
                                  <WhatsAppIcon className="size-4 fill-current" />
                                  Recordar por WhatsApp
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => setPagoAAnular(pago)}
                                aria-label={`Anular comprobante de ${alumno?.nombre ?? "este socio"}`}
                                className="flex min-h-11 items-center gap-2.5 px-4 text-left text-sm text-rose-300 hover:bg-slate-800"
                              >
                                <Ban className="size-4" />
                                Anular comprobante
                              </button>
                            </div>
                          </details>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pagosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
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
          <div className="flex flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
            <div className="flex items-center gap-2">
              <span>
                Mostrando {(paginaActual - 1) * elementosPorPagina + 1} a{" "}
                {Math.min(paginaActual * elementosPorPagina, pagosFiltrados.length)} de {pagosFiltrados.length}
              </span>
              <select
                aria-label="Pagos por página"
                value={elementosPorPagina}
                onChange={(e) => {
                  setElementosPorPagina(Number(e.target.value));
                  setPaginaActual(1);
                }}
                className="h-11 rounded-xl border border-slate-800 bg-slate-900 px-2.5 text-slate-300 outline-none"
              >
                <option value={15} className="bg-slate-900 text-white">15 por página</option>
                <option value={30} className="bg-slate-900 text-white">30 por página</option>
                <option value={50} className="bg-slate-900 text-white">50 por página</option>
                <option value={100} className="bg-slate-900 text-white">100 por página</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="h-11 rounded-xl border border-slate-800 px-4 text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="px-1 text-slate-400">Página {paginaActual} de {totalPaginas}</span>
              <button
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                className="h-11 rounded-xl border border-slate-800 px-4 text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>

      {/* RESUMEN DEL MES: al final, en una línea */}
      <section aria-labelledby="titulo-mes" className="flex flex-col gap-3">
        <h2 id="titulo-mes" className="text-base font-semibold text-slate-300">
          {verTodos ? "Resumen total" : "Resumen del mes"}
        </h2>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-slate-800 pt-4 text-[15px] text-slate-400">
          <span>
            {verTodos ? "Ingresos netos totales" : "Ingresos del mes"}
            <strong className="ml-2 font-semibold text-white">${metrica.ingresosDelMes.toLocaleString("es-AR")}</strong>
          </span>
          <span>
            Saldos y cuotas pendientes
            <strong className="ml-2 font-semibold text-white">${metrica.pendientesMonto.toLocaleString("es-AR")}</strong>
            <span className="ml-1 text-[13px] text-slate-500">({metrica.pendientesCount})</span>
          </span>
          <span>
            Cuotas vencidas
            <strong className="ml-2 font-semibold text-white">${metrica.vencidosMonto.toLocaleString("es-AR")}</strong>
            <span className="ml-1 text-[13px] text-slate-500">({metrica.vencidosCount})</span>
          </span>
          <span>
            Socios morosos hoy<strong className="ml-2 font-semibold text-white">{metrica.morosos}</strong>
          </span>
          <button
            type="button"
            onClick={() => setFiltro("VENCIDO")}
            className="flex h-11 items-center rounded-xl border border-slate-800 px-4 text-sm text-slate-300 hover:bg-slate-900 sm:ml-auto"
          >
            Ver cuotas vencidas
          </button>
        </div>
      </section>

      <Suspense fallback={null}>
        <CobrarPorParametro
          alumnos={alumnos}
          onSeleccionar={(dni) => {
            setCobroPreseleccionado(null);
            setDniPreseleccionado(dni);
            setModalAbierto(true);
          }}
        />
      </Suspense>
      {modalAbierto && (
        <ModalRegistrarPago
          alumnos={alumnos}
          planes={planes}
          pagos={pagos}
          getEstadoCuenta={getEstadoCuenta}
          cobrador={usuarioActual.nombre}
          preseleccion={cobroPreseleccionado}
          alumnoInicialDni={dniPreseleccionado ?? undefined}
          onClose={() => { setModalAbierto(false); setDniPreseleccionado(null); }}
          onSubmit={handleNuevoPago}
          onConsultarPagos={refrescarPagos}
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

      {modalDatosCobro && (
        <ModalDatosCobro
          aliasActual={datosCobro.alias}
          titularActual={datosCobro.titular}
          actualizadoPor={datosCobro.actualizadoPor}
          actualizadoEn={datosCobro.actualizadoEn}
          onCancel={() => setModalDatosCobro(false)}
          onGuardar={async (datos) => {
            const res = await guardarDatosCobro(datos);
            if (res.ok) {
              setModalDatosCobro(false);
              toast(
                datos.alias.trim()
                  ? "Datos de cobro actualizados: los alumnos ya ven el nuevo alias."
                  : "Alias quitado: los alumnos verán que abonan en recepción.",
                "success"
              );
            }
            return res;
          }}
        />
      )}
      {cambioEstado && (
        <ModalConfirmarEstadoPago
          pago={cambioEstado.pago}
          estadoNuevo={cambioEstado.estado}
          nombreAlumno={getAlumno(cambioEstado.pago.alumnoId)?.nombre ?? cambioEstado.pago.alumnoNombreHistorico ?? "este socio"}
          onCancel={() => setCambioEstado(null)}
          onConfirm={() => {
            actualizarEstadoPago(cambioEstado.pago.id, cambioEstado.estado);
            setCambioEstado(null);
          }}
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

const NOMBRE_ESTADO: Record<string, string> = { PAGADO: "Pagado", PENDIENTE: "Pendiente", VENCIDO: "Vencido" };

// ---------- Modal: confirmar el cambio de estado desde la tabla ----------
function ModalConfirmarEstadoPago({
  pago,
  estadoNuevo,
  nombreAlumno,
  onCancel,
  onConfirm,
}: {
  pago: Pago;
  estadoNuevo: EstadoPago;
  nombreAlumno: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const monto = `$${pago.monto.toLocaleString("es-AR")}`;
  const sacaDeCaja = pago.estado === "PAGADO" && estadoNuevo !== "PAGADO";
  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-cambio-estado"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl"
      >
        <h2 id="titulo-cambio-estado" className="text-xl font-semibold text-white">
          {`¿Pasar a ${NOMBRE_ESTADO[estadoNuevo] ?? estadoNuevo}?`}
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          {sacaDeCaja
            ? `El pago de ${nombreAlumno} (${monto}) sale de la caja de hoy y el socio queda debiendo. Si querés deshacer un cobro mal hecho, usá Anular: queda registrado el motivo.`
            : estadoNuevo === "PAGADO"
            ? `El pago de ${nombreAlumno} (${monto}) entra en la caja de hoy como cobrado.`
            : `Cambia el estado del pago de ${nombreAlumno} (${monto}) y su estado de cuenta.`}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-xl border border-slate-700 bg-slate-800/50 px-5 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-500"
          >
            Sí, cambiar
          </button>
        </div>
      </div>
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
  const [elegido, setElegido] = useState("");
  const [detalle, setDetalle] = useState("");
  const esOtro = elegido === MOTIVO_OTRO;
  const motivo = (esOtro ? detalle : elegido).trim();
  const motivoValido = motivo.length >= 4;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (motivoValido) onConfirm(motivo);
  };

  return (
    <div onClick={onCancel} className={claseFondoHoja}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-anular"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className={`${claseHoja} gap-4 overflow-y-auto px-5 pb-6 pt-2.5`}
      >
        <span aria-hidden="true" className="h-[5px] w-11 shrink-0 self-center rounded-full bg-slate-700 md:hidden" />
        <div>
          <h2 id="titulo-anular" className="text-[26px] font-extrabold uppercase leading-tight text-white">Anular comprobante</h2>
          <p className="mt-1.5 text-sm text-slate-400">No se borra: queda tachado en la caja, con tu nombre y el motivo.</p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[14px] bg-[#0E1B36] p-3.5">
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{nombreAlumno}</p>
            <p className="mt-0.5 text-[13px] text-slate-400">
              {pago.plan}
              <Separador />
              {formatearMes(pago.periodoMes || pago.fecha.slice(0, 7))}
              <Separador />
              {pago.metodo}
            </p>
          </div>
          <span className="shrink-0 font-display text-[26px] font-bold text-white">
            ${obtenerMontoRecaudadoPago(pago).toLocaleString("es-AR")}
          </span>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-slate-400">Motivo (obligatorio)</p>
          <div role="radiogroup" aria-label="Motivo de anulación" className="flex flex-wrap gap-2">
            {MOTIVOS_ANULACION_RAPIDOS.map((opcion) => (
              <button
                key={opcion}
                type="button"
                role="radio"
                aria-checked={elegido === opcion}
                onClick={() => setElegido(opcion)}
                className={`h-11 rounded-full px-4 text-sm ${
                  elegido === opcion
                    ? "border-2 border-[#FF8A80] bg-[#FF8A80]/15 font-bold text-white"
                    : "border border-[#2A4677] font-semibold text-slate-300"
                }`}
              >
                {opcion}
              </button>
            ))}
          </div>
          {esOtro && (
            <label className="mt-3 block text-[13px] font-semibold text-slate-400">
              Contanos qué pasó
              <textarea
                rows={2}
                autoFocus
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                className="mt-1.5 block w-full resize-none rounded-xl border border-[#2A4677] bg-[#0E1B36] p-3 text-[15px] font-normal text-slate-100 outline-none focus:border-blue-400"
              />
            </label>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={onCancel} className="h-[54px] rounded-[14px] border border-[#2A4677] text-base font-semibold text-slate-100">
            Volver
          </button>
          <button type="submit" disabled={!motivoValido} className="h-[54px] rounded-[14px] bg-[#C4362F] text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
            Anular
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
          <h2 className="text-2xl font-black text-white">Completar saldo pendiente</h2>
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

function ModalDatosCobro({
  aliasActual,
  titularActual,
  actualizadoPor,
  actualizadoEn,
  onCancel,
  onGuardar,
}: {
  aliasActual: string;
  titularActual: string;
  actualizadoPor?: string;
  actualizadoEn?: string;
  onCancel: () => void;
  onGuardar: (datos: { alias: string; titular: string }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [alias, setAlias] = useState(aliasActual);
  const [titular, setTitular] = useState(titularActual);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const res = await onGuardar({ alias, titular });
    setGuardando(false);
    if (!res.ok) setError(res.error || "No se pudieron guardar los datos.");
  };

  const fechaCambio = actualizadoEn
    ? new Date(actualizadoEn).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
    : null;

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
    >
      <form
        onSubmit={guardar}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-3xl shadow-2xl text-slate-100 border border-slate-800 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200 space-y-4"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
          <Landmark className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Datos de cobro por transferencia</h2>
          <p className="mt-1 text-sm text-slate-400">
            Es lo que ven los alumnos en <strong className="text-slate-200">Mis cuotas</strong> y lo que se
            incluye en los recordatorios por WhatsApp. Si lo dejás vacío, se les indica abonar en recepción.
          </p>
        </div>

        <Field label="Alias o CBU/CVU">
          <input
            aria-label="Alias de transferencia"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="Escribí el alias o el CBU/CVU de la cuenta"
            autoComplete="off"
            className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 text-white text-sm font-mono"
          />
        </Field>
        <Field label="Titular de la cuenta (opcional)">
          <input
            aria-label="Titular de la cuenta"
            value={titular}
            onChange={(e) => setTitular(e.target.value)}
            placeholder="Nombre que aparece al transferir"
            autoComplete="off"
            className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 text-white text-sm"
          />
        </Field>

        {actualizadoPor && fechaCambio && (
          <p className="text-xs text-slate-500">
            Último cambio: {actualizadoPor} · {fechaCambio}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm font-semibold text-rose-400">
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
            disabled={guardando}
            className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-colors disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
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
  cobrador,
  preseleccion,
  alumnoInicialDni,
  onClose,
  onSubmit,
  onConsultarPagos,
  onAsignarCredenciales,
}: {
  alumnos: Alumno[];
  planes: Plan[];
  pagos: Pago[];
  getEstadoCuenta: (alumnoId: string) => EstadoCuenta;
  cobrador: string;
  preseleccion: CobroPreseleccionado | null;
  alumnoInicialDni?: string;
  onClose: () => void;
  onSubmit: (pago: Omit<Pago, "id"> & { usuarioApp?: string; passwordApp?: string }) => Promise<ResultadoAgregarPago>;
  onConsultarPagos: () => Promise<boolean>;
  onAsignarCredenciales: (alumnoId: string, usuario: string, password: string) => Promise<void>;
}) {
  const primerAlumno =
    alumnos.find((a) => a.id === preseleccion?.alumnoId) ??
    (alumnoInicialDni ? alumnos.find((a) => a.dni === alumnoInicialDni) : undefined) ??
    alumnos[0];
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
  const mesesIniciales = preseleccion?.meses ?? 1;

  const [busquedaAlumno, setBusquedaAlumno] = useState("");
  const [esSeniaParcial, setEsSeniaParcial] = useState(false);
  const [montoSenia, setMontoSenia] = useState("");
  const [form, setForm] = useState({
    alumnoId: primerAlumno?.id ?? "",
    plan: inicial.planNombre,
    monto: inicial.planPrecio ? String(Number(inicial.planPrecio) * mesesIniciales) : "",
    fecha: fechaLocalHoy(),
    periodoMes: preseleccion?.periodo ?? mesActualISO(),
    cantidadMeses: mesesIniciales,
    metodo: "Efectivo",
    estado: "PAGADO" as EstadoPago,
  });

  const [celular, setCelular] = useState(primerAlumno?.celular ?? "");
  const [tipoMensaje, setTipoMensaje] = useState<"pago" | "bienvenida">("pago");
  const [usuarioApp, setUsuarioApp] = useState(() => sugerirUsuarioAlumno(primerAlumno));
  const [passwordApp, setPasswordApp] = useState("");
  const [errorValidacion, setErrorValidacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [incierto, setIncierto] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const enviando = useRef(false);
  const cerrar = () => { if (!enviando.current && !consultando) onClose(); };
  const consultar = async () => {
    if (consultando) return;
    setConsultando(true);
    try {
      if (await onConsultarPagos()) onClose();
      else setErrorValidacion("No pudimos actualizar los pagos. El resultado sigue sin confirmar; no vuelvas a cobrar todavía.");
    } catch {
      setErrorValidacion("No pudimos actualizar los pagos. El resultado sigue sin confirmar; no vuelvas a cobrar todavía.");
    } finally { setConsultando(false); }
  };

  const alumnosFiltrados = alumnos.filter(
    (a) =>
      !busquedaAlumno.trim() ||
      a.nombre.toLowerCase().includes(busquedaAlumno.trim().toLowerCase()) ||
      (a.dni && a.dni.includes(busquedaAlumno.trim()))
  );
  const alumnoSeleccionado = alumnos.find((a) => a.id === form.alumnoId);
  const estadoCuentaSeleccionado = form.alumnoId ? getEstadoCuenta(form.alumnoId) : "AL_DIA";

  const [cambiandoAlumno, setCambiandoAlumno] = useState(!preseleccion);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando.current || incierto) return;
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

    enviando.current = true;
    setGuardando(true);
    try {
    const resultado = await onSubmit({
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
    if (!resultado.ok) {
      setErrorValidacion(resultado.error);
      setIncierto(Boolean(resultado.esIncierto));
    }
    } catch {
      setErrorValidacion("No pudimos confirmar el resultado. Revisá los pagos antes de volver a cobrar.");
      setIncierto(true);
    } finally { enviando.current = false; setGuardando(false); }
  };

  const saldoSenia = Number(form.monto) - Number(montoSenia);
  const opcionesVigencia = OPCIONES_VIGENCIA_MESES.some((o) => o.value === form.cantidadMeses)
    ? OPCIONES_VIGENCIA_MESES
    : [...OPCIONES_VIGENCIA_MESES, { value: form.cantidadMeses, label: `${form.cantidadMeses} meses` }];
  const claseSegmento = (activo: boolean) =>
    `h-11 rounded-[10px] text-[15px] ${activo ? "bg-blue-600 font-bold text-white" : "font-semibold text-slate-300"}`;

  return (
    <div onClick={cerrar} className={claseFondoHoja}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-cobrar"
        onClick={(e) => e.stopPropagation()}
        className={claseHoja}
      >
        <div className="flex shrink-0 flex-col gap-1 px-5 pt-2.5">
          <span aria-hidden="true" className="h-[5px] w-11 self-center rounded-full bg-slate-700 md:hidden" />
          <div className="flex items-center justify-between">
            <h2 id="titulo-cobrar" className="text-[26px] font-extrabold uppercase text-white">Cobrar cuota</h2>
            <button type="button" onClick={cerrar} disabled={guardando || consultando} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 disabled:opacity-40">
              <X className="size-5" />
            </button>
          </div>
        </div>

        {alumnos.length === 0 ? (
          <div className="px-5 pb-8 pt-4 text-center">
            <p className="text-sm text-slate-400">
              Todavía no hay alumnos cargados. Agregá un alumno primero para poder registrarle un pago.
            </p>
            <Link href="/alumnos" className="mt-4 inline-flex h-11 items-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-500">
              Ir a Alumnos
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} aria-busy={guardando} className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-4 pt-2">
            <fieldset disabled={guardando || incierto} className="flex min-w-0 flex-col gap-4 border-0">
              {alumnoSeleccionado && (
                <div className="flex items-center gap-3 rounded-[14px] bg-[#0E1B36] p-3">
                  <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#1E3663] text-sm font-bold text-blue-200">
                    {inicialesDe(alumnoSeleccionado.nombre)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{alumnoSeleccionado.nombre}</p>
                    <p className="mt-0.5 truncate text-[13px] text-slate-400">
                      {form.plan || "Sin plan"}
                      <Separador />
                      {formatearMes(periodoInicioEfectivo)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCambiandoAlumno((v) => !v)}
                    aria-expanded={cambiandoAlumno}
                    className="h-11 shrink-0 rounded-lg border border-[#2A4677] px-2.5 text-[13px] font-semibold text-slate-300"
                  >
                    {cambiandoAlumno ? "Listo" : "Cambiar"}
                  </button>
                </div>
              )}

              {cambiandoAlumno && (
                <div className="flex flex-col gap-1.5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      aria-label="Buscar alumno"
                      value={busquedaAlumno}
                      onChange={(e) => setBusquedaAlumno(e.target.value)}
                      placeholder="Buscar alumno por nombre o DNI..."
                      className={`${claseCampoHoja} pl-9`}
                    />
                  </div>
                  {alumnosFiltrados.length === 0 ? (
                    <p className="py-2 text-center text-[13px] text-slate-500">No se encontraron alumnos con ese nombre o DNI</p>
                  ) : (
                    <select
                      aria-label="Alumno"
                      value={form.alumnoId}
                      onChange={(e) => handleAlumnoChange(e.target.value)}
                      className="w-full cursor-pointer rounded-xl border border-[#2A4677] bg-[#0E1B36] px-3 py-2 text-[15px] text-slate-100 outline-none focus:border-blue-400"
                      required
                      size={Math.min(Math.max(alumnosFiltrados.length, 2), 5)}
                    >
                      {alumnosFiltrados.map((a) => (
                        <option key={a.id} value={a.id} className="py-1">
                          {a.nombre} {a.dni ? `(${a.dni})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Asistente de imputación para socios MOROSOS */}
              {/* Si viene de la ficha, los meses ya se eligieron ahí */}
              {estadoCuentaSeleccionado === "MOROSO" && !(preseleccion?.periodo && preseleccion.alumnoId === form.alumnoId) && (
                <div className="flex flex-col gap-2 rounded-[14px] border border-amber-500/30 p-3">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-400">
                    <AlertCircle className="size-3.5 shrink-0" />
                    Socio moroso: elegí cómo imputar este cobro
                  </p>
                  {[
                    { periodo: mesAnterior, meses: 1, texto: `Saldar solo el mes adeudado (${formatearMes(mesAnterior)})` },
                    { periodo: mesAnterior, meses: 2, texto: "Ponerse al día: deuda + mes actual (2 meses)" },
                    { periodo: mesActual, meses: 1, texto: `Reactivar desde el mes actual (${formatearMes(mesActual)})` },
                  ].map((o) => {
                    const activo = form.periodoMes === o.periodo && form.cantidadMeses === o.meses;
                    return (
                      <button
                        key={o.texto}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => aplicarImputacionMoroso(o.periodo, o.meses)}
                        className={`min-h-11 rounded-xl border px-3 py-1.5 text-left text-[13px] font-semibold ${
                          activo ? "border-amber-400 bg-amber-500/15 text-white" : "border-[#2A4677] text-slate-300"
                        }`}
                      >
                        {o.texto}
                      </button>
                    );
                  })}
                </div>
              )}

              <div role="radiogroup" aria-label="Tipo de pago" className="grid shrink-0 grid-cols-2 gap-1.5 rounded-xl bg-[#0E1B36] p-1">
                <button type="button" role="radio" aria-checked={!esSeniaParcial} onClick={() => setEsSeniaParcial(false)} className={claseSegmento(!esSeniaParcial)}>
                  Pago completo
                </button>
                <button type="button" role="radio" aria-checked={esSeniaParcial} onClick={() => setEsSeniaParcial(true)} className={claseSegmento(esSeniaParcial)}>
                  Seña parcial
                </button>
              </div>

              <div>
                <label htmlFor="monto-cobro" className="mb-1.5 block text-[13px] font-semibold text-slate-400">
                  {esSeniaParcial ? "Entrega hoy" : "Importe"}
                </label>
                <div className="flex h-16 items-center gap-2 rounded-[14px] border-2 border-blue-600 bg-[#0E1B36] px-4">
                  <span aria-hidden="true" className="font-display text-4xl font-bold text-slate-500">$</span>
                  {esSeniaParcial ? (
                    <input
                      id="monto-cobro"
                      aria-label="Importe entregado hoy"
                      type="number"
                      inputMode="numeric"
                      value={montoSenia}
                      onChange={(e) => setMontoSenia(e.target.value)}
                      className={claseMontoGrande}
                    />
                  ) : (
                    <input
                      id="monto-cobro"
                      aria-label="Monto"
                      type="number"
                      inputMode="numeric"
                      value={form.monto}
                      onChange={(e) => setForm({ ...form, monto: e.target.value })}
                      className={claseMontoGrande}
                      required
                    />
                  )}
                </div>
                {esSeniaParcial && Number(montoSenia) > 0 && saldoSenia > 0 && (
                  <p className="mt-2 text-sm text-amber-400">
                    Queda saldo de ${saldoSenia.toLocaleString("es-AR")}
                    <Separador />
                    aparece en “Para resolver”
                  </p>
                )}
              </div>

              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-slate-400">Medio de pago</p>
                <div role="radiogroup" aria-label="Medio de pago" className="grid grid-cols-3 gap-2">
                  {["Efectivo", "Transferencia", "Tarjeta"].map((metodo) => (
                    <button
                      key={metodo}
                      type="button"
                      role="radio"
                      aria-checked={form.metodo === metodo}
                      onClick={() => setForm({ ...form, metodo })}
                      className={`h-[52px] rounded-xl text-sm ${
                        form.metodo === metodo
                          ? "border-2 border-blue-400 bg-[#1E3663] font-bold text-white"
                          : "border border-[#2A4677] font-semibold text-slate-300"
                      }`}
                    >
                      {metodo}
                    </button>
                  ))}
                </div>
              </div>

              {pagoSolapado && (
                <p className="flex gap-2 text-[13px] font-semibold text-amber-400">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Este socio ya registra un comprobante ({pagoSolapado.estado}) que cubre {pagoSolapado.periodoMes}. Para evitar cobros duplicados, elegí otro período o anulá el anterior.
                  </span>
                </p>
              )}

              {form.cantidadMeses > 1 && /^\d{4}-\d{2}$/.test(periodoInicioEfectivo) && (
                <p className="text-[13px] text-blue-300">
                  Cubre {form.cantidadMeses} meses: {formatearMes(periodoInicioEfectivo)} hasta {formatearMes(periodoFinEfectivo)} (próximo vencimiento: {calcularVencimientoCuota("AL_DIA", new Date(), periodoFinEfectivo)}).
                </p>
              )}

              <details className="group rounded-[14px] border border-[#2A4677]">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold text-slate-300">
                  Más datos del cobro
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="flex flex-col gap-3 border-t border-[#2A4677] p-3">
                  <Field label="Plan">
                    <input aria-label="Plan" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="Ej: Musculación" className={claseCampoHoja} />
                  </Field>
                  {esSeniaParcial && (
                    <Field label="Valor total cuota ($)">
                      <input aria-label="Monto" type="number" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} className={claseCampoHoja} required />
                    </Field>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Fecha de pago">
                      <input
                        aria-label="Fecha"
                        type="date"
                        value={form.fecha}
                        onChange={(e) => {
                          const nuevaFecha = e.target.value;
                          setForm((prev) => ({ ...prev, fecha: nuevaFecha, periodoMes: prev.periodoMes || nuevaFecha.slice(0, 7) }));
                        }}
                        className={claseCampoHoja}
                      />
                    </Field>
                    <Field label="Mes que abona">
                      <input aria-label="Mes que abona" type="month" value={form.periodoMes} onChange={(e) => setForm({ ...form, periodoMes: e.target.value })} className={claseCampoHoja} required />
                    </Field>
                    <Field label="Vigencia">
                      <select aria-label="Vigencia / Meses" value={form.cantidadMeses} onChange={(e) => handleCantidadMesesChange(Number(e.target.value))} className={claseCampoHoja}>
                        {opcionesVigencia.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Estado">
                      <select
                        disabled={esSeniaParcial}
                        value={esSeniaParcial ? "PARCIAL" : form.estado}
                        onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoPago })}
                        className={`${claseCampoHoja} disabled:opacity-60`}
                      >
                        <option value="PAGADO">Pagado</option>
                        {esSeniaParcial && <option value="PARCIAL">Seña parcial</option>}
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="VENCIDO">Vencido</option>
                      </select>
                    </Field>
                  </div>
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
                </div>
              </details>
            </fieldset>
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-[#2A4677] px-5 pb-6 pt-3">
              {errorValidacion && <p role="alert" className="text-[13px] font-semibold text-rose-400">{errorValidacion}</p>}
              <p className="text-[13px] text-slate-500">
                Cobra: {cobrador}
                <Separador />
                {form.fecha === fechaLocalHoy()
                  ? `Hoy ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`
                  : formatFechaAR(form.fecha)}
              </p>
              <button
                type="submit"
                disabled={guardando || incierto}
                className="min-h-14 rounded-[14px] bg-blue-600 px-3 text-[17px] font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
              >
                {guardando ? "Registrando…" : esSeniaParcial ? "Guardar seña parcial" : "Guardar pago"}
              </button>
              {incierto && (
                <button type="button" disabled={consultando} onClick={consultar} className="min-h-11 rounded-xl border border-[#2A4677] px-3 text-sm font-semibold text-slate-100 disabled:opacity-60">
                  {consultando ? "Consultando…" : "Consultar pagos registrados"}
                </button>
              )}
            </div>
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
          <p className="text-xs text-slate-400">
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
