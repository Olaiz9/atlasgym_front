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

export function validarDatosAlumno(
  datos: FormularioAlumnoData,
  esNuevo = true,
  alumnosExistentes?: { id: string; dni?: string }[],
  alumnoIdEditando?: string
): Record<string, string> {
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
    } else if (alumnosExistentes) {
      const repetido = alumnosExistentes.some(
        (a) => a.dni === datos.dni && a.id !== alumnoIdEditando
      );
      if (repetido) {
        errores.dni = "Este DNI ya está registrado en el gimnasio";
      }
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

/**
 * Normaliza números de celular argentinos para enlaces de WhatsApp (E.164 con prefijo 549).
 * Maneja formatos habituales: 10 dígitos (261xxxxxxx), con 0 (0261xxxxxxx), con 54 (54261xxxxxxx), o 549.
 */
export function normalizarCelularArgentina(celular: string): string {
  let numero = celular.replace(/\D/g, "");
  if (numero.length === 10) {
    numero = `549${numero}`;
  } else if (numero.length === 11 && numero.startsWith("0")) {
    numero = `549${numero.slice(1)}`;
  } else if (numero.length === 12 && numero.startsWith("54")) {
    numero = `549${numero.slice(2)}`;
  } else if (numero.length === 13 && numero.startsWith("549")) {
    numero = numero;
  }
  return numero;
}

export function construirLinkWhatsapp(celular: string, mensaje: string): string {
  const numero = normalizarCelularArgentina(celular);
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}