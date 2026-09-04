// app/finanzas/page.tsx
"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { useAppData } from "@/lib/store";
import { EstadoPago, Pago, ESTADO_CUENTA_LABEL, ESTADO_CUENTA_STYLES, UsuarioSesion } from "@/lib/types";

const FILTROS: { label: string; value: EstadoPago | "TODOS" }[] = [
  { label: "Todos", value: "TODOS" },
  { label: "Pagados", value: "PAGADO" },
  { label: "Pendientes", value: "PENDIENTE" },
  { label: "Vencidos", value: "VENCIDO" },
];

const ESTADO_STYLES: Record<EstadoPago, string> = {
  PAGADO: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PENDIENTE: "bg-amber-50 text-amber-700 border border-amber-200",
  VENCIDO: "bg-red-50 text-red-700 border border-red-200",
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
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

// ---------- Vista dedicada para el Alumno (Mis Cuotas) ----------
function VistaCuotasAlumno({ usuario }: { usuario: UsuarioSesion }) {
  const { alumnos, getPagosDeAlumno, getEstadoCuenta } = useAppData();
  const [copiado, setCopiado] = useState(false);

  const alumno = alumnos.find((a) => a.id === usuario.alumnoId) || alumnos[0];
  const misPagos = alumno ? getPagosDeAlumno(alumno.id) : [];
  const estadoCuenta = alumno ? getEstadoCuenta(alumno.id) : "AL_DIA";

  const ultimoPago = misPagos[0];
  const planMonto = ultimoPago ? ultimoPago.monto : 15000;

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
          Portal del Alumno
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          Mis Cuotas y Pagos
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Hola, <strong className="text-white">{usuario.nombre}</strong>. Revisá el estado de tu suscripción en Atlas Gym y consultá los datos para abonar.
        </p>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Estado de Cuenta */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 text-slate-900">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado de mi cuota</p>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black ${
                ESTADO_CUENTA_STYLES[estadoCuenta]
              }`}
            >
              {ESTADO_CUENTA_LABEL[estadoCuenta]}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500 font-medium leading-relaxed">
            {estadoCuenta === "AL_DIA"
              ? "¡Estás al día! Tu acceso al gimnasio está completamente habilitado."
              : estadoCuenta === "PENDIENTE"
              ? "Tenés una cuota en proceso de pago para este mes."
              : "Tu cuota se encuentra vencida. Por favor regularizá para seguir entrenando."}
          </p>
        </div>

        {/* Plan Actual */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 text-slate-900">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mi Plan actual</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{alumno?.plan || "Musculación"}</p>
          <p className="mt-1 text-sm font-bold text-blue-600">
            ${planMonto.toLocaleString("es-AR")} <span className="text-xs text-slate-400 font-medium">/ mes</span>
          </p>
        </div>

        {/* Próximo Vencimiento */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 text-slate-900">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Próximo vencimiento</p>
          <p className="mt-2 text-2xl font-black text-slate-900">10 de Septiembre</p>
          <p className="mt-1 text-xs text-slate-400 font-medium">Las cuotas se abonan del 1 al 10 de cada mes</p>
        </div>
      </div>

      {/* Datos para pagar / Transferencia */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 md:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold mb-3 border border-blue-500/30">
              💳 Datos para abonar tu cuota
            </span>
            <h2 className="text-xl font-black">Transferencia Bancaria o Mercado Pago</h2>
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
              href={`https://wa.me/5492611234567?text=${encodeURIComponent(
                `Hola! Soy ${alumno?.nombre || "alumno"}, les adjunto mi comprobante de pago de la cuota.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-600/25 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 text-sm"
            >
              <MessageCircle className="w-5 h-5" />
              Enviar comprobante por WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Historial de mis pagos */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-slate-900 shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Historial de mis cuotas</h2>
            <p className="text-xs text-slate-500 mt-0.5">Registro histórico de tus pagos</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="font-bold px-6 py-3.5">Plan / Concepto</th>
                <th className="font-bold px-6 py-3.5">Monto</th>
                <th className="font-bold px-6 py-3.5">Fecha</th>
                <th className="font-bold px-6 py-3.5">Medio de pago</th>
                <th className="font-bold px-6 py-3.5">Estado</th>
              </tr>
            </thead>
            <tbody>
              {misPagos.map((pago) => (
                <tr key={pago.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">{pago.plan}</td>
                  <td className="px-6 py-4 font-black text-slate-900">
                    ${pago.monto.toLocaleString("es-AR")}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">
                    {new Date(pago.fecha).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{pago.metodo}</td>
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
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
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
  const { alumnos, pagos, agregarPago, actualizarEstadoPago, eliminarPago, getAlumno, usuarioActual } =
    useAppData();

  // Si el usuario conectado es un ALUMNO, le mostramos su vista privada de cuotas
  if (usuarioActual.rol === "ALUMNO") {
    return <VistaCuotasAlumno usuario={usuarioActual} />;
  }

  const [mes, setMes] = useState<string>(mesActualISO());
  const [verTodos, setVerTodos] = useState(false);
  const [filtro, setFiltro] = useState<EstadoPago | "TODOS">("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pagoAEliminar, setPagoAEliminar] = useState<Pago | null>(null);

  const pagosDelMes = useMemo(() => {
    if (verTodos) return pagos;
    return pagos.filter((p) => p.fecha.slice(0, 7) === mes);
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
    return pagosDelMes.filter((p) => {
      const coincideFiltro = filtro === "TODOS" || p.estado === filtro;
      const nombreAlumno = getAlumno(p.alumnoId)?.nombre ?? "";
      const coincideBusqueda = nombreAlumno
        .toLowerCase()
        .includes(busqueda.toLowerCase());
      return coincideFiltro && coincideBusqueda;
    });
  }, [pagosDelMes, filtro, busqueda, getAlumno]);

  const handleNuevoPago = (nuevo: Omit<Pago, "id">) => {
    agregarPago(nuevo);
    setModalAbierto(false);
  };

  const confirmarEliminar = () => {
    if (!pagoAEliminar) return;
    eliminarPago(pagoAEliminar.id);
    setPagoAEliminar(null);
  };

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10 md:py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Finanzas</h1>
            <p className="text-sm text-slate-400 mt-1">
              {verTodos
                ? "Viendo el historial completo de pagos."
                : `Viendo ${formatearMes(mes)} — cada mes arranca con una planilla limpia.`}
            </p>
          </div>
          <button
            onClick={() => setModalAbierto(true)}
            className="shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-blue-500/30 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Registrar pago
          </button>
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
            className="h-11 px-4 rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all duration-300 active:scale-95"
          >
            Mes actual
          </button>
          <button
            type="button"
            onClick={() => setVerTodos((v) => !v)}
            className={`h-11 px-4 rounded-full text-sm font-bold transition-all duration-300 active:scale-95 ${
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
          tint={{ bg: "bg-blue-50", text: "text-blue-600", bar: "bg-blue-600" }}
        />
        <MetricCard
          icon={<Clock className="size-6" />}
          label="Cuotas pendientes"
          value={`$${metrica.pendientesMonto.toLocaleString("es-AR")}`}
          sub={`${metrica.pendientesCount} cuotas`}
          tint={{ bg: "bg-amber-50", text: "text-amber-600", bar: "bg-amber-500" }}
        />
        <MetricCard
          icon={<AlertCircle className="size-6" />}
          label="Cuotas vencidas"
          value={`$${metrica.vencidosMonto.toLocaleString("es-AR")}`}
          sub={`${metrica.vencidosCount} cuotas`}
          tint={{ bg: "bg-rose-50", text: "text-rose-500", bar: "bg-rose-500" }}
        />
        <MetricCard
          icon={<Users className="size-6" />}
          label="Alumnos morosos"
          value={`${metrica.morosos}`}
          tint={{ bg: "bg-slate-100", text: "text-slate-600", bar: "bg-slate-400" }}
        />
      </div>

      {/* Tarjeta principal: filtros + tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-slate-100 bg-slate-50/60">
          <div className="flex gap-2 flex-wrap">
            {FILTROS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltro(f.value)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300 active:scale-95 ${
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
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar alumno..."
              className="pl-9 pr-4 h-10 text-sm bg-white border border-slate-200 rounded-full outline-none transition-all focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
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
              {pagosFiltrados.map((pago) => {
                const alumno = getAlumno(pago.alumnoId);
                return (
                  <tr
                    key={pago.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {alumno ? (
                        <Link href={`/alumnos/${alumno.id}`} className="hover:text-blue-600 hover:underline underline-offset-2">
                          {alumno.nombre}
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic font-medium">Alumno eliminado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{pago.plan}</td>
                    <td className="px-6 py-4 font-black text-slate-900">
                      ${pago.monto.toLocaleString("es-AR")}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {new Date(pago.fecha).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{pago.metodo}</td>
                    <td className="px-6 py-4">
                      <div className="relative inline-block">
                        <select
                          value={pago.estado}
                          onChange={(e) =>
                            actualizarEstadoPago(pago.id, e.target.value as EstadoPago)
                          }
                          className={`appearance-none cursor-pointer pl-2.5 pr-6 py-1 rounded-full text-xs font-bold outline-none transition-colors ${ESTADO_STYLES[pago.estado]}`}
                        >
                          <option value="PAGADO">PAGADO</option>
                          <option value="PENDIENTE">PENDIENTE</option>
                          <option value="VENCIDO">VENCIDO</option>
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setPagoAEliminar(pago)}
                        aria-label={`Eliminar pago de ${alumno?.nombre ?? "alumno"}`}
                        className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300 active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {pagosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                    {verTodos
                      ? "No se encontraron pagos con ese criterio."
                      : `Todavía no hay pagos registrados en ${formatearMes(mes)}. Arrancá agregando el primero.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAbierto && (
        <ModalRegistrarPago
          alumnos={alumnos}
          onClose={() => setModalAbierto(false)}
          onSubmit={handleNuevoPago}
        />
      )}

      {pagoAEliminar && (
        <ModalConfirmarEliminar
          pago={pagoAEliminar}
          nombreAlumno={getAlumno(pagoAEliminar.alumnoId)?.nombre ?? "este alumno"}
          onCancel={() => setPagoAEliminar(null)}
          onConfirm={confirmarEliminar}
        />
      )}
    </div>
  );
}

// ---------- Tarjeta de métrica ----------
function MetricCard({
  icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tint: { bg: string; text: string; bar: string };
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-slate-900 border border-slate-200 cursor-default">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">{value}</p>
          {sub && <p className="mt-3 text-xs font-bold text-slate-400">{sub}</p>}
        </div>
        <div className={`flex size-12 items-center justify-center rounded-2xl ${tint.bg} ${tint.text} transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 h-1.5 w-full ${tint.bar}`} />
    </article>
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
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl text-slate-900 border border-slate-200 w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4">
          <Trash2 className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">¿Eliminar este pago?</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Vas a eliminar el pago de <span className="font-semibold text-slate-700">{nombreAlumno}</span> por{" "}
          <span className="font-semibold text-slate-700">${pago.monto.toLocaleString("es-AR")}</span>. Esta acción no se puede deshacer.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all duration-300 active:scale-95"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="h-11 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-500 transition-all duration-300 active:scale-95"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Helpers de WhatsApp ----------
function construirLinkWhatsapp(celular: string, mensaje: string) {
  let numero = celular.replace(/\D/g, "");
  // Heurística para celulares argentinos sin código de país (10 dígitos locales)
  if (numero.length === 10) numero = `549${numero}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

function mensajePagoTemplate(nombre: string, plan: string, monto: string) {
  const montoFmt = monto ? `$${Number(monto).toLocaleString("es-AR")}` : "$0";
  return `Hola ${nombre || "!"}! ✅ Registramos tu pago de ${montoFmt} correspondiente al plan ${plan || "tu plan"} en ATLAS. ¡Gracias por seguir entrenando con nosotros! 💪`;
}

function mensajeBienvenidaTemplate(nombre: string, usuario: string, password: string) {
  return `Hola ${nombre || "!"}! 🎉 Ya sos parte de ATLAS. Estos son tus datos de acceso a la app:\n\nUsuario: ${usuario || "-"}\nContraseña: ${password || "-"}\n\nPor seguridad te recomendamos cambiarla apenas ingreses. ¡Nos vemos en el gym! 💪`;
}

function generarPassword() {
  return Math.random().toString(36).slice(-8);
}

// ---------- Modal: registrar pago ----------
function ModalRegistrarPago({
  alumnos,
  onClose,
  onSubmit,
}: {
  alumnos: { id: string; nombre: string }[];
  onClose: () => void;
  onSubmit: (pago: Omit<Pago, "id">) => void;
}) {
  const [form, setForm] = useState({
    alumnoId: alumnos[0]?.id ?? "",
    plan: "",
    monto: "",
    fecha: new Date().toISOString().slice(0, 10),
    metodo: "Efectivo",
    estado: "PAGADO" as EstadoPago,
  });

  const [celular, setCelular] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<"pago" | "bienvenida">("pago");
  const [usuarioApp, setUsuarioApp] = useState("");
  const [passwordApp, setPasswordApp] = useState("");
  const [mensaje, setMensaje] = useState("");

  const alumnoSeleccionado = alumnos.find((a) => a.id === form.alumnoId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.alumnoId || !form.monto) return;
    onSubmit({ ...form, monto: Number(form.monto) });
  };

  const generarMensaje = () => {
    const texto =
      tipoMensaje === "pago"
        ? mensajePagoTemplate(alumnoSeleccionado?.nombre ?? "", form.plan, form.monto)
        : mensajeBienvenidaTemplate(alumnoSeleccionado?.nombre ?? "", usuarioApp, passwordApp);
    setMensaje(texto);
  };

  const puedeEnviar = celular.replace(/\D/g, "").length >= 10 && mensaje.trim().length > 0;

  const enviarWhatsapp = () => {
    if (!puedeEnviar) return;
    window.open(construirLinkWhatsapp(celular, mensaje), "_blank");
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm text-slate-900 border border-slate-200 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Registrar pago</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {alumnos.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500">
              Todavía no hay alumnos cargados. Agregá un alumno primero para poder registrarle un pago.
            </p>
            <Link
              href="/alumnos"
              className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold h-10 px-5 rounded-xl transition-colors"
            >
              Ir a Alumnos
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Alumno">
              <select
                value={form.alumnoId}
                onChange={(e) => setForm({ ...form, alumnoId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              >
                {alumnos.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </Field>

            <Field label="Plan">
              <input
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Ej: Musculación"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Monto">
                <input
                  type="number"
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="$"
                  required
                />
              </Field>
              <Field label="Fecha">
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Método">
                <select
                  value={form.metodo}
                  onChange={(e) => setForm({ ...form, metodo: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option>Efectivo</option>
                  <option>Transferencia</option>
                  <option>Tarjeta</option>
                </select>
              </Field>
              <Field label="Estado">
                <select
                  value={form.estado}
                  onChange={(e) =>
                    setForm({ ...form, estado: e.target.value as EstadoPago })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="PAGADO">Pagado</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="VENCIDO">Vencido</option>
                </select>
              </Field>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl transition-all duration-300 active:scale-95"
            >
              Guardar pago
            </button>

            {/* ---------- Notificación por WhatsApp ---------- */}
            <div className="border-t border-slate-100 pt-4 mt-2 space-y-4">
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                Notificar por WhatsApp (opcional)
              </p>

              <Field label="Celular del alumno">
                <input
                  type="tel"
                  inputMode="numeric"
                  value={celular}
                  onChange={(e) => setCelular(soloNumerosLocal(e.target.value).slice(0, 13))}
                  maxLength={13}
                  className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ej. 2611234567 o 5492611234567"
                />
              </Field>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTipoMensaje("pago")}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                    tipoMensaje === "pago"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Confirmación de pago
                </button>
                <button
                  type="button"
                  onClick={() => setTipoMensaje("bienvenida")}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                    tipoMensaje === "bienvenida"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Primera inscripción
                </button>
              </div>

              {tipoMensaje === "bienvenida" && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Usuario">
                    <input
                      value={usuarioApp}
                      onChange={(e) => setUsuarioApp(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Ej. lucia.fernandez"
                    />
                  </Field>
                  <Field label="Contraseña">
                    <div className="flex gap-1.5">
                      <input
                        value={passwordApp}
                        onChange={(e) => setPasswordApp(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Generala"
                      />
                      <button
                        type="button"
                        onClick={() => setPasswordApp(generarPassword())}
                        className="px-3 rounded-xl bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 transition-colors active:scale-95 shrink-0"
                      >
                        Generar
                      </button>
                    </div>
                  </Field>
                </div>
              )}

              <Field label="Mensaje">
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  rows={4}
                  className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  placeholder="Generá el mensaje o escribí uno propio..."
                />
              </Field>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={generarMensaje}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-all duration-300 active:scale-95"
                >
                  Generar mensaje
                </button>
                <button
                  type="button"
                  onClick={enviarWhatsapp}
                  disabled={!puedeEnviar}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-all duration-300 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar por WhatsApp
                </button>
              </div>
            </div>
          </form>
        )}
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
      <span className="text-xs font-medium text-slate-500 mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}
