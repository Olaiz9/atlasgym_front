// lib/csv-import.ts
// Parser CSV tolerante para migración "Día Cero" desde Excel en español (;), Google Sheets (,) o TSV.

export interface FilaImportacionAlumno {
  nombre: string;
  dni: string;
  celular?: string;
  email?: string;
  planNombre?: string;
  ultimoPeriodoPago?: string; // normalizado a "YYYY-MM" cuando es posible
  montoUltimoPago?: number;
  metodoPago?: string;
}

export interface ResultadoParseoCsvAlumnos {
  filasValidas: FilaImportacionAlumno[];
  erroresFila: string[];
  delimitadorDetectado: "," | ";" | "\t";
}

export const PLANTILLA_CSV_DIA_CERO = [
  "Nombre;DNI;Celular;Email;Plan;Ultimo_Mes_Pago;Monto;Metodo",
  "Camila Sosa;42111222;1144556677;camila@email.com;Pase Libre;2026-10;30000;Transferencia",
  "Nicolás Gómez;39888777;2614556677;;3 días;2026-09;25000;Efectivo",
  "Valentina Ruiz;44333111;3516112233;;Musculación;2026-08;25000;Efectivo",
].join("\n");

function normalizarClaveHeader(texto: string): string {
  return texto
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function detectarDelimitador(primeraLinea: string): "," | ";" | "\t" {
  let enComillas = false;
  let comas = 0;
  let puntoYComas = 0;
  let tabs = 0;

  for (let i = 0; i < primeraLinea.length; i++) {
    const ch = primeraLinea[i];
    if (ch === '"') {
      enComillas = !enComillas;
    } else if (!enComillas) {
      if (ch === ";") puntoYComas++;
      else if (ch === ",") comas++;
      else if (ch === "\t") tabs++;
    }
  }

  if (tabs > puntoYComas && tabs > comas) return "\t";
  if (puntoYComas >= comas && puntoYComas > 0) return ";";
  return ",";
}

export type ResultadoDecodificacionCsv =
  | { ok: true; texto: string }
  | { ok: false; error: string };

/**
 * Convierte los bytes del archivo subido en texto.
 * Excel en español guarda "CSV (delimitado por comas)" en Windows-1252, no en UTF-8: si se lee como
 * UTF-8, "Nicolás" queda "Nicol�s". Probamos UTF-8 estricto y, si falla, Windows-1252.
 */
export function decodificarArchivoCsv(bytes: Uint8Array): ResultadoDecodificacionCsv {
  const esZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  const esXlsViejo = bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  if (esZip || esXlsViejo) {
    return {
      ok: false,
      error:
        'Ese archivo es un Excel (.xlsx/.xls), no un CSV. En Excel: Archivo → Guardar como → tipo "CSV UTF-8 (delimitado por comas)" y subí ese archivo.',
    };
  }
  try {
    return { ok: true, texto: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: true, texto: new TextDecoder("windows-1252").decode(bytes) };
  }
}

/** Separa el texto en filas, respetando saltos de línea que estén dentro de una celda entre comillas. */
function dividirFilasCsv(texto: string): string[] {
  const filas: string[] = [];
  let actual = "";
  let enComillas = false;
  for (const ch of texto) {
    if (ch === '"') enComillas = !enComillas;
    if (ch === "\n" && !enComillas) {
      filas.push(actual);
      actual = "";
    } else {
      actual += ch;
    }
  }
  filas.push(actual);
  return filas.map((l) => l.trim()).filter((l) => l.length > 0);
}

export function dividirLineaCsv(linea: string, delimitador: string): string[] {
  const celdas: string[] = [];
  let actual = "";
  let enComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (ch === '"') {
      if (enComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        enComillas = !enComillas;
      }
    } else if (ch === delimitador && !enComillas) {
      celdas.push(limpiarCelda(actual));
      actual = "";
    } else {
      actual += ch;
    }
  }
  celdas.push(limpiarCelda(actual));
  return celdas;
}

// Un salto de línea dentro de la celda (Alt+Enter en Excel) se convierte en un espacio.
function limpiarCelda(celda: string): string {
  return celda.replace(/\s*\n\s*/g, " ").trim();
}

const MESES: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

function anioCompleto(anio: string): number {
  return anio.length === 2 ? 2000 + Number(anio) : Number(anio);
}

export function normalizarPeriodoCsv(valor?: string): string | undefined {
  if (!valor) return undefined;
  const limpio = valor.trim();
  if (!limpio) return undefined;

  if (/^\d{4}-\d{2}$/.test(limpio)) {
    return limpio;
  }
  if (/^\d{4}\/\d{2}$/.test(limpio)) {
    return limpio.replace("/", "-");
  }
  // Formato argentino MM/YYYY o M/YYYY
  const mBarraAnio = limpio.match(/^(\d{1,2})[/-](\d{4})$/);
  if (mBarraAnio) {
    const mes = Number(mBarraAnio[1]);
    const anio = Number(mBarraAnio[2]);
    if (mes >= 1 && mes <= 12) {
      return `${anio}-${String(mes).padStart(2, "0")}`;
    }
  }
  // Fecha ISO YYYY-MM-DD -> YYYY-MM
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpio)) {
    return limpio.slice(0, 7);
  }
  // Fecha DD/MM/YYYY -> YYYY-MM
  const dmy = limpio.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const mes = Number(dmy[2]);
    const anio = Number(dmy[3]);
    if (mes >= 1 && mes <= 12) {
      return `${anio}-${String(mes).padStart(2, "0")}`;
    }
  }
  // MM/AA (ej: "10/26")
  const mAnioCorto = limpio.match(/^(\d{1,2})[/-](\d{2})$/);
  if (mAnioCorto) {
    const mes = Number(mAnioCorto[1]);
    if (mes >= 1 && mes <= 12) {
      return `${anioCompleto(mAnioCorto[2])}-${String(mes).padStart(2, "0")}`;
    }
  }
  // Mes escrito, como lo formatea Excel: "oct-26", "Octubre 2026", "sept. 2026"
  const mTexto = limpio
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .match(/^([a-z]+)\.?[\s/-]*(?:de\s+)?(\d{2}|\d{4})$/);
  if (mTexto && MESES[mTexto[1].slice(0, 3)]) {
    const mes = MESES[mTexto[1].slice(0, 3)];
    return `${anioCompleto(mTexto[2])}-${String(mes).padStart(2, "0")}`;
  }
  // No se reconoce: mejor sin período (y avisado) que un período inventado
  return undefined;
}

function parsearMontoCsv(valor?: string): number | undefined {
  if (!valor) return undefined;
  let limpio = valor.replace(/[$\s]/g, "").trim();
  if (!limpio) return undefined;

  // Si tiene punto de miles y coma decimal (ej: "28.500,00" o "28.500")
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpio)) {
    limpio = limpio.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(limpio)) {
    // Coma de miles al estilo Google Sheets en inglés: "28,500" o "28,500.00"
    limpio = limpio.replace(/,/g, "");
  } else if (limpio.includes(",") && !limpio.includes(".")) {
    limpio = limpio.replace(",", ".");
  }

  const num = Number(limpio);
  return !isNaN(num) && num > 0 ? num : undefined;
}

const COLUMNAS_NOMBRE = [
  "nombre",
  "nombre_completo",
  "apellido_y_nombre",
  "nombre_y_apellido",
  "alumno",
  "socio",
];
const COLUMNAS_DNI = ["dni", "documento", "nro_documento", "numero_documento", "doc"];

export function parsearCsvPadronAlumnos(contenidoRaw: string): ResultadoParseoCsvAlumnos {
  const texto = (contenidoRaw || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let lineas = dividirFilasCsv(texto);

  // Muchas planillas tienen un título o filas vacías arriba: buscamos el encabezado real
  // (la primera fila que tenga columnas de nombre y DNI) entre las primeras 10.
  const idxEncabezado = lineas.slice(0, 10).findIndex((linea) => {
    const celdas = dividirLineaCsv(linea, detectarDelimitador(linea)).map(normalizarClaveHeader);
    return celdas.some((c) => COLUMNAS_NOMBRE.includes(c)) && celdas.some((c) => COLUMNAS_DNI.includes(c));
  });
  if (idxEncabezado > 0) {
    lineas = lineas.slice(idxEncabezado);
  }

  if (lineas.length < 2) {
    return {
      filasValidas: [],
      erroresFila: ["El archivo debe incluir una fila de encabezados y al menos un socio."],
      delimitadorDetectado: ";",
    };
  }

  const delimitador = detectarDelimitador(lineas[0]);
  const headers = dividirLineaCsv(lineas[0], delimitador).map(normalizarClaveHeader);

  const buscarCol = (candidatos: string[]): number =>
    headers.findIndex((h) => candidatos.includes(h));

  const idxNombre = buscarCol(COLUMNAS_NOMBRE);
  const idxApellido = buscarCol(["apellido", "apellidos"]);
  const idxDni = buscarCol(COLUMNAS_DNI);
  const idxCelular = buscarCol(["celular", "telefono", "whatsapp", "tel", "movil", "cel"]);
  const idxEmail = buscarCol(["email", "correo", "mail", "e_mail"]);
  const idxPlan = buscarCol(["plan", "nombre_plan", "membresia", "abono", "tipo_plan"]);
  const idxPeriodo = buscarCol([
    "ultimo_mes_pago",
    "ultimo_periodo_pago",
    "ultimo_pago",
    "periodo_mes",
    "periodo",
    "mes_pago",
    "mes_abonado",
  ]);
  const idxMonto = buscarCol(["monto", "importe", "precio", "monto_ultimo_pago", "valor"]);
  const idxMetodo = buscarCol(["metodo", "metodo_pago", "medio_pago", "forma_pago"]);

  if (idxNombre === -1 || idxDni === -1) {
    return {
      filasValidas: [],
      erroresFila: [
        "No se encontraron las columnas obligatorias 'Nombre' y 'DNI' en el encabezado del CSV.",
      ],
      delimitadorDetectado: delimitador,
    };
  }

  const filasValidas: FilaImportacionAlumno[] = [];
  const erroresFila: string[] = [];
  const filaPorDni = new Map<string, number>();

  for (let i = 1; i < lineas.length; i++) {
    const nroFila = i + 1;
    const cols = dividirLineaCsv(lineas[i], delimitador);
    if (cols.every((c) => !c.trim())) continue;

    const nombreBase = (cols[idxNombre] || "").trim();
    const apellidoExtra = idxApellido >= 0 ? (cols[idxApellido] || "").trim() : "";
    const nombreCompleto =
      apellidoExtra && !nombreBase.toLowerCase().includes(apellidoExtra.toLowerCase())
        ? `${nombreBase} ${apellidoExtra}`.trim()
        : nombreBase;

    const dniRaw = (cols[idxDni] || "").trim();
    // "40111222.0" (número con decimales exportado por Sheets) -> "40111222"
    const dniLimpio = dniRaw.replace(/^(\d+)[.,]0+$/, "$1").replace(/\D/g, "");

    if (nombreCompleto.length < 2) {
      erroresFila.push(`Fila ${nroFila}: falta el nombre del socio.`);
      continue;
    }
    if (/\d[eE][+-]?\d/.test(dniRaw)) {
      // Excel mostró el DNI como "4,02E+07": los dígitos reales se perdieron, no hay que adivinarlos
      erroresFila.push(
        `Fila ${nroFila} (${nombreCompleto}): el DNI '${dniRaw}' está en notación científica. ` +
          "En Excel, poné la columna DNI con formato Número sin decimales y volvé a guardar el CSV."
      );
      continue;
    }
    if (dniLimpio.length < 6 || dniLimpio.length > 10) {
      erroresFila.push(
        `Fila ${nroFila} (${nombreCompleto}): DNI inválido '${dniRaw || "-"}' (debe tener entre 6 y 10 dígitos).`
      );
      continue;
    }

    const celular = idxCelular >= 0 ? (cols[idxCelular] || "").trim() || undefined : undefined;
    const email = idxEmail >= 0 ? (cols[idxEmail] || "").trim() || undefined : undefined;
    const planNombre = idxPlan >= 0 ? (cols[idxPlan] || "").trim() || undefined : undefined;
    const periodoRaw = idxPeriodo >= 0 ? (cols[idxPeriodo] || "").trim() : "";
    const ultimoPeriodoPago = normalizarPeriodoCsv(periodoRaw);
    if (periodoRaw && !ultimoPeriodoPago) {
      erroresFila.push(
        `Fila ${nroFila} (${nombreCompleto}): no se entiende el mes pagado '${periodoRaw}' ` +
          "(usá por ejemplo 2026-10 u oct-26). El socio se importa igual, sin cuota cargada."
      );
    }
    const filaPrevia = filaPorDni.get(dniLimpio);
    if (filaPrevia !== undefined) {
      erroresFila.push(
        `Fila ${nroFila} (${nombreCompleto}): el DNI ${dniLimpio} está repetido (ya aparece en la fila ${filaPrevia}). ` +
          "Quedan los datos de la última fila."
      );
    } else {
      filaPorDni.set(dniLimpio, nroFila);
    }
    const montoUltimoPago = idxMonto >= 0 ? parsearMontoCsv(cols[idxMonto]) : undefined;
    const metodoPago = idxMetodo >= 0 ? (cols[idxMetodo] || "").trim() || undefined : undefined;

    filasValidas.push({
      nombre: nombreCompleto,
      dni: dniLimpio,
      celular,
      email,
      planNombre,
      ultimoPeriodoPago,
      montoUltimoPago,
      metodoPago,
    });
  }

  return {
    filasValidas,
    erroresFila,
    delimitadorDetectado: delimitador,
  };
}
