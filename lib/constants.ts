// Horario habitual de lunes a viernes; también define las franjas del gráfico.
const horaAperturaSemana = 6;
const horaCierreSemana = 23;
const aperturaSemana = horaAperturaSemana.toString().padStart(2, "0") + ":00";
const cierreSemana = horaCierreSemana.toString().padStart(2, "0") + ":00";
const semana = aperturaSemana + " a " + cierreSemana + " hs";
const sabado = "08:00 a 13:00 hs";

export const HORARIOS_ATLAS = {
  horaAperturaSemana,
  horaCierreSemana,
  aperturaSemana,
  cierreSemana,
  semana,
  sabado,
  textoCompleto: "Lunes a Viernes: " + semana + " · Sábados: " + sabado,
};

export const CONTACTO_ATLAS = {
  telefono: "+54 9 261 566-5067",
  whatsappUrl: "https://wa.me/5492615665067",
  email: "gonzalo5jesus@gmail.com",
  instagram: "@atlasgymoficial_",
  instagramUrl: "https://www.instagram.com/atlasgymoficial_/",
};

export const PIN_TERMINAL_TOTEM_DEFAULT = "1234";
