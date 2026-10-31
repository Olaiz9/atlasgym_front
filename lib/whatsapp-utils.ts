// lib/whatsapp-utils.ts
// Normalización de teléfonos móviles argentinos y generadores de enlaces directos 1-clic (wa.me)
// compatibles tanto desde el celular de los dueños como desde PC / WhatsApp Web.

import { EstadoCuenta, EstadoPago } from "./types";

/**
 * Normaliza números celulares argentinos hacia formato internacional WhatsApp (549 + código área sin 0 + número sin 15).
 * Soporta formatos reales de planillas Excel/papel:
 * - "11 4455-6677" -> "5491144556677"
 * - "011 15-4455-6677" -> "5491144556677"
 * - "11 15 4455 6677" -> "5491144556677"
 * - "0261 15 4123456" -> "5492614123456"
 * - "+54 9 351 612-3456" -> "5493516123456"
 * - "542614123456" -> "5492614123456"
 */
export function normalizarCelularWhatsappAR(celular?: string | null): string {
  if (!celular) return "";
  let d = celular.replace(/\D/g, "");
  if (!d) return "";

  // Quitar prefijo internacional 00 si existiera
  if (d.startsWith("00")) {
    d = d.slice(2);
  }

  // Si ya arranca con 549 y tiene 13 dígitos -> válido directo
  if (d.length === 13 && d.startsWith("549")) {
    return d;
  }

  // Si arranca con 54 (sin 9) y tiene 12 dígitos -> insertar 9
  if (d.length === 12 && d.startsWith("54") && !d.startsWith("549")) {
    return `549${d.slice(2)}`;
  }

  // Quitar 0 nacional inicial (ej: 011..., 0261..., 0351...)
  if (d.startsWith("0")) {
    d = d.slice(1);
  }

  // Caso clásico argentino con "15" intercalado tras código de área (total 12 dígitos sin el 0)
  // AMBA: 11 + 15 + 8 dígitos = 12 dígitos
  // Interior 3 dígitos: 261/351/341/221/etc. + 15 + 7 dígitos = 12 dígitos
  // Interior 4 dígitos: 2944/etc. + 15 + 6 dígitos = 12 dígitos
  if (d.length === 12) {
    if (d.startsWith("1115")) {
      d = `11${d.slice(4)}`;
    } else if (/^[23]\d{2}15\d{7}$/.test(d)) {
      d = `${d.slice(0, 3)}${d.slice(5)}`;
    } else if (/^[23]\d{3}15\d{6}$/.test(d)) {
      d = `${d.slice(0, 4)}${d.slice(6)}`;
    }
  }

  // 10 dígitos nacionales limpios -> anteponer 549
  if (d.length === 10) {
    return `549${d}`;
  }

  return d;
}

export function tieneCelularWhatsappValido(celular?: string | null): boolean {
  const norm = normalizarCelularWhatsappAR(celular);
  return norm.length >= 10 && norm.length <= 15;
}

/**
 * Construye un enlace universal `https://wa.me/...` que abre la app nativa en celulares
 * y WhatsApp Desktop / WhatsApp Web en notebooks sin pasos intermedios.
 */
export function construirUrlWaMe(celular: string, mensaje: string): string {
  const numero = normalizarCelularWhatsappAR(celular);
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

function extraerPrimerNombre(nombreCompleto?: string | null): string {
  const limpio = (nombreCompleto || "").trim();
  if (!limpio) return "hola";
  return limpio.split(/\s+/)[0];
}

export function mensajeRecordatorioCuotaWhatsapp(params: {
  nombre: string;
  plan?: string;
  estadoCuenta?: EstadoCuenta;
  estadoPago?: EstadoPago;
  saldoPendiente?: number;
  montoTotal?: number;
  periodoMes?: string;
}): string {
  const primerNombre = extraerPrimerNombre(params.nombre);
  const planTxt = params.plan && params.plan !== "Sin plan" ? params.plan : "tu plan";
  const periodoTxt = params.periodoMes ? ` (${params.periodoMes})` : "";

  if (params.estadoPago === "PARCIAL" && params.saldoPendiente && params.saldoPendiente > 0) {
    return `Hola ${primerNombre}! Te escribimos de ATLAS Gym para recordarte que queda un saldo pendiente de $${params.saldoPendiente.toLocaleString(
      "es-AR"
    )} para completar tu cuota${periodoTxt} de ${planTxt}. Podés abonarlo en recepción o transferir al alias ATLAS.GYM.MP. ¡Gracias!`;
  }

  if (params.estadoCuenta === "MOROSO" || params.estadoPago === "VENCIDO") {
    const montoRef =
      params.saldoPendiente && params.saldoPendiente > 0
        ? ` ($${params.saldoPendiente.toLocaleString("es-AR")})`
        : params.montoTotal && params.montoTotal > 0
        ? ` ($${params.montoTotal.toLocaleString("es-AR")})`
        : "";
    return `Hola ${primerNombre}! Te escribimos de ATLAS Gym porque tu cuota${periodoTxt} de ${planTxt}${montoRef} figura vencida. Podés regularizarla por transferencia al alias ATLAS.GYM.MP enviando el comprobante por acá o directamente en recepción. ¡Te esperamos!`;
  }

  const montoTxt =
    params.saldoPendiente && params.saldoPendiente > 0
      ? ` por $${params.saldoPendiente.toLocaleString("es-AR")}`
      : params.montoTotal && params.montoTotal > 0
      ? ` por $${params.montoTotal.toLocaleString("es-AR")}`
      : "";

  return `Hola ${primerNombre}! Te recordamos desde ATLAS Gym que del 1 al 10 fue la ventana de pago y tu cuota${periodoTxt} de ${planTxt}${montoTxt} figura pendiente. Podés transferir al alias ATLAS.GYM.MP o abonar en recepción. ¡Nos vemos entrenando!`;
}

export function mensajeCredencialesBienvenidaWhatsapp(params: {
  nombre: string;
  usuario: string;
  claveInicial: string;
  urlPortal?: string;
}): string {
  const primerNombre = extraerPrimerNombre(params.nombre);
  const lineaPortal = params.urlPortal ? `\nWeb: ${params.urlPortal}` : "";
  return `Hola ${primerNombre}! Ya tenés habilitado tu acceso a ATLAS Gym para ver tu rutina, registrar tus pesos y consultar tu cuota:\n\nUsuario: ${
    params.usuario || "-"
  }\nClave inicial: ${params.claveInicial || "-"}${lineaPortal}\n\nEn tu primer ingreso el sistema te va a pedir elegir tu propia contraseña privada. ¡Nos vemos en el gym!`;
}
