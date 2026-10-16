// components/modal-editar-alumno.tsx
"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { Alumno, Plan } from "@/lib/types";
import { soloLetras, soloNumeros, validarDatosAlumno } from "@/lib/validators";
import { filtrarPlanesDisponibles } from "@/lib/plan-utils";
import { useEscapeKey } from "@/lib/use-escape-key";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

interface ModalEditarAlumnoProps {
  alumno: Alumno;
  alumnos: Alumno[];
  planes: Plan[];
  onClose: () => void;
  onSubmit: (cambios: Partial<Omit<Alumno, "id">>) => void;
}

export function ModalEditarAlumno({
  alumno,
  alumnos,
  planes,
  onClose,
  onSubmit,
}: ModalEditarAlumnoProps) {
  useEscapeKey(onClose);

  const [form, setForm] = useState({
    nombre: alumno.nombre,
    dni: alumno.dni || "",
    email: alumno.email || "",
    celular: alumno.celular || "",
    planId: alumno.planId || planes.find((p) => p.nombre === alumno.plan)?.id || "",
    plan: alumno.plan,
    activo: alumno.activo,
  });
  const [errores, setErrores] = useState<Record<string, string>>({});

  const planesDisponibles = useMemo(() => {
    return filtrarPlanesDisponibles(planes, alumno.planId, alumno.plan);
  }, [planes, alumno.planId, alumno.plan]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevosErrores = validarDatosAlumno(form, false, alumnos, alumno.id);
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }
    onSubmit(form);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl text-slate-900 border border-slate-200 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold">Editar alumno</h2>
            <p className="text-sm text-slate-500 mt-0.5">Modifica los datos de {alumno.nombre}.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-slate-600 transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre y apellido">
            <input
              aria-label="Nombre y apellido"
              autoFocus
              value={form.nombre}
              onChange={(e) => {
                setForm({ ...form, nombre: soloLetras(e.target.value) });
                if (errores.nombre) setErrores((prev) => ({ ...prev, nombre: "" }));
              }}
              maxLength={60}
              className={`w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm ${errores.nombre ? "border border-rose-400" : ""}`}
              placeholder="Nombre y apellido"
              required
            />
            {errores.nombre && <span className="text-xs font-semibold text-rose-500 mt-1 block">{errores.nombre}</span>}
          </Field>

          <Field label="DNI">
            <input
              aria-label="DNI"
              value={form.dni}
              onChange={(e) => {
                setForm({ ...form, dni: soloNumeros(e.target.value).slice(0, 8) });
                if (errores.dni) setErrores((prev) => ({ ...prev, dni: "" }));
              }}
              maxLength={8}
              className={`w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm ${errores.dni ? "border border-rose-400" : ""}`}
              placeholder="Ej. 41234567"
            />
            {errores.dni && <span className="text-xs font-semibold text-rose-500 mt-1 block">{errores.dni}</span>}
          </Field>

          <Field label="Plan asignado">
            <select
              aria-label="Plan asignado"
              value={form.planId || form.plan}
              onChange={(e) => {
                const planObj = planes.find((p) => p.id === e.target.value || p.nombre === e.target.value);
                setForm({
                  ...form,
                  planId: planObj?.id || e.target.value,
                  plan: planObj?.nombre || e.target.value,
                });
                if (errores.plan) setErrores((prev) => ({ ...prev, plan: "" }));
              }}
              className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              required
            >
              {planesDisponibles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — ${p.precio.toLocaleString("es-AR")}{!p.activo ? " (Pausado)" : ""}
                </option>
              ))}
            </select>
            {errores.plan && <span className="text-xs font-semibold text-rose-500 mt-1 block">{errores.plan}</span>}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <input
                aria-label="Email"
                type="email"
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  if (errores.email) setErrores((prev) => ({ ...prev, email: "" }));
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm ${errores.email ? "border border-rose-400" : ""}`}
                placeholder="nombre@mail.com"
              />
              {errores.email && <span className="text-xs font-semibold text-rose-500 mt-1 block">{errores.email}</span>}
            </Field>
            <Field label="Celular">
              <input
                aria-label="Celular"
                type="tel"
                inputMode="numeric"
                value={form.celular}
                onChange={(e) => {
                  setForm({ ...form, celular: e.target.value.replace(/[^0-9]/g, "").slice(0, 13) });
                  if (errores.celular) setErrores((prev) => ({ ...prev, celular: "" }));
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm ${errores.celular ? "border border-rose-400" : ""}`}
                placeholder="2611234567"
              />
              {errores.celular && <span className="text-xs font-semibold text-rose-500 mt-1 block">{errores.celular}</span>}
            </Field>
          </div>

          <Field label="Estado">
            <div className="flex gap-3 mt-1">
              <button
                type="button"
                onClick={() => setForm({ ...form, activo: true })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-[color,background-color] duration-200 active:scale-95 ${
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
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-[color,background-color] duration-200 active:scale-95 ${
                  !form.activo
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                Inactivo
              </button>
            </div>
          </Field>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-[color,background-color] shadow-sm shadow-blue-600/20 active:scale-95"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
