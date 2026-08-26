// lib/validators.ts
export const soloLetras = (valor: string) =>
  valor.replace(/[^A-Za-zÀ-ÿñÑ\s]/g, "")

export const soloNumeros = (valor: string) =>
  valor.replace(/[^0-9]/g, "")

export const emailValido = (valor: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)