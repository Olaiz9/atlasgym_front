export const HORARIOS_ATLAS = {
  semana: "07:00 a 22:00 hs",
  sabado: "09:00 a 14:00 hs",
  textoCompleto: "Lunes a Viernes: 07:00 a 22:00 hs · Sábados: 09:00 a 14:00 hs",
};

export const CONTACTO_ATLAS = {
  telefono: "+54 9 261 566-5067",
  whatsappUrl: "https://wa.me/5492615665067",
  email: "gonzalo5jesus@gmail.com",
  instagram: "@atlasgymoficial_",
  instagramUrl: "https://www.instagram.com/atlasgymoficial_/",
};

/**
 * Datos de cobro por transferencia del gimnasio. Se configuran por entorno (se leen al hacer el build):
 *   NEXT_PUBLIC_PAGO_ALIAS=alias.real.del.gym
 *   NEXT_PUBLIC_PAGO_TITULAR=Nombre del titular de la cuenta
 * Si no hay alias configurado, la app NO muestra ningún alias (nunca uno inventado): los alumnos
 * ven "consultá en recepción" y los recordatorios de WhatsApp omiten la línea de transferencia.
 */
export const DATOS_PAGO_ATLAS = {
  alias: (process.env.NEXT_PUBLIC_PAGO_ALIAS ?? "").trim(),
  titular: (process.env.NEXT_PUBLIC_PAGO_TITULAR ?? "").trim(),
};
