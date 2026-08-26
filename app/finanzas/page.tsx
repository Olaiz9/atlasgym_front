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
} from "lucide-react";
import { soloLetras } from "@/lib/validators";

// ---------- Tipos ----------
type EstadoPago = "PAGADO" | "PENDIENTE" | "VENCIDO";

interface Pago {
  id: string;
  alumno: string;
  plan: string;
  monto: number;
  fecha: string; // "YYYY-MM-DD"
  metodo: string;
  estado: EstadoPago;
}

// ---------- Datos mock (reemplazar por fetch al backend) ----------
const PAGOS_MOCK: Pago[] = [
  { id: "1", alumno: "Lucía Fernández", plan: "Musculación", monto: 15000, fecha: "2026-08-20", metodo: "Transferencia", estado: "PAGADO" },
  { id: "2", alumno: "Martín Torres", plan: "Full Access", monto: 22000, fecha: "2026-08-18", metodo: "Efectivo", estado: "PAGADO" },
  { id: "3", alumno: "Sofía Ramírez", plan: "Funcional", monto: 18000, fecha: "2026-08-05", metodo: "Tarjeta", estado: "VENCIDO" },
  { id: "4", alumno: "Diego Castro", plan: "Musculación", monto: 15000, fecha: "2026-08-25", metodo: "-", estado: "PENDIENTE" },
  { id: "5", alumno: "Valentina Ríos", plan: "Full Access", monto: 22000, fecha: "2026-08-25", metodo: "-", estado: "PENDIENTE" },
  { id: "6", alumno: "Lucía Fernández", plan: "Musculación", monto: 15000, fecha: "2026-07-19", metodo: "Transferencia", estado: "PAGADO" },
  { id: "7", alumno: "Martín Torres", plan: "Full Access", monto: 22000, fecha: "2026-07-17", metodo: "Efectivo", estado: "PAGADO" },
];

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

function formatearMes(mesStr: string) {
  const [anio, mesNum] = mesStr.split("-").map(Number);
  const texto = new Date(anio, mesNum - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ---------- Componente principal ----------
export default function FinanzasPage() {
  const [pagos, setPagos] = useState<Pago[]>(PAGOS_MOCK);
  const [mes, setMes] = useState<string>("TODOS");
  const [filtro, setFiltro] = useState<EstadoPago | "TODOS">("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pagoAEliminar, setPagoAEliminar] = useState<Pago | null>(null);

  const mesesDisponibles = useMemo(() => {
    const set = new Set(pagos.map((p) => p.fecha.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [pagos]);

  const pagosDelMes = useMemo(() => {
    return pagos.filter((p) => mes === "TODOS" || p.fecha.slice(0, 7) === mes);
  }, [pagos, mes]);

  const metrica = useMemo(() => {
    const ingresosDelMes = pagosDelMes
      .filter((p) => p.estado === "PAGADO")
      .reduce((acc, p) => acc + p.monto, 0);
    const pendientes = pagosDelMes.filter((p) => p.estado === "PENDIENTE");
    const vencidos = pagosDelMes.filter((p) => p.estado === "VENCIDO");
    const morosos = new Set(vencidos.map((p) => p.alumno)).size;

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
      const coincideBusqueda = p.alumno
        .toLowerCase()
        .includes(busqueda.toLowerCase());
      return coincideFiltro && coincideBusqueda;
    });
  }, [pagosDelMes, filtro, busqueda]);

  const handleNuevoPago = (nuevo: Omit<Pago, "id">) => {
    setPagos((prev) => [{ ...nuevo, id: crypto.randomUUID() }, ...prev]);
    setModalAbierto(false);
  };

  const actualizarEstado = (id: string, nuevoEstado: EstadoPago) => {
    setPagos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p))
    );
  };

  const confirmarEliminar = () => {
    if (!pagoAEliminar) return;
    setPagos((prev) => prev.filter((p) => p.id !== pagoAEliminar.id));
    setPagoAEliminar(null);
  };

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10 md:py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Finanzas</h1>
          <p className="text-sm text-slate-400 mt-1">
            Seguimiento de pagos, cuotas pendientes y vencidas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="h-11 px-4 rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-700 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
          >
            <option value="TODOS">Todos los meses</option>
            {mesesDisponibles.map((m) => (
              <option key={m} value={m}>
                {formatearMes(m)}
              </option>
            ))}
          </select>
          <button
            onClick={() => setModalAbierto(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-blue-500/30 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Registrar pago
          </button>
        </div>
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={<DollarSign className="size-6" />}
          label="Ingresos del mes"
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
              {pagosFiltrados.map((pago) => (
                <tr
                  key={pago.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {pago.alumno}
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
                          actualizarEstado(pago.id, e.target.value as EstadoPago)
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
                      aria-label={`Eliminar pago de ${pago.alumno}`}
                      className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300 active:scale-90"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {pagosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No se encontraron pagos con ese criterio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAbierto && (
        <ModalRegistrarPago
          onClose={() => setModalAbierto(false)}
          onSubmit={handleNuevoPago}
        />
      )}

      {pagoAEliminar && (
        <ModalConfirmarEliminar
          pago={pagoAEliminar}
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
  onCancel,
  onConfirm,
}: {
  pago: Pago;
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
          Vas a eliminar el pago de <span className="font-semibold text-slate-700">{pago.alumno}</span> por{" "}
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

// ---------- Modal: registrar pago ----------
function ModalRegistrarPago({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (pago: Omit<Pago, "id">) => void;
}) {
  const [form, setForm] = useState({
    alumno: "",
    plan: "",
    monto: "",
    fecha: new Date().toISOString().slice(0, 10),
    metodo: "Efectivo",
    estado: "PAGADO" as EstadoPago,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.alumno || !form.monto) return;
    onSubmit({ ...form, monto: Number(form.monto) });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm text-slate-900 border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Registrar pago</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Alumno">
            <input
              value={form.alumno}
              onChange={(e) => setForm({ ...form, alumno: soloLetras(e.target.value) })}
              maxLength={60}
              className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Nombre y apellido"
              required
            />
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
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl transition-all duration-300 active:scale-95 mt-2"
          >
            Guardar pago
          </button>
        </form>
      </div>
    </div>
  );
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