import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Dos iniciales para el avatar ("Diego Ramírez" -> "DR"). */
export function inicialesDe(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function generarPassword(length: number = 8): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  }
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function formatearMoneda(monto: number | string): string {
  const valor = Number(monto) || 0;
  return `$${valor.toLocaleString("es-AR")}`;
}

/** Texto comparable para buscar: sin mayúsculas, acentos ni puntos ("Ramírez" -> "ramirez", "12.345.678" -> "12345678"). */
export function textoBusqueda(texto?: string | null): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\./g, "");
}

/** true si la búsqueda está vacía o aparece en alguno de los campos. */
export function coincideBusqueda(busqueda: string, ...campos: (string | null | undefined)[]): boolean {
  const q = textoBusqueda(busqueda).trim();
  return !q || campos.some((c) => textoBusqueda(c).includes(q));
}
