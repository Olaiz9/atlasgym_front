// app/alumnos/page.tsx
"use client";

import { useState, useMemo } from "react";
import { Users, UserCheck, UserX, AlertCircle, Clock, Dumbbell, Plus, X, Search, Trash2, Pencil, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useAppData } from "@/lib/store";
import { soloLetras } from "@/lib/validators";
import {
  Alumno,
  EstadoCuenta,
  ESTADO_CUENTA_LABEL,
  ESTADO_CUENTA_STYLES,
  Plan,
} from "@/lib/types";

function formatDiasIngreso(fecha: string) {
  const diffMs = Date.now() - new Date(fecha).getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDias === 0) return "Hoy";
  if (diffDias === 1) return "Ayer";
  if (diffDias <= 7) return `Hace ${diffDias} días`;
  return new Date(fecha).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

const FILTROS_ALUMNOS: { label: string; value: EstadoCuenta | "TODOS" }[] = [
  { label: "Todos", value: "TODOS" },
  { label: "Al día", value: "AL_DIA" },
  { label: "Pendientes", value: "PENDIENTE" },
  { label: "Morosos", value: "MOROSO" },
  { label: "Inactivos (+60d)", value: "INACTIVO" },
];

export default function AlumnosPage() {
  const { alumnos, agregarAlumno, actualizarAlumno, eliminarAlumno, getEstadoCuenta, getPagosDeAlumno, planes } =
    useAppData();

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
    const alDia = alumnosConEstado.filter((a) => a.estadoCuenta === "AL_DIA").length;
    const morosos = alumnosConEstado.filter((a) => a.estadoCuenta === "MOROSO").length;
    const inactivos = alumnosConEstado.filter((a) => a.estadoCuenta === "INACTIVO").length;
    return { total: alumnosConEstado.length, alDia, morosos, inactivos };
  }, [alumnosConEstado]);

  const alumnosFiltrados = useMemo(() => {
    return alumnosConEstado.filter((a) => {
      const coincideFiltro = filtro === "TODOS" || a.estadoCuenta === filtro;
      const coincideBusqueda = a.nombre.toLowerCase().includes(busqueda.toLowerCase());
      return coincideFiltro && coincideBusqueda;
    });
  }, [alumnosConEstado, filtro, busqueda]);

  const handleNuevoAlumno = (nuevo: Omit<Alumno, "id">) => {
    agregarAlumno(nuevo);
    setModalAbierto(false);
  };

  const confirmarEliminar = () => {
    if (!alumnoAEliminar) return;
    eliminarAlumno(alumnoAEliminar.id);
    setAlumnoAEliminar(null);
  };

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
        <button
          onClick={() => setModalAbierto(true)}
          className="shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-blue-500/30 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Agregar alumno
        </button>
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
                <th className="font-bold px-6 py-3.5">Rutina</th>
                <th className="font-bold px-6 py-3.5">Último ingreso</th>
                <th className="font-bold px-6 py-3.5">Estado de cuenta</th>
                <th className="font-bold px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alumnosFiltrados.map((alumno) => (
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
                      onClick={() => setAlumnoAEditar(alumno)}
                      aria-label={`Editar a ${alumno.nombre}`}
                      className="p-2 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 active:scale-90"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setAlumnoAEliminar(alumno)}
                      aria-label={`Eliminar a ${alumno.nombre}`}
                      className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300 active:scale-90"
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
      </div>

      {modalAbierto && (
        <ModalNuevoAlumno
          planes={planes}
          onClose={() => setModalAbierto(false)}
          onSubmit={handleNuevoAlumno}
        />
      )}

      {alumnoAEditar && (
        <ModalEditarAlumno
          alumno={alumnoAEditar}
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

// ---------- Tarjeta de métrica ----------
function MetricCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: { bg: string; text: string; bar: string };
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-slate-900 border border-slate-200 cursor-default">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">{value}</p>
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
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl text-slate-900 border border-slate-200 w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-300">
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

// ---------- Modal: nuevo alumno ----------
function ModalNuevoAlumno({
  planes,
  onClose,
  onSubmit,
}: {
  planes: Plan[];
  onClose: () => void;
  onSubmit: (alumno: Omit<Alumno, "id">) => void;
}) {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    celular: "",
    plan: "",
    fechaAlta: new Date().toISOString().slice(0, 10),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    onSubmit({ ...form, activo: true });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm text-slate-900 border border-slate-200 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Agregar alumno</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre y apellido">
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: soloLetras(e.target.value) })}
              maxLength={60}
              className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Nombre y apellido"
              required
              autoFocus
            />
          </Field>

          <Field label="Plan asignado">
            <select
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              required
            >
              <option value="">Seleccionar un plan...</option>
              {planes.map((p) => (
                <option key={p.id} value={p.nombre}>
                  {p.nombre} — ${p.precio.toLocaleString("es-AR")}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="nombre@mail.com"
              />
            </Field>
            <Field label="Celular">
              <input
                type="tel"
                inputMode="numeric"
                value={form.celular}
                onChange={(e) =>
                  setForm({ ...form, celular: e.target.value.replace(/[^0-9]/g, "").slice(0, 13) })
                }
                className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="2611234567"
              />
            </Field>
          </div>

          <Field label="Fecha de alta">
            <input
              type="date"
              value={form.fechaAlta}
              onChange={(e) => setForm({ ...form, fechaAlta: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </Field>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl transition-all duration-300 active:scale-95"
          >
            Guardar alumno
          </button>
        </form>
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

// ---------- Modal: editar alumno ----------
function ModalEditarAlumno({
  alumno,
  planes,
  onClose,
  onSubmit,
}: {
  alumno: Alumno;
  planes: Plan[];
  onClose: () => void;
  onSubmit: (cambios: Partial<Omit<Alumno, "id">>) => void;
}) {
  const [form, setForm] = useState({
    nombre: alumno.nombre,
    email: alumno.email || "",
    celular: alumno.celular || "",
    plan: alumno.plan,
    activo: alumno.activo,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm text-slate-900 border border-slate-200 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold">Editar alumno</h2>
            <p className="text-sm text-slate-500 mt-0.5">Modificá los datos de {alumno.nombre}.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre y apellido">
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: soloLetras(e.target.value) })}
              maxLength={60}
              className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Nombre y apellido"
              required
              autoFocus
            />
          </Field>

          <Field label="Plan asignado">
            <select
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              required
            >
              {planes.map((p) => (
                <option key={p.id} value={p.nombre}>
                  {p.nombre} — ${p.precio.toLocaleString("es-AR")}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="nombre@mail.com"
              />
            </Field>
            <Field label="Celular">
              <input
                type="tel"
                inputMode="numeric"
                value={form.celular}
                onChange={(e) =>
                  setForm({ ...form, celular: e.target.value.replace(/[^0-9]/g, "").slice(0, 13) })
                }
                className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="2611234567"
              />
            </Field>
          </div>

          <Field label="Estado">
            <div className="flex gap-3 mt-1">
              <button
                type="button"
                onClick={() => setForm({ ...form, activo: true })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 active:scale-95 ${
                  form.activo
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                Activo
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, activo: false })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 active:scale-95 ${
                  !form.activo
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                Inactivo
              </button>
            </div>
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all duration-300 active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all duration-300 active:scale-95"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
