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
  Trash2,
  MessageCircle,
  Download,
} from "lucide-react";
import Link from "next/link";
import { useAppData } from "@/lib/store";
import { formatFechaAR, calcularVencimientoCuota, fechaLocalHoy, periodoMesActual } from "@/lib/date-utils";
import { CONTACTO_ATLAS } from "@/lib/constants";
import { EstadoPago, Pago, ESTADO_CUENTA_LABEL, ESTADO_CUENTA_STYLES, UsuarioSesion, Alumno, Plan } from "@/lib/types";
import { construirLinkWhatsapp } from "@/lib/validators";
import { MetricCard } from "@/components/ui/metric-card";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/lib/use-debounce";
import { descargarCSV } from "@/lib/export-utils";

const FILTROS: { label: string; value: EstadoPago | "TODOS" }[] = [
  { label: "Todos", value: "TODOS" },
  { label: "Pagados", value: "PAGADO" },
  { label: "Pendientes", value: "PENDIENTE" },
  { label: "Vencidos", value: "VENCIDO" },
];

const ESTADO_STYLES: Record<EstadoPago, string> = {
  PAGADO: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  PENDIENTE: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  VENCIDO: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
};

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

  const misPagos = getPagosDeAlumno(alumno.id);
  const estadoCuenta = getEstadoCuenta(alumno.id);

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
    <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-10 md:py-10 space-y-8">
      {/* Header Alumno */}
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

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Estado de Cuenta */}
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
              ? "Tenés una cuota en proceso de pago para este mes."
              : estadoCuenta === "MOROSO"
              ? "Tu cuota se encuentra vencida. Por favor regularizá para seguir entrenando."
              : "Tu membresía se encuentra inactiva. Acercate a recepción para regularizar tu cuenta."}
          </p>
        </div>

        {/* Plan Actual */}
        <div className="rounded-2xl bg-slate-900/60 p-6 shadow-sm border border-slate-800 text-slate-100 backdrop-blur-md">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mi plan actual</p>
          <p className="mt-2 text-2xl font-black text-white">{alumno?.plan || "Musculación"}</p>
          <p className="mt-1 text-sm font-bold text-blue-400">
            ${planMonto.toLocaleString("es-AR")} <span className="text-xs text-slate-500 font-medium">/ mes</span>
          </p>
        </div>

        {/* Próximo Vencimiento */}
        <div className="rounded-2xl bg-slate-900/60 p-6 shadow-sm border border-slate-800 text-slate-100 backdrop-blur-md">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Próximo vencimiento</p>
          <p className="mt-2 text-2xl font-black text-white">
            {calcularVencimientoCuota(
              estadoCuenta,
              new Date(),
              ultimoPago?.periodoMes || ultimoPago?.fecha?.slice(0, 7)
            )}
          </p>
          <p className="mt-1 text-xs text-slate-500 font-medium">Las cuotas se abonan del 1 al 10 de cada mes</p>
        </div>
      </div>

      {/* Datos para pagar / Transferencia */}
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
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-600/25 transition-[color,background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 active:scale-95 text-sm"
            >
              <MessageCircle className="w-5 h-5" />
              Enviar comprobante por WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Historial de mis pagos */}
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
              {misPagos.map((pago) => (
                <tr key={pago.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">{pago.plan}</td>
                  <td className="px-6 py-4 font-black text-white">
                    ${pago.monto.toLocaleString("es-AR")}
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
                      {pago.estado}
                    </span>
                  </td>
                </tr>
              ))}
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
    eliminarPago,
    asignarCredencialesAlumno,
    getAlumno,
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
  const [pagoAEliminar, setPagoAEliminar] = useState<Pago | null>(null);

  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina, setElementosPorPagina] = useState(15);

  const pagosDelMes = useMemo(() => {
    if (verTodos) return pagos;
    return pagos.filter((p) => (p.periodoMes || p.fecha.slice(0, 7)) === mes);
  }, [pagos, mes, verTodos]);

  const metrica = useMemo(() => {
    const ingresosDelMes = pagosDelMes
      .filter((p) => p.estado === "PAGADO")
      .reduce((acc, p) => acc + p.monto, 0);
    const pendientes = pagosDelMes.filter((p) => p.estado === "PENDIENTE");
    const vencidos = pagosDelMes.filter((p) => p.estado === "VENCIDO");
    const morosos = new Set(vencidos.map((p) => p.alumnoId)).size;

    return {
      ingresosDelMes,
      pendientesMonto: pendientes.reduce((acc, p) => acc + p.monto, 0),
      pendientesCount: pendientes.length,
      vencidosMonto: vencidos.reduce((acc, p) => acc + p.monto, 0),
      vencidosCount: vencidos.length,
      morosos,
    };
  }, [pagosDelMes]);

  const pagosFiltrados = useMemo(() => {
    const q = busquedaDebounced.trim().toLowerCase();
    return pagosDelMes.filter((p) => {
      const coincideFiltro = filtro === "TODOS" || p.estado === filtro;
      const coincideMetodo = filtroMetodo === "TODOS" || p.metodo.toLowerCase() === filtroMetodo.toLowerCase();
      const nombreAlumno = getAlumno(p.alumnoId)?.nombre ?? p.alumnoNombreHistorico ?? "";
      const coincideBusqueda =
        !q ||
        nombreAlumno.toLowerCase().includes(q) ||
        p.plan.toLowerCase().includes(q) ||
        p.metodo.toLowerCase().includes(q);
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

  // Soporte para cerrar modales con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalAbierto(false);
        setPagoAEliminar(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!usuarioActual) {
    return null;
  }

  // Si el usuario conectado es un ALUMNO, le mostramos su vista privada de cuotas
  if (usuarioActual.rol === "ALUMNO") {
    return <VistaCuotasAlumno usuario={usuarioActual} />;
  }

  const exportarCSVFinanzas = () => {
    const encabezados = [
      "ID",
      "Alumno",
      "Plan",
      "Monto",
      "Fecha Pago",
      "Periodo Mes",
      "Método",
      "Estado",
    ];
    const filas = pagosDelMes.map((p) => {
      const alumno = getAlumno(p.alumnoId);
      const nombre = alumno?.nombre ?? p.alumnoNombreHistorico ?? "Desconocido";
      return [
        p.id,
        nombre,
        p.plan,
        p.monto.toString(),
        p.fecha,
        p.periodoMes || p.fecha.slice(0, 7),
        p.metodo,
        p.estado,
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
    } else {
      toast("Pago registrado con éxito", "success");
    }
  };

  const confirmarEliminar = () => {
    if (!pagoAEliminar) return;
    eliminarPago(pagoAEliminar.id);
    setPagoAEliminar(null);
    toast("Pago eliminado del registro", "info");
  };

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10 md:py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Finanzas</h1>
            <p className="text-sm text-slate-400 mt-1">
              {verTodos
                ? "Viendo el historial completo de pagos."
                : `Viendo ${formatearMes(mes)} — cada mes arranca con una planilla limpia.`}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={exportarCSVFinanzas}
              title="Exportar planilla actual a archivo CSV / Excel"
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
          label={verTodos ? "Ingresos totales" : "Ingresos del mes"}
          value={`$${metrica.ingresosDelMes.toLocaleString("es-AR")}`}
          tint={{ bg: "bg-blue-500/15 border border-blue-500/30", text: "text-blue-400", bar: "bg-blue-500" }}
        />
        <MetricCard
          icon={<Clock className="size-6" />}
          label="Cuotas pendientes"
          value={`$${metrica.pendientesMonto.toLocaleString("es-AR")}`}
          sub={`${metrica.pendientesCount} cuotas`}
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
          label="Alumnos morosos"
          value={`${metrica.morosos}`}
          tint={{ bg: "bg-slate-800 border border-slate-700", text: "text-slate-400", bar: "bg-slate-600" }}
        />
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

            {/* Filtro por método de pago */}
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
                <th className="font-bold px-6 py-3.5">Monto</th>
                <th className="font-bold px-6 py-3.5">Fecha</th>
                <th className="font-bold px-6 py-3.5">Método</th>
                <th className="font-bold px-6 py-3.5">Estado</th>
                <th className="font-bold px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagosPaginados.map((pago) => {
                const alumno = getAlumno(pago.alumnoId);
                return (
                  <tr
                    key={pago.id}
                    className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/40 transition-colors"
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
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium">{pago.plan}</td>
                    <td className="px-6 py-4 font-black text-white">
                      ${pago.monto.toLocaleString("es-AR")}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium">
                      {formatFechaAR(pago.fecha)}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium">{pago.metodo}</td>
                    <td className="px-6 py-4">
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
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setPagoAEliminar(pago)}
                        aria-label={`Eliminar pago de ${alumno?.nombre ?? "alumno"}`}
                        className="p-2 rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors duration-150 active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
          onClose={() => setModalAbierto(false)}
          onSubmit={handleNuevoPago}
          onAsignarCredenciales={asignarCredencialesAlumno}
        />
      )}

      {pagoAEliminar && (
        <ModalConfirmarEliminar
          pago={pagoAEliminar}
          nombreAlumno={getAlumno(pagoAEliminar.alumnoId)?.nombre ?? pagoAEliminar.alumnoNombreHistorico ?? "este alumno"}
          onCancel={() => setPagoAEliminar(null)}
          onConfirm={confirmarEliminar}
        />
      )}
    </div>
  );
}


// ---------- Modal: confirmar eliminación ----------
function ModalConfirmarEliminar({
  pago,
  nombreAlumno,
  onCancel,
  onConfirm,
}: {
  pago: Pago;
  nombreAlumno: string;
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
        <h2 className="text-lg font-black text-white">¿Eliminar este pago?</h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Vas a eliminar el pago de <span className="font-semibold text-white">{nombreAlumno}</span> por{" "}
          <span className="font-semibold text-emerald-400">${pago.monto.toLocaleString("es-AR")}</span>. Esta acción no se puede deshacer.
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
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Helpers de WhatsApp ----------
function mensajePagoTemplate(nombre: string, plan: string, monto: string) {
  const montoFmt = monto ? `$${Number(monto).toLocaleString("es-AR")}` : "$0";
  return `Hola ${nombre || "!"}! ✅ Registramos tu pago de ${montoFmt} correspondiente al plan ${plan || "tu plan"} en ATLAS. ¡Gracias por seguir entrenando con nosotros! 💪`;
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

  // Fisher-Yates shuffle con entropía criptográfica
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
  if (alumno.email && alumno.email.includes("@")) {
    return alumno.email.split("@")[0].trim().toLowerCase();
  }
  const baseNombre = alumno.nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)[0]
    .replace(/[^a-z0-9]/g, "");
  const sufijoDni = alumno.dni ? alumno.dni.replace(/\D/g, "").slice(-2) : "";
  return `${baseNombre}${sufijoDni}`;
}

// ---------- Modal: registrar pago ----------
function ModalRegistrarPago({
  alumnos,
  planes,
  onClose,
  onSubmit,
  onAsignarCredenciales,
}: {
  alumnos: Alumno[];
  planes: Plan[];
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
  const [form, setForm] = useState({
    alumnoId: primerAlumno?.id ?? "",
    plan: inicial.planNombre,
    monto: inicial.planPrecio,
    fecha: fechaLocalHoy(),
    periodoMes: mesActualISO(),
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
    }));
    setCelular(alumno.celular ?? "");
    setUsuarioApp(sugerirUsuarioAlumno(alumno));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = Number(form.monto);
    if (!form.alumnoId) {
      setErrorValidacion("Seleccioná un alumno");
      return;
    }
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorValidacion("El monto debe ser un valor numérico mayor a 0");
      return;
    }
    if (!form.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(form.fecha)) {
      setErrorValidacion("Ingresá una fecha válida (YYYY-MM-DD)");
      return;
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
      planId: planObj?.id ?? alumnoSeleccionado?.planId,
      monto: montoNum,
      periodoMes: form.periodoMes || form.fecha.slice(0, 7),
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
                      {a.nombre} {a.dni ? `(${a.dni})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </Field>

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
              <Field label="Monto">
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
                  value={form.estado}
                  onChange={(e) =>
                    setForm({ ...form, estado: e.target.value as EstadoPago })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-sm"
                >
                  <option value="PAGADO" className="bg-slate-900 text-white">Pagado</option>
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
              Guardar pago
            </button>

            {/* ---------- Notificación por WhatsApp ---------- */}
            <SeccionNotificarWhatsapp
              alumnoId={form.alumnoId}
              alumnoNombre={alumnoSeleccionado?.nombre ?? ""}
              plan={form.plan}
              monto={form.monto}
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

  const generarMensaje = () => {
    const texto =
      tipoMensaje === "pago"
        ? mensajePagoTemplate(alumnoNombre, plan, monto)
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
    window.open(construirLinkWhatsapp(celular, mensaje), "_blank");
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
                placeholder="Ej. lucia.fernandez"
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={generarMensaje}
          className="flex-1 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 text-sm font-semibold hover:bg-slate-800 hover:text-white transition-[color,background-color] duration-200 active:scale-95"
        >
          Generar mensaje
        </button>
        <button
          type="button"
          onClick={enviarWhatsapp}
          disabled={!puedeEnviar}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-[color,background-color] duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
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
