// lib/validators.ts

export const soloLetras = (valor: string) =>
  valor.replace(/[^A-Za-zÀ-ÿñÑ\s]/g, "");

export const soloNumeros = (valor: string) =>
  valor.replace(/[^0-9]/g, "");

export const emailValido = (valor: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);

export interface FormularioAlumnoData {
  nombre: string;
  dni?: string;
  email?: string;
  celular?: string;
  plan: string;
}

export function validarDatosAlumno(datos: FormularioAlumnoData, esNuevo = true): Record<string, string> {
  const errores: Record<string, string> = {};

  if (!datos.nombre || datos.nombre.trim().length < 3) {
    errores.nombre = "Ingresá el nombre completo (mínimo 3 caracteres)";
  }

  if (datos.email && datos.email.trim().length > 0) {
    if (!emailValido(datos.email)) {
      errores.email = "Correo electrónico inválido";
    }
  } else if (esNuevo) {
    errores.email = "El correo electrónico es requerido";
  }

  if (datos.dni && datos.dni.trim().length > 0) {
    if (datos.dni.length < 7 || datos.dni.length > 8) {
      errores.dni = "El DNI debe tener 7 u 8 dígitos";
    }
  } else if (esNuevo) {
    errores.dni = "El DNI es requerido";
  }

  if (datos.celular && datos.celular.trim().length > 0) {
    if (datos.celular.length < 8 || datos.celular.length > 13) {
      errores.celular = "Celular inválido (entre 8 y 13 dígitos)";
    }
  }

  if (!datos.plan) {
    errores.plan = "Seleccioná un plan";
  }

  return errores;
}